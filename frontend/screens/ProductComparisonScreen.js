import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Ionicons } from "../components/Icon";
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";
import { useTheme } from "../context/ThemeContext";
import ProductIntelligenceService from "../services/ProductIntelligenceService";
import RecommendationCard from "../components/RecommendationCard";

const CATEGORY_DEFAULT_WEIGHTS = {
  Headphones: [
    { key: "anc", label: "Noise Cancellation (ANC)", defaultVal: 40 },
    { key: "sound", label: "Sound & Audio Fidelity", defaultVal: 35 },
    { key: "comfort", label: "Comfort & Portability", defaultVal: 25 },
  ],
  Smartphones: [
    { key: "camera", label: "Camera & Optics", defaultVal: 40 },
    { key: "performance", label: "Processor & Gaming", defaultVal: 35 },
    { key: "display", label: "Display & Refresh Rate", defaultVal: 25 },
  ],
  Laptops: [
    { key: "battery", label: "Battery Life & Efficiency", defaultVal: 40 },
    { key: "performance", label: "CPU & Multitasking", defaultVal: 35 },
    { key: "portability", label: "Weight & Portability", defaultVal: 25 },
  ],
  Nutrition: [
    { key: "purity", label: "Extraction Purity", defaultVal: 40 },
    { key: "nutrition", label: "Nutritional Value", defaultVal: 35 },
    { key: "transparency", label: "Testing & Standards", defaultVal: 25 },
  ],
  Appliances: [
    { key: "capacity", label: "Basket Capacity", defaultVal: 40 },
    { key: "efficiency", label: "Power & Convection", defaultVal: 35 },
    { key: "cleaning", label: "Ease of Maintenance", defaultVal: 25 },
  ],
  Automotive: [
    { key: "safety", label: "Crash Safety Standards", defaultVal: 40 },
    { key: "range", label: "Real-World Range", defaultVal: 35 },
    { key: "city_drive", label: "Urban Maneuverability", defaultVal: 25 },
  ],
};

const ProductComparisonScreen = ({ route, navigation }) => {
  const { themeColors, isDark } = useTheme();
  const { productIds: initialProductIds = ["sony-wh1000xm5", "bose-qc-ultra"], category: initialCat } =
    route.params || {};

  const [productIds, setProductIds] = useState(initialProductIds);
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);

  // Recommendation engine weights
  const [weights, setWeights] = useState({
    anc: 40,
    sound: 35,
    comfort: 25,
  });

  const [rankedList, setRankedList] = useState([]);
  const [activeTab, setActiveTab] = useState("specs"); // 'specs' | 'recommendation'

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ProductIntelligenceService.compareProducts(productIds);
      setMatrix(data);

      const cat = data?.category || "Headphones";
      const configWeights = CATEGORY_DEFAULT_WEIGHTS[cat] || CATEGORY_DEFAULT_WEIGHTS.Headphones;
      const initialWeightObj = {};
      configWeights.forEach((w) => {
        initialWeightObj[w.key] = w.defaultVal;
      });
      setWeights(initialWeightObj);

      const rec = await ProductIntelligenceService.getPersonalizedRecommendations({
        category: cat,
        productIds,
        weights: initialWeightObj,
      });
      if (rec && rec.ranked_products) {
        setRankedList(rec.ranked_products);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [productIds]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  // Recalculate recommendation rankings when weights change
  const handleWeightChange = async (key, delta) => {
    Haptics.selectionAsync();
    const newWeights = {
      ...weights,
      [key]: Math.min(Math.max((weights[key] || 0) + delta, 0), 100),
    };
    setWeights(newWeights);

    const rec = await ProductIntelligenceService.getPersonalizedRecommendations({
      category: matrix?.category,
      productIds,
      weights: newWeights,
    });
    if (rec && rec.ranked_products) {
      setRankedList(rec.ranked_products);
    }
  };

  const handleRemoveProduct = (idToRemove) => {
    if (productIds.length <= 2) {
      return; // Minimum 2 products for comparison
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProductIds(productIds.filter((id) => id !== idToRemove));
  };

  const handleAskAICompare = () => {
    if (!matrix || !matrix.products) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const names = matrix.products.map((p) => p.name).join(" vs ");
    navigation.navigate("Research", {
      initialQuery: `Compare ${names} objectively. What are the key performance differences, specs, and which one is better suited for my needs?`,
      mode: "compare",
    });
  };

  const activeWeightConfigs = useMemo(() => {
    const cat = matrix?.category || "Headphones";
    return CATEGORY_DEFAULT_WEIGHTS[cat] || CATEGORY_DEFAULT_WEIGHTS.Headphones;
  }, [matrix]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            Generating side-by-side comparison matrix...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const products = matrix?.products || [];
  const attributes = matrix?.attributes || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
            Multi-Product Comparison
          </Text>
          <Text style={[styles.headerSub, { color: themeColors.textTertiary }]}>
            {products.length} Products · {matrix?.category || "Category"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleAskAICompare}
          style={[styles.headerAskAI, { backgroundColor: `${themeColors.primary}18`, borderColor: themeColors.primary }]}
        >
          <Ionicons name="sparkles" size={14} color={themeColors.primary} />
          <Text style={[styles.headerAskAIText, { color: themeColors.primary }]}>Ask AI</Text>
        </TouchableOpacity>
      </View>

      {/* Mode Tabs */}
      <View style={[styles.tabsWrap, { borderBottomColor: themeColors.border, backgroundColor: themeColors.card }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab("specs");
          }}
          style={[
            styles.tabItem,
            activeTab === "specs" && [styles.activeTabItem, { borderBottomColor: themeColors.primary }],
          ]}
        >
          <Ionicons
            name="grid-outline"
            size={15}
            color={activeTab === "specs" ? themeColors.primary : themeColors.textTertiary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "specs" ? themeColors.primary : themeColors.textSecondary },
              activeTab === "specs" && styles.activeTabText,
            ]}
          >
            Universal Specs Matrix
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab("recommendation");
          }}
          style={[
            styles.tabItem,
            activeTab === "recommendation" && [styles.activeTabItem, { borderBottomColor: themeColors.primary }],
          ]}
        >
          <Ionicons
            name="options-outline"
            size={15}
            color={activeTab === "recommendation" ? themeColors.primary : themeColors.textTertiary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "recommendation" ? themeColors.primary : themeColors.textSecondary },
              activeTab === "recommendation" && styles.activeTabText,
            ]}
          >
            Personalized Fit
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "specs" ? (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Product Header Cards (Sticky-like horizontally scrolling) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalHeaders}>
            {products.map((prod) => (
              <TouchableOpacity
                key={`col-${prod.id}`}
                activeOpacity={0.88}
                onPress={() => navigation.push("ProductIntelligence", { product: prod })}
                style={[
                  styles.productHeaderCard,
                  { backgroundColor: themeColors.card, borderColor: themeColors.border },
                ]}
              >
                {products.length > 2 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveProduct(prod.id)}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
                <Image source={{ uri: prod.image_url }} style={styles.cardImg} contentFit="cover" />
                <Text style={[styles.cardBrand, { color: themeColors.textTertiary }]}>{prod.brand}</Text>
                <Text style={[styles.cardName, { color: themeColors.textPrimary }]} numberOfLines={2}>
                  {prod.name}
                </Text>
                <Text style={[styles.cardPrice, { color: themeColors.primary }]}>
                  {prod.benchmark_price ? `₹${prod.benchmark_price.toLocaleString("en-IN")}` : "Unverified"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Matrix Attributes Rows */}
          <View style={styles.matrixContainer}>
            <View style={[styles.matrixHeader, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <Ionicons name="git-network-outline" size={16} color={themeColors.primary} />
              <Text style={[styles.matrixTitle, { color: themeColors.textPrimary }]}>
                Category-Specific Feature Matrix
              </Text>
            </View>

            {attributes.map((attr, idx) => {
              const isEven = idx % 2 === 0;
              const rowBg = isEven
                ? isDark
                  ? "rgba(255, 255, 255, 0.02)"
                  : "rgba(0, 0, 0, 0.015)"
                : "transparent";

              return (
                <View
                  key={`attr-${idx}`}
                  style={[
                    styles.matrixRow,
                    {
                      backgroundColor: rowBg,
                      borderBottomColor: themeColors.border,
                    },
                  ]}
                >
                  <Text style={[styles.attrLabel, { color: themeColors.textTertiary }]}>
                    {attr.feature}
                  </Text>
                  <View style={styles.attrValuesRow}>
                    {products.map((prod) => (
                      <View key={`val-${prod.id}-${attr.feature}`} style={styles.attrValCol}>
                        <Text style={[styles.attrValText, { color: themeColors.textPrimary }]}>
                          {attr.values?.[prod.id] || "—"}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Verdict Card */}
          {matrix?.verdict ? (
            <View style={[styles.verdictCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <View style={styles.verdictHeader}>
                <Ionicons name="sparkles" size={16} color={themeColors.primary} />
                <Text style={[styles.verdictTitle, { color: themeColors.textPrimary }]}>
                  Synthesized Decision Intelligence
                </Text>
              </View>
              <Text style={[styles.verdictBody, { color: themeColors.textSecondary }]}>
                {matrix.verdict}
              </Text>
            </View>
          ) : null}

          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        /* V7.4 Interactive Recommendation Engine */
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.weightControlCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={styles.weightCardHeader}>
              <Ionicons name="options" size={18} color={themeColors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.weightCardTitle, { color: themeColors.textPrimary }]}>
                  Adjust What Matters Most To You
                </Text>
                <Text style={[styles.weightCardSub, { color: themeColors.textTertiary }]}>
                  Rankings dynamically recalculate as you tune preference weights
                </Text>
              </View>
            </View>

            {activeWeightConfigs.map((cfg) => {
              const currentVal = weights[cfg.key] ?? cfg.defaultVal;
              return (
                <View key={`w-${cfg.key}`} style={styles.weightRow}>
                  <View style={styles.weightLabelCol}>
                    <Text style={[styles.weightLabel, { color: themeColors.textPrimary }]}>
                      {cfg.label}
                    </Text>
                    <Text style={[styles.weightVal, { color: themeColors.primary }]}>
                      {currentVal}%
                    </Text>
                  </View>

                  <View style={styles.stepperWrap}>
                    <TouchableOpacity
                      onPress={() => handleWeightChange(cfg.key, -5)}
                      style={[styles.stepBtn, { borderColor: themeColors.border }]}
                    >
                      <Ionicons name="remove" size={14} color={themeColors.textPrimary} />
                    </TouchableOpacity>

                    <View style={[styles.sliderTrack, { backgroundColor: themeColors.border }]}>
                      <View
                        style={[
                          styles.sliderFill,
                          {
                            width: `${Math.min(Math.max(currentVal, 0), 100)}%`,
                            backgroundColor: themeColors.primary,
                          },
                        ]}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={() => handleWeightChange(cfg.key, +5)}
                      style={[styles.stepBtn, { borderColor: themeColors.border }]}
                    >
                      <Ionicons name="add" size={14} color={themeColors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Personalized Ranked Cards */}
          <View style={styles.rankedSection}>
            <Text style={[styles.rankedSectionTitle, { color: themeColors.textPrimary }]}>
              Personalized Ranking Order
            </Text>
            {rankedList.map((item, idx) => (
              <RecommendationCard
                key={`rec-${item.product.id}`}
                rankedItem={item}
                isTopChoice={idx === 0}
                onPress={(prod) => navigation.push("ProductIntelligence", { product: prod })}
              />
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Floating Bottom AI Help */}
      <View style={[styles.bottomBar, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleAskAICompare}
          style={[styles.askAIDecideBtn, { backgroundColor: themeColors.primary }]}
        >
          <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
          <Text style={styles.askAIDecideText}>Ask AI To Decide For Me</Text>
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
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: SPACING.sm,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  headerAskAI: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  headerAskAIText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsWrap: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabItem: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  activeTabText: {
    fontFamily: FONTS.semiBold,
  },
  scroll: {
    flex: 1,
  },
  horizontalHeaders: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  productHeaderCard: {
    width: 150,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.sm,
    alignItems: "center",
    position: "relative",
  },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    zIndex: 2,
  },
  cardImg: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  cardBrand: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    textTransform: "uppercase",
    marginTop: 6,
  },
  cardName: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    textAlign: "center",
    marginTop: 2,
    lineHeight: 16,
  },
  cardPrice: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    marginTop: 4,
  },
  matrixContainer: {
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  matrixHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: SPACING.sm + 2,
    borderBottomWidth: 1,
  },
  matrixTitle: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  matrixRow: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  attrLabel: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  attrValuesRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  attrValCol: {
    flex: 1,
  },
  attrValText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    lineHeight: 17,
  },
  verdictCard: {
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  verdictHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: SPACING.xs,
  },
  verdictTitle: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  verdictBody: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
  weightControlCard: {
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  weightCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: SPACING.xs,
  },
  weightCardTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  weightCardSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  weightRow: {
    gap: 6,
  },
  weightLabelCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weightLabel: {
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  weightVal: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  stepperWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  sliderFill: {
    height: "100%",
    borderRadius: 3,
  },
  rankedSection: {
    marginHorizontal: SPACING.md,
  },
  rankedSectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    marginBottom: SPACING.xs,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderTopWidth: 1,
  },
  askAIDecideBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.full,
    ...SHADOWS.md,
  },
  askAIDecideText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
});

export default ProductComparisonScreen;
