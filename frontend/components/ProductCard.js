import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GlassCard from "./GlassCard";
import { COLORS, SPACING, RADIUS, FONTS } from "../config/theme";

const PLATFORM_COLORS = {
  Blinkit: COLORS.platformBlinkit,
  Zepto: COLORS.platformZepto,
  BigBasket: COLORS.platformBigBasket,
  Amazon: COLORS.platformAmazon,
  Flipkart: COLORS.platformFlipkart,
};

const formatPrice = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "0";
  const isInt = Math.round(numeric) === numeric;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: isInt ? 0 : 2,
  }).format(numeric);
};

const normalizeImageUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let url = rawUrl.trim().replace(/^['\"]|['\"]$/g, "");
  if (!url || url.startsWith("data:")) return "";
  if (url.startsWith("//")) url = `https:${url}`;
  if (url.includes(" ")) url = url.split(" ")[0];
  if (url.includes("&amp;")) url = url.replace(/&amp;/g, "&");
  return url;
};

const ProductCard = ({ product, onPress }) => {
  const {
    name = "Product",
    brand = "",
    price = 0,
    originalPrice,
    platformCount = 0,
    totalPlatforms = 3,
    discount,
    bestPlatform = "",
    image_url: imageURL,
    listings = [],
  } = product;

  const imageCandidates = useMemo(() => {
    const candidates = [imageURL, ...listings.map((listing) => listing?.image_url)]
      .map(normalizeImageUrl)
      .filter(Boolean);
    return Array.from(new Set(candidates));
  }, [imageURL, listings]);

  const [imageError, setImageError] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const resolvedImageURL = imageCandidates[imageIndex] || "";

  const effectivePrice = Number(price) > 0 ? Number(price) : 0;
  const effectiveOriginalPrice =
    Number(originalPrice) > 0 ? Number(originalPrice) : 0;
  const hasOriginal =
    effectiveOriginalPrice > effectivePrice && effectivePrice > 0;
  const savingsValue = hasOriginal
    ? Math.max(0, effectiveOriginalPrice - effectivePrice)
    : 0;
  const hasDiscount = discount > 0;

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();

  const handlePressOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();

  const accentColor = PLATFORM_COLORS[bestPlatform] || COLORS.accent;

  return (
    <TouchableWithoutFeedback
      onPress={() => onPress?.(product)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}
        testID={`productCard_${bestPlatform || "best"}`}
      >
        <GlassCard
          gradientColors={COLORS.gradientCard}
          accentColor={accentColor}
          glowColor={accentColor}
        >
          <View style={styles.content}>
            <View style={styles.imageContainer}>
              {resolvedImageURL && !imageError ? (
                <Image
                  source={{ uri: resolvedImageURL }}
                  style={styles.image}
                  resizeMode="contain"
                  onError={() => {
                    if (imageIndex < imageCandidates.length - 1) {
                      setImageIndex((prev) => prev + 1);
                      return;
                    }
                    setImageError(true);
                  }}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons
                    name="image-outline"
                    size={28}
                    color={COLORS.textTertiary}
                  />
                </View>
              )}
            </View>

            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={2}>
                {name}
              </Text>
              {brand ? (
                <Text style={styles.brand}>{brand.toUpperCase()}</Text>
              ) : null}

              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>BEST PRICE</Text>
                  <Text style={styles.price}>₹{formatPrice(effectivePrice)}</Text>
                </View>

                {hasOriginal ? (
                  <View style={styles.mrpBlock}>
                    <Text style={styles.mrpLabel}>MRP</Text>
                    <Text style={styles.originalPrice}>
                      ₹{formatPrice(effectiveOriginalPrice)}
                    </Text>
                  </View>
                ) : null}

                {savingsValue > 0 ? (
                  <View style={styles.savingsChip}>
                    <Ionicons
                      name="trending-down"
                      size={11}
                      color={COLORS.savings}
                    />
                    <Text style={styles.savingsText}>
                      Save ₹{formatPrice(savingsValue)}
                    </Text>
                  </View>
                ) : null}

                {hasDiscount && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{discount}% OFF</Text>
                  </View>
                )}
              </View>

              <View style={styles.metaRow}>
                <View style={styles.platformPill}>
                  <Ionicons
                    name="layers-outline"
                    size={11}
                    color={COLORS.textTertiary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.platformText}>
                    {platformCount}/{totalPlatforms} Platforms
                  </Text>
                </View>
                {bestPlatform ? (
                  <View
                    style={[
                      styles.platformPill,
                      {
                        backgroundColor: `${accentColor}22`,
                        borderColor: `${accentColor}55`,
                      },
                    ]}
                  >
                    <Ionicons
                      name="star"
                      size={10}
                      color={accentColor}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.platformText, { color: accentColor }]}>
                      {bestPlatform}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.arrowWrap}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.textTertiary}
              />
            </View>
          </View>
        </GlassCard>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const areEqual = (prev, next) => {
  const p = prev.product || {};
  const n = next.product || {};
  return (
    p.id === n.id &&
    p.name === n.name &&
    p.brand === n.brand &&
    p.price === n.price &&
    p.originalPrice === n.originalPrice &&
    p.platformCount === n.platformCount &&
    p.discount === n.discount &&
    p.bestPlatform === n.bestPlatform &&
    prev.onPress === next.onPress
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.md,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  imageContainer: {
    width: 88,
    height: 88,
    backgroundColor: COLORS.cardAlt,
    borderRadius: RADIUS.md,
    marginRight: SPACING.md,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.cardAlt,
  },
  info: { flex: 1 },
  name: {
    ...FONTS.bodyBold,
    marginBottom: 4,
    color: COLORS.textPrimary,
  },
  brand: {
    ...FONTS.caption,
    color: COLORS.textTertiary,
    marginBottom: SPACING.sm,
    letterSpacing: 1,
    fontSize: 10,
    textTransform: "uppercase",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  priceLabel: {
    ...FONTS.badge,
    color: COLORS.textSecondary,
    marginBottom: 2,
    letterSpacing: 1,
  },
  price: {
    ...FONTS.price,
    fontSize: 24,         // Refined for card layout
    lineHeight: 32,
  },
  mrpBlock: { paddingBottom: 4 },
  mrpLabel: {
    ...FONTS.caption,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: COLORS.textTertiary,
  },
  originalPrice: {
    ...FONTS.captionBold,
    textDecorationLine: "line-through",
    color: COLORS.textTertiary,
  },
  savingsChip: {
    backgroundColor: COLORS.savingsLight,
    paddingHorizontal: SPACING.sm,
    height: 24,
    borderRadius: RADIUS.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  savingsText: {
    ...FONTS.captionBold,
    fontSize: 11,
    color: COLORS.savings,
  },
  discountBadge: {
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 7,
    height: 24,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  discountText: {
    ...FONTS.badge,
    color: COLORS.warning,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  platformPill: {
    backgroundColor: COLORS.cardAlt,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    flexDirection: "row",
    alignItems: "center",
  },
  platformText: {
    ...FONTS.caption,
    fontSize: 11,
    fontWeight: "600",
  },
  arrowWrap: {
    marginLeft: SPACING.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default React.memo(ProductCard, areEqual);
