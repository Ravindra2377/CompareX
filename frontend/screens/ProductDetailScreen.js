import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Linking,
  Alert,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PlatformRow from "../components/PlatformRow";
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";
import * as Haptics from "expo-haptics";

const extractQuantity = (text) => {
  const compact = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  const match = compact.match(
    /\b\d+(?:\.\d+)?\s*(?:kg|g|gm|grams?|ml|l|ltr|litre|litres|pcs?|pc|pack|pouch|bottle)\b/i,
  );
  return match ? match[0] : "";
};

const extractRatingInfo = (text) => {
  const compact = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!compact) return { rating: 0, ratingCount: 0 };

  const match = compact.match(
    /\b([0-5](?:\.[0-9])?)\b\s*(?:\((\d+(?:\.\d+)?)\s*([kKmM]?)\)|⭐|stars?|\/5)?/i,
  );

  if (!match) return { rating: 0, ratingCount: 0 };

  const rating = parseFloat(match[1] || "0");
  if (!Number.isFinite(rating) || rating <= 0 || rating > 5) {
    return { rating: 0, ratingCount: 0 };
  }

  let ratingCount = 0;
  if (match[2]) {
    const base = parseFloat(match[2]) || 0;
    const unit = String(match[3] || "").toLowerCase();
    ratingCount =
      unit === "k"
        ? Math.round(base * 1000)
        : unit === "m"
          ? Math.round(base * 1000000)
          : Math.round(base);
  }

  return { rating, ratingCount };
};

const cleanDisplayText = (text) => {
  if (!text) return "";

  let cleaned = String(text)
    .replace(/\u00a0/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/([!,:;])([A-Za-z0-9])/g, "$1 $2")
    .replace(/\b\d+\s*mins?\b/gi, " ")
    .replace(/₹\s*[0-9]+(?:\.[0-9]+)?/gi, " ")
    .replace(/\b(add|buy\s*now|qty|view\s*more|off)\b/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*[kK]?\s*Ratings?.*$/i, "")
    .replace(/\bRatings?.*$/i, "")
    .replace(/\bReviews?.*$/i, "")
    .replace(/[|]+/g, " ")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();

  for (let i = 0; i < 3; i += 1) {
    cleaned = cleaned.replace(
      /\b([A-Za-z]{2,})\s([A-Za-z])\s([A-Za-z]{2,})\b/g,
      "$1$2$3",
    );
  }

  return cleaned.replace(/\s+/g, " ").trim();
};

const pickDisplayTitle = (productName, listings = []) => {
  const candidates = [
    cleanDisplayText(productName),
    ...listings.map((l) => cleanDisplayText(l?.productName || "")),
  ].filter(Boolean);

  if (!candidates.length) return "Product";

  const scored = candidates.map((name) => {
    const words = name.split(/\s+/).filter(Boolean);
    const singleCharTokens = words.filter((w) => w.length === 1).length;
    const hasQuantity = extractQuantity(name) ? 1 : 0;
    const noisePenalty = /\b(add|mins?|₹)\b/i.test(name) ? 3 : 0;

    return {
      name,
      score:
        singleCharTokens * 10 +
        noisePenalty * 8 +
        Math.max(0, words.length - 11) * 2 -
        hasQuantity * 4,
    };
  });

  scored.sort((a, b) => a.score - b.score || a.name.length - b.name.length);
  return scored[0].name;
};

const extractLabeledPriceHints = (rawText) => {
  const compact = String(rawText || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!compact) {
    return { price: 0, mrp: 0 };
  }

  const priceMatch = compact.match(
    /\bprice\b\s*:?\s*₹\s*([0-9]+(?:\.[0-9]+)?)/i,
  );
  const mrpMatch = compact.match(/\bmrp\b\s*:?\s*₹\s*([0-9]+(?:\.[0-9]+)?)/i);

  return {
    price: priceMatch?.[1] ? parseFloat(priceMatch[1]) : 0,
    mrp: mrpMatch?.[1] ? parseFloat(mrpMatch[1]) : 0,
  };
};

const normalizeListingPrice = (listing) => {
  let price = Number(listing?.price || 0);
  let mrp = Number(listing?.mrp || 0);
  const discountValue = Number(
    listing?.discount_value || listing?.discountValue || 0,
  );
  const discountPercent = Number(
    listing?.discount_percent || listing?.discountPercent || 0,
  );
  const labeledHints = extractLabeledPriceHints(
    listing?.raw_text || listing?.rawText || "",
  );

  if (labeledHints.price > 0) {
    price = labeledHints.price;
  }

  if (labeledHints.mrp > 0) {
    mrp = labeledHints.mrp;
  }

  // Price validation: reject extreme outliers
  // If price has extreme discount (>75%), it's likely a parsing error or flash sale
  // Use MRP as fallback in such cases
  if (mrp > 0 && price > 0) {
    const discountRatio = ((mrp - price) / mrp) * 100;
    if (discountRatio > 75) {
      // Extreme discount - likely parsing error. Use MRP as safer fallback
      return mrp;
    }
  }

  if (mrp > 0 && discountValue > 0 && Math.abs(price - discountValue) < 0.51) {
    const derived = Math.round((mrp - discountValue) * 100) / 100;
    if (derived > 0) return derived;
  }

  if (mrp > 0 && discountPercent > 0 && discountPercent < 100) {
    const discountAmount =
      Math.round(((mrp * discountPercent) / 100) * 100) / 100;
    if (Math.abs(price - discountAmount) < 0.75) {
      const derived = Math.round((mrp - discountAmount) * 100) / 100;
      if (derived > 0) return derived;
    }
  }

  return price > 0 ? price : 0;
};

const ProductDetailScreen = ({ route, navigation }) => {
  const { product } = route.params || {};
  const [saved, setSaved] = useState(false);

  const heartScale = React.useRef(new Animated.Value(1)).current;

  const toggleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const willSave = !saved;
    setSaved(willSave);

    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    if (willSave) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const rawListings = product?.listings || [];

  const allPlatforms = rawListings.map((listing) => {
    const rawText = String(listing.raw_text || "");
    const productName = cleanDisplayText(
      listing.raw_product_name || listing.product_name || product?.name || "",
    );
    const quantity =
      String(listing.quantity || listing.weight || "").trim() ||
      extractQuantity(rawText) ||
      extractQuantity(productName);

    const explicitRating = Number(listing.rating || 0);
    const explicitRatingCount = Number(listing.rating_count || 0);
    const parsedRating = extractRatingInfo(rawText || productName);

    return {
      name: listing.platform,
      price: normalizeListingPrice(listing),
      mrp: listing.mrp || 0,
      productName,
      quantity,
      rating: explicitRating > 0 ? explicitRating : parsedRating.rating,
      ratingCount:
        explicitRatingCount > 0
          ? explicitRatingCount
          : parsedRating.ratingCount,
      discountPercent: Number(listing.discount_percent || 0),
      discountValue: Number(listing.discount_value || 0),
      rawText,
      deliveryTime: listing.delivery_time || "",
      deliveryCharge: listing.delivery_charge || 0,
      inStock: listing.in_stock !== false && listing.price > 0,
      productUrl: listing.product_url || listing.deep_link || "", // Use product_url from DOM scraper
    };
  });

  const available = allPlatforms.filter((p) => p.inStock && p.price > 0);
  const unavailable = allPlatforms.filter((p) => !p.inStock || p.price === 0);

  // Keep original platform order for reference price, but also track best price
  const sorted = [...available, ...unavailable];
  const displayTitle = pickDisplayTitle(product?.name, sorted);

  // Reference price priority:
  // 1. Use product.price from original search (if available)
  // 2. Otherwise use first available platform price
  // 3. This prevents showing the extreme discounted price as the main price
  const referencePrice = product?.price || available[0]?.price || 0;

  // Find best (cheapest) price for comparison
  const pricesSorted = [...available].sort((a, b) => a.price - b.price);
  const best = pricesSorted[0]?.price || 0;
  const worst =
    pricesSorted.length > 1 ? pricesSorted[pricesSorted.length - 1].price : 0;
  const saving = worst > best ? worst - best : 0;

  const firstWithQuantity =
    sorted.find((p) => p.quantity)?.quantity ||
    extractQuantity(displayTitle) ||
    sorted.map((p) => extractQuantity(p.rawText)).find(Boolean) ||
    sorted.map((p) => extractQuantity(p.productName)).find(Boolean) ||
    "";
  const firstWithRating = sorted.find((p) => p.rating > 0);
  const displayRating = firstWithRating?.rating || 0;
  const displayRatingCount = firstWithRating?.ratingCount || 0;
  const displayMrp = sorted.reduce(
    (acc, p) => (p.mrp && p.mrp > acc ? p.mrp : acc),
    0,
  );
  const displayDiscountPercent = sorted.reduce(
    (acc, p) =>
      p.discountPercent && p.discountPercent > acc ? p.discountPercent : acc,
    0,
  );
  const displayDiscountValue = sorted.reduce(
    (acc, p) =>
      p.discountValue && p.discountValue > acc ? p.discountValue : acc,
    0,
  );
  const handleOpen = useCallback(
    (p) => {
      const platform = String(p?.name || "").toLowerCase();
      const fallbackWebUrl =
        p?.productUrl || buildPlatformSearchUrl(platform, product?.name || "");

      if (!fallbackWebUrl) {
        console.log(`[ProductDetail] No URL for ${p.name}`);
        Alert.alert("Cannot Open", "No link available for this listing.");
        return;
      }

      console.log(`[ProductDetail] Opening ${p.name}: ${fallbackWebUrl}`);

      const openWithFallback = async () => {
        try {
          if (Platform.OS === "android" && platform.includes("blinkit")) {
            const intentUrl = buildAndroidIntentUrl(
              fallbackWebUrl,
              "com.grofers.customerapp",
            );
            if (intentUrl) {
              try {
                await Linking.openURL(intentUrl);
                return;
              } catch {
                // Fall back to web URL.
              }
            }
          } else if (Platform.OS === "android" && platform.includes("amazon") && p?.productUrl) {
            // Amazon specific intent structure provided by the scraper
            const amazonIntent = p.productUrl; // Note: For Amazon, our scraper puts the intent:// link in deep_link or product_url
            // To be safe, check if deep_link exists
            const intentToTry = p.deep_link || (p.productUrl.startsWith('intent://') ? p.productUrl : null);
            
            if (intentToTry) {
               try {
                 await Linking.openURL(intentToTry);
                 return;
               } catch {
                 // Fall back to web URL
               }
            } 
          }

          await Linking.openURL(fallbackWebUrl);
        } catch (err) {
          console.error(`[ProductDetail] Failed to open URL:`, err);
          Alert.alert("Cannot Open", "Unable to open this product link");
        }
      };

      openWithFallback();
    },
    [product?.name],
  );

  const platformRows = useMemo(
    () =>
      sorted.map((p, i) => (
        <PlatformRow
          key={`${p.name}-${i}`}
          platform={p}
          isCheapest={p.inStock && p.price > 0 && i === 0}
          onOpenStore={() => handleOpen(p)}
        />
      )),
    [handleOpen, sorted],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compare</Text>
        <TouchableOpacity
          onPress={toggleSave}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={saved ? "heart" : "heart-outline"}
              size={24}
              color={saved ? COLORS.error : COLORS.textSecondary}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product summary */}
        <View style={styles.productSection}>
          <Text style={styles.productName}>{displayTitle}</Text>
          {product?.brand && (
            <Text style={styles.productBrand}>{product.brand}</Text>
          )}

          <View style={styles.priceRow}>
            {referencePrice > 0 && (
              <Text style={styles.bestPrice}>₹{referencePrice}</Text>
            )}
            {worst > referencePrice && (
              <Text style={styles.worstPrice}>₹{worst}</Text>
            )}
          </View>

          <View style={styles.metaTopRow}>
            <Text style={styles.metaTopItem}>
              Qty: {firstWithQuantity || "-"}
            </Text>
            <Text style={styles.metaTopItem}>
              Rating:{" "}
              {displayRating > 0
                ? `${displayRating}${displayRatingCount > 0 ? ` (${displayRatingCount})` : ""}`
                : "-"}
            </Text>
          </View>
          <View style={styles.metaTopRow}>
            <Text style={styles.metaTopItem}>
              MRP: {displayMrp > 0 ? `₹${displayMrp}` : "-"}
            </Text>
            <Text style={styles.metaTopItem}>
              Discount:{" "}
              {displayDiscountPercent > 0
                ? `${displayDiscountPercent}%`
                : displayDiscountValue > 0
                  ? `₹${displayDiscountValue}`
                  : "-"}
            </Text>
          </View>
        </View>

        {/* Savings */}
        {saving > 0 && (
          <View style={styles.savingsRow}>
            <Ionicons
              name="arrow-down-circle"
              size={18}
              color={COLORS.savings}
            />
            <Text style={styles.savingsText}>
              Save ₹{saving} by choosing {pricesSorted[0]?.name}
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{available.length}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.textTertiary }]}>
              {unavailable.length}
            </Text>
            <Text style={styles.statLabel}>Unavailable</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.savings }]}>
              {best > 0 ? `₹${best}` : "—"}
            </Text>
            <Text style={styles.statLabel}>Best price</Text>
          </View>
        </View>

        {/* Platforms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Price across {sorted.length} platforms
          </Text>
          {platformRows}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const buildAndroidIntentUrl = (webUrl, packageName) => {
  if (!webUrl || !packageName) return null;
  try {
    const match = String(webUrl).match(/^https?:\/\/([^/]+)(\/.*)?$/i);
    if (!match) return null;
    const host = match[1];
    const path = match[2] || "/";
    return `intent://${host}${path}#Intent;scheme=https;package=${packageName};end`;
  } catch {
    return null;
  }
};

const buildPlatformSearchUrl = (platformName, query) => {
  const q = encodeURIComponent(String(query || "").trim());
  if (!q) return "";

  if (platformName.includes("blinkit")) return `https://blinkit.com/s/?q=${q}`;
  if (platformName.includes("zepto"))
    return `https://www.zepto.com/search?query=${q}`;
  if (platformName.includes("bigbasket"))
    return `https://www.bigbasket.com/ps/?q=${q}`;
  if (platformName.includes("amazon"))
    return `https://www.amazon.in/s?k=${q}`;
  if (platformName.includes("flipkart"))
    return `https://www.flipkart.com/search?q=${q}`;
  return "";
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  headerTitle: {
    ...FONTS.h3,
  },
  productSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
  },
  productName: {
    ...FONTS.h1,
    marginBottom: 4,
  },
  productBrand: {
    ...FONTS.caption,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
    color: COLORS.textTertiary,
  },
  metaTopRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  metaTopItem: {
    ...FONTS.captionBold,
    color: COLORS.textSecondary,
  },
  rawTopText: {
    ...FONTS.caption,
    color: COLORS.textTertiary,
    marginTop: SPACING.sm,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: SPACING.sm,
  },
  bestPrice: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.savings,
  },
  worstPrice: {
    ...FONTS.caption,
    textDecorationLine: "line-through",
  },
  savingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  savingsText: {
    ...FONTS.captionBold,
    color: COLORS.savings,
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.cardAlt,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.xxl,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    ...FONTS.caption,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },
  section: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...FONTS.captionBold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
});

export default ProductDetailScreen;
