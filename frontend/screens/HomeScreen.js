import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import {
  COLORS,
  SPACING,
  RADIUS,
  SHADOWS,
  FONTS,
} from "../config/theme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const H_PADDING = SPACING.xl;

const CATEGORIES = [
  { id: "1", name: "Eggs", icon: "egg-outline", query: "eggs" },
  { id: "2", name: "Milk", icon: "water-outline", query: "milk" },
  { id: "3", name: "Bread", icon: "pizza-outline", query: "bread" },
  { id: "4", name: "Rice", icon: "leaf-outline", query: "rice" },
  { id: "5", name: "Chicken", icon: "restaurant-outline", query: "chicken" },
  { id: "6", name: "Atta", icon: "bag-outline", query: "atta" },
  { id: "7", name: "Oil", icon: "flask-outline", query: "oil" },
  { id: "8", name: "Snacks", icon: "fast-food-outline", query: "chips" },
];

const TRENDING = [
  { id: "1", name: "White Eggs (10 pcs)", best: "₹79", platform: "Zepto", saving: "₹16" },
  { id: "2", name: "Amul Butter 500g", best: "₹265", platform: "Zepto", saving: "₹15" },
  { id: "3", name: "Aashirvaad Atta 5kg", best: "₹275", platform: "BigBasket", saving: "₹24" },
  { id: "4", name: "Tata Tea Gold 500g", best: "₹275", platform: "Blinkit", saving: "₹20" },
];

// --- Sub-components ---

const CategoryPill = ({ cat, navigation }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    style={styles.categoryPill}
    onPress={() => navigation.navigate("Search", { query: cat.query })}
    testID={`homeCategoryPill_${cat.query}`}
  >
    <View style={styles.categoryIconWrap}>
      <Ionicons name={cat.icon} size={20} color={COLORS.textPrimary} />
    </View>
    <Text style={styles.categoryLabel}>{cat.name}</Text>
  </TouchableOpacity>
);

const TrendingCard = ({ item, navigation }) => (
  <TouchableOpacity
    style={styles.trendCard}
    activeOpacity={0.7}
    onPress={() => navigation.navigate("Search", { query: item.name.split(" (")[0] })}
  >
    <View style={styles.trendLeft}>
      <Text style={styles.trendName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.trendMeta}>{item.platform}</Text>
    </View>
    <View style={styles.trendRight}>
      <Text style={styles.trendPrice}>{item.best}</Text>
      <Text style={styles.trendSave}>save {item.saving}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
  </TouchableOpacity>
);

// --- Main Screen ---

const HomeScreen = ({ navigation }) => {
  const { logout } = useContext(AuthContext);

  const fadeHero = React.useRef(new Animated.Value(0)).current;
  const fadeContent = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.stagger(200, [
      Animated.timing(fadeHero, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(fadeContent, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const slideUp = (anim) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* ── Dark Hero Section (inspired by luxury splash) ── */}
        <Animated.View style={slideUp(fadeHero)}>
          <LinearGradient
            colors={COLORS.gradientHero}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.3, y: 1 }}
            style={styles.hero}
          >
            {/* Top bar */}
            <View style={styles.heroTop}>
              <Text style={styles.heroEyebrow}>CompareZ</Text>
              <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.textOnDarkSec} />
              </TouchableOpacity>
            </View>

            {/* Main headline */}
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle} testID="homeHeroTitle">
                Save on{"\n"}Every Cart
              </Text>
              <Text style={styles.heroSubtitle}>
                Compare prices across Blinkit, Zepto, BigBasket{"\n"}and more — all in one search.
              </Text>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>5</Text>
                <Text style={styles.statLabel}>Platforms</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>200+</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: COLORS.secondary }]}>30%</Text>
                <Text style={styles.statLabel}>Max Savings</Text>
              </View>
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={styles.ctaButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("Search")}
              testID="homeSearchCta"
            >
              <Text style={styles.ctaText}>Start Comparing</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* ── Light Collection Section ── */}
        <Animated.View style={[styles.lightSection, slideUp(fadeContent)]}>
          {/* Categories */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Browse</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Search")}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {CATEGORIES.map((cat) => (
              <CategoryPill key={cat.id} cat={cat} navigation={navigation} />
            ))}
          </ScrollView>

          {/* Trending section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Deals</Text>
          </View>

          <View style={styles.trendingList}>
            {TRENDING.map((item) => (
              <TrendingCard key={item.id} item={item} navigation={navigation} />
            ))}
          </View>

          {/* Quick search CTA removed - redundant with footer and hero CTA */}
        </Animated.View>

        {/* Extra space to ensure last cards are fully visible above floating navbar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  // ── Hero (Vibrant gradient section) ──
  hero: {
    minHeight: SCREEN_H * 0.52,
    paddingTop: 64,       // Normalized (8*8)
    paddingHorizontal: H_PADDING,
    paddingBottom: SPACING.xxxl,
    justifyContent: "space-between",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.huge,
  },
  heroEyebrow: {
    ...FONTS.eyebrow,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroContent: {
    marginBottom: SPACING.xxxl,
  },
  heroTitle: {
    ...FONTS.luxury,
    lineHeight: 48,
    marginBottom: SPACING.lg,
  },
  heroSubtitle: {
    ...FONTS.luxurySub,
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
    paddingTop: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    ...FONTS.h2Dark,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    ...FONTS.captionDark,
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginVertical: SPACING.xs,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    height: 56,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    ...SHADOWS.lg,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    letterSpacing: 0.3,
  },

  // ── Light Section ──
  lightSection: {
    paddingTop: SPACING.xxl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: H_PADDING,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...FONTS.h3,
  },
  seeAll: {
    ...FONTS.captionBold,
    color: COLORS.textAccent,
  },

  // ── Categories ──
  categoriesScroll: {
    paddingHorizontal: H_PADDING,
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  categoryPill: {
    alignItems: "center",
    gap: SPACING.sm,
  },
  categoryIconWrap: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.sm,
  },
  categoryLabel: {
    ...FONTS.caption,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },

  // ── Trending ──
  trendingList: {
    paddingHorizontal: H_PADDING,
    marginBottom: SPACING.xxl,
  },
  trendCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  trendLeft: {
    flex: 1,
  },
  trendName: {
    ...FONTS.bodyBold,
    marginBottom: SPACING.xs,
  },
  trendMeta: {
    ...FONTS.caption,
    fontSize: 12,
  },
  trendRight: {
    alignItems: "flex-end",
    marginRight: SPACING.sm,
  },
  trendPrice: {
    ...FONTS.priceSmall,
    fontSize: 16,
    fontWeight: "500",
  },
  trendSave: {
    ...FONTS.caption,
    fontSize: 11,
    color: COLORS.savings,
  },

  // ── Search CTA ──
  searchCta: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: H_PADDING,
    height: 56,           // Standardized with search bar
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  searchCtaText: {
    ...FONTS.body,
    color: COLORS.textTertiary,
    flex: 1,
  },
});

export default HomeScreen;
