import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Ionicons } from "../components/Icon";
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";
import { useTheme } from "../context/ThemeContext";
import ProductIntelligenceService from "../services/ProductIntelligenceService";
import SpecificationTable from "../components/SpecificationTable";

const ProductIntelligenceScreen = ({ route, navigation }) => {
  const { themeColors, isDark } = useTheme();
  const { product: initialProduct, productId } = route.params || {};

  const [product, setProduct] = useState(initialProduct || null);
  const [loading, setLoading] = useState(!initialProduct && !!productId);
  const [isSaved, setIsSaved] = useState(false);
  const [saveToast, setSaveToast] = useState("");

  const loadProductData = useCallback(async () => {
    const id = productId || initialProduct?.id;
    if (!id) return;
    try {
      const data = await ProductIntelligenceService.getProduct(id);
      if (data) {
        setProduct(data);
      }
      const savedList = await ProductIntelligenceService.getSavedProducts();
      setIsSaved(savedList.some((p) => p.id === id));
    } catch {} finally {
      setLoading(false);
    }
  }, [productId, initialProduct]);

  useEffect(() => {
    loadProductData();
  }, [loadProductData]);

  const handleToggleSave = async () => {
    if (!product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isSaved) {
      await ProductIntelligenceService.removeSavedProduct(product.id);
      setIsSaved(false);
      setSaveToast("Removed from Library");
    } else {
      await ProductIntelligenceService.saveProduct(product);
      setIsSaved(true);
      setSaveToast("Saved to Library");
    }
    setTimeout(() => setSaveToast(""), 2000);
  };

  const handleShare = async () => {
    if (!product) return;
    Haptics.selectionAsync();
    try {
      await Share.share({
        title: product.name,
        message: `Check out verified intelligence on ${product.name} on CompareZ: ${product.overview}`,
      });
    } catch {}
  };

  const handleAskAI = () => {
    if (!product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Research", {
      initialQuery: `What are the key trade-offs and real-world performance of ${product.name}?`,
      mode: "buying",
    });
  };

  const handleCompare = () => {
    if (!product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const altId = product.alternatives?.[0];
    const compareIds = altId ? [product.id, altId] : [product.id];
    navigation.navigate("ProductComparison", {
      productIds: compareIds,
      category: product.category,
    });
  };

  const handleSelectAlternative = (altId) => {
    Haptics.selectionAsync();
    navigation.push("ProductIntelligence", { productId: altId });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            Loading product intelligence...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingBox}>
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            Product intelligence not available.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={["top"]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
          {product.brand} Intelligence
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleShare}
            style={[styles.iconBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
          >
            <Ionicons name="share-outline" size={19} color={themeColors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleToggleSave}
            style={[styles.iconBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
          >
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={19}
              color={isSaved ? themeColors.primary : themeColors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Toast Notification */}
      {saveToast !== "" && (
        <View style={[styles.toast, { backgroundColor: themeColors.primary }]}>
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          <Text style={styles.toastText}>{saveToast}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={[styles.heroCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Image
            source={{ uri: product.image_url }}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
          <View style={styles.badgeRow}>
            <View style={[styles.categoryBadge, { backgroundColor: `${themeColors.primary}20` }]}>
              <Text style={[styles.categoryBadgeText, { color: themeColors.primary }]}>
                {product.category}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#10B981" />
              <Text style={styles.verifiedBadgeText}>
                {product.verification_status || "Verified Specifications"}
              </Text>
            </View>
          </View>
        </View>

        {/* Title and Price Details */}
        <View style={styles.titleSection}>
          <Text style={[styles.brandLabel, { color: themeColors.textTertiary }]}>
            {product.brand}
          </Text>
          <Text style={[styles.productTitle, { color: themeColors.textPrimary }]}>
            {product.name}
          </Text>

          <View style={[styles.priceBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View>
              <Text style={[styles.priceLabel, { color: themeColors.textTertiary }]}>
                {product.price_label || "Official Benchmark Reference"}
              </Text>
              <Text style={[styles.priceValue, { color: themeColors.textPrimary }]}>
                {product.benchmark_price
                  ? `₹${product.benchmark_price.toLocaleString("en-IN")}`
                  : "Price Not Verified"}
              </Text>
            </View>
            <View style={styles.priceDisclaimer}>
              <Ionicons name="information-circle-outline" size={14} color={themeColors.textTertiary} />
              <Text style={[styles.disclaimerText, { color: themeColors.textTertiary }]}>
                Current prices may vary by authorized seller
              </Text>
            </View>
          </View>
        </View>

        {/* Overview */}
        {product.overview ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
              Overview & Architecture
            </Text>
            <Text style={[styles.overviewBody, { color: themeColors.textSecondary }]}>
              {product.overview}
            </Text>
          </View>
        ) : null}

        {/* Advantages & Disadvantages (Pros and Cons) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
            Evaluation & Trade-offs
          </Text>

          {/* Pros */}
          {product.pros && product.pros.length > 0 && (
            <View style={[styles.proConCard, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.08)" : "#F0FDF4", borderColor: "#86EFAC" }]}>
              <View style={styles.proConHeader}>
                <Ionicons name="thumbs-up" size={16} color="#16A34A" />
                <Text style={[styles.proConTitle, { color: "#16A34A" }]}>Key Advantages</Text>
              </View>
              {product.pros.map((pro, idx) => (
                <View key={`pro-${idx}`} style={styles.bulletRow}>
                  <Ionicons name="checkmark" size={14} color="#16A34A" style={styles.bulletIcon} />
                  <Text style={[styles.bulletText, { color: themeColors.textPrimary }]}>
                    {pro}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Cons */}
          {product.cons && product.cons.length > 0 && (
            <View style={[styles.proConCard, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.08)" : "#FEF2F2", borderColor: "#FCA5A5", marginTop: SPACING.sm }]}>
              <View style={styles.proConHeader}>
                <Ionicons name="thumbs-down" size={16} color="#DC2626" />
                <Text style={[styles.proConTitle, { color: "#DC2626" }]}>Considerations & Limitations</Text>
              </View>
              {product.cons.map((con, idx) => (
                <View key={`con-${idx}`} style={styles.bulletRow}>
                  <Ionicons name="close" size={14} color="#DC2626" style={styles.bulletIcon} />
                  <Text style={[styles.bulletText, { color: themeColors.textPrimary }]}>
                    {con}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Technical Specifications */}
        {product.specifications && product.specifications.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
              Technical Specifications
            </Text>
            <SpecificationTable specifications={product.specifications} />
          </View>
        )}

        {/* Suitable Use Cases */}
        {product.suitable_use_cases && product.suitable_use_cases.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
              Recommended Intended Usage
            </Text>
            <View style={styles.useCaseGrid}>
              {product.suitable_use_cases.map((useCase, idx) => (
                <View
                  key={`uc-${idx}`}
                  style={[styles.useCaseChip, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                >
                  <Ionicons name="checkmark-circle-outline" size={15} color={themeColors.primary} />
                  <Text style={[styles.useCaseText, { color: themeColors.textPrimary }]}>
                    {useCase}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Comparable Alternatives */}
        {product.alternatives && product.alternatives.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
              Comparable Alternatives
            </Text>
            <View style={styles.altRow}>
              {product.alternatives.map((altId) => (
                <TouchableOpacity
                  key={`alt-${altId}`}
                  activeOpacity={0.8}
                  onPress={() => handleSelectAlternative(altId)}
                  style={[styles.altCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                >
                  <Ionicons name="git-compare-outline" size={18} color={themeColors.primary} />
                  <Text style={[styles.altText, { color: themeColors.textPrimary }]} numberOfLines={1}>
                    {altId.replace(/-/g, " ").toUpperCase()}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={themeColors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Verified Sources */}
        {product.source_links && product.source_links.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
              Verified Source Records
            </Text>
            {product.source_links.map((src, idx) => (
              <TouchableOpacity
                key={`src-${idx}`}
                onPress={() => src.url && Linking.openURL(src.url).catch(() => {})}
                style={[styles.sourceItem, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
              >
                <Ionicons name="link-outline" size={16} color={themeColors.primary} />
                <View style={styles.sourceInfo}>
                  <Text style={[styles.sourceTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
                    {src.title}
                  </Text>
                  <Text style={[styles.sourceMeta, { color: themeColors.textTertiary }]}>
                    {src.domain} · {src.verification_type}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={14} color={themeColors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleCompare}
          style={[styles.compareBtn, { borderColor: themeColors.border, backgroundColor: themeColors.background }]}
        >
          <Ionicons name="git-compare" size={18} color={themeColors.textPrimary} />
          <Text style={[styles.compareBtnText, { color: themeColors.textPrimary }]}>
            Compare
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleAskAI}
          style={[styles.askAIBtn, { backgroundColor: themeColors.primary }]}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
          <Text style={styles.askAIBtnText}>Ask AI About This</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    flex: 1,
    textAlign: "center",
    marginHorizontal: SPACING.sm,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toast: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 3,
    borderRadius: RADIUS.full,
    zIndex: 99,
    ...SHADOWS.md,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  heroCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: 240,
  },
  badgeRow: {
    position: "absolute",
    bottom: SPACING.sm,
    left: SPACING.sm,
    right: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryBadge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    textTransform: "uppercase",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  verifiedBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: FONTS.medium,
  },
  titleSection: {
    marginTop: SPACING.md,
  },
  brandLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  productTitle: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    marginTop: 2,
    lineHeight: 28,
  },
  priceBox: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  priceLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    textTransform: "uppercase",
  },
  priceValue: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    marginTop: 2,
  },
  priceDisclaimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  disclaimerText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
  section: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    marginBottom: SPACING.sm,
  },
  overviewBody: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    lineHeight: 22,
  },
  proConCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
  },
  proConHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: SPACING.sm,
  },
  proConTitle: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
    gap: 8,
  },
  bulletIcon: {
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.regular,
    lineHeight: 18,
  },
  useCaseGrid: {
    gap: 8,
  },
  useCaseChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  useCaseText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    flex: 1,
  },
  altRow: {
    gap: 8,
  },
  altCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 12,
  },
  altText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    flex: 1,
  },
  sourceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 6,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceTitle: {
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  sourceMeta: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderTopWidth: 1,
  },
  compareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  compareBtnText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  askAIBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  },
  askAIBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
});

export default ProductIntelligenceScreen;
