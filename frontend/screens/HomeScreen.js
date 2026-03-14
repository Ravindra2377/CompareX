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
import GlassCard from "../components/GlassCard";
import {
  COLORS,
  SPACING,
  RADIUS,
  SHADOWS,
  FONTS,
} from "../config/theme";

const { width: SCREEN_W } = Dimensions.get("window");
const COL_GAP = SPACING.sm;
const H_PADDING = SPACING.lg;
const GRID_W = SCREEN_W - H_PADDING * 2;

// Bento tile sizes
const TILE_LARGE = (GRID_W - COL_GAP) / 2;
const TILE_SMALL = (GRID_W - COL_GAP) / 2;

const CATEGORIES = [
  { id: "1", name: "Eggs", icon: "egg-outline", query: "eggs", accent: COLORS.warning },
  { id: "2", name: "Milk", icon: "water-outline", query: "milk", accent: COLORS.accent },
  { id: "3", name: "Bread", icon: "pizza-outline", query: "bread", accent: "#F97316" },
  { id: "4", name: "Rice", icon: "leaf-outline", query: "rice", accent: COLORS.savings },
  { id: "5", name: "Chicken", icon: "restaurant-outline", query: "chicken", accent: "#EF4444" },
  { id: "6", name: "Atta", icon: "bag-outline", query: "atta", accent: "#E2751C" },
  { id: "7", name: "Oil", icon: "flask-outline", query: "oil", accent: "#EAB308" },
  { id: "8", name: "Snacks", icon: "fast-food-outline", query: "chips", accent: "#A855F7" },
];

const TRENDING = [
  { id: "1", name: "White Eggs (10 pcs)", best: "₹79", platform: "Zepto", saving: "₹16", accent: COLORS.platformZepto },
  { id: "2", name: "Amul Butter 500g", best: "₹265", platform: "Zepto", saving: "₹15", accent: COLORS.platformZepto },
  { id: "3", name: "Aashirvaad Atta 5kg", best: "₹275", platform: "BigBasket", saving: "₹24", accent: COLORS.platformBigBasket },
  { id: "4", name: "Tata Tea Gold 500g", best: "₹275", platform: "Blinkit", saving: "₹20", accent: COLORS.platformBlinkit },
];

// --- Sub-components ---

const StatTile = ({ value, label, highlight }) => (
  <View style={styles.statTile}>
    <Text style={[styles.statValue, highlight && { color: COLORS.savings }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const BentoCategory = ({ cat, navigation, isLarge }) => (
  <TouchableOpacity
    activeOpacity={0.75}
    style={[styles.bentoTile, isLarge ? styles.bentoLarge : styles.bentoSmall]}
    onPress={() => navigation.navigate("Search", { query: cat.query })}
  >
    <LinearGradient
      colors={[`${cat.accent}22`, `${cat.accent}08`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
    <View
      style={[
        styles.bentoIconWrap,
        { backgroundColor: `${cat.accent}22`, borderColor: `${cat.accent}44` },
      ]}
    >
      <Ionicons name={cat.icon} size={isLarge ? 28 : 22} color={cat.accent} />
    </View>
    <Text style={[styles.bentoLabel, isLarge && styles.bentoLabelLarge]}>
      {cat.name}
    </Text>
  </TouchableOpacity>
);

const TrendingCard = ({ item, navigation }) => (
  <TouchableOpacity
    style={styles.trendCard}
    activeOpacity={0.75}
    onPress={() => navigation.navigate("Search", { query: item.name.split(" (")[0] })}
  >
    <LinearGradient
      colors={[`${item.accent}18`, `${item.accent}06`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.lg }]}
    />
    <View style={[styles.trendDot, { backgroundColor: item.accent }]} />
    <View style={{ flex: 1 }}>
      <Text style={styles.trendName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.trendMeta}>{item.platform}</Text>
    </View>
    <View style={styles.trendRight}>
      <Text style={[styles.trendPrice, { color: item.accent }]}>{item.best}</Text>
      <Text style={styles.trendSave}>save {item.saving}</Text>
    </View>
  </TouchableOpacity>
);

// --- Main Screen ---

const HomeScreen = ({ navigation }) => {
  const { logout } = useContext(AuthContext);

  const fadeHeader = React.useRef(new Animated.Value(0)).current;
  const fadeBento = React.useRef(new Animated.Value(0)).current;
  const fadeTrend = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(fadeHeader, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(fadeBento, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(fadeTrend, { toValue: 1, duration: 480, useNativeDriver: true }),
    ]).start();
  }, []);

  const slideUp = (anim) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Hero Header ── */}
        <Animated.View style={slideUp(fadeHeader)}>
          <LinearGradient
            colors={COLORS.gradientHero}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.hero}
          >
            {/* Top bar */}
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>SMART SAVINGS</Text>
                <Text style={styles.heroTitle}>CompareX</Text>
              </View>
              <TouchableOpacity style={styles.avatarBtn} onPress={logout}>
                <Ionicons name="log-out-outline" size={19} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Glowing accent strip */}
            <View style={styles.accentStrip} />

            {/* Search CTA */}
            <TouchableOpacity
              style={styles.searchCta}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Search")}
            >
              <View style={styles.searchCtaIcon}>
                <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.searchCtaText}>Search eggs, milk, bread…</Text>
              <View style={styles.searchCtaArrow}>
                <Ionicons name="arrow-forward" size={15} color={COLORS.textInverse} />
              </View>
            </TouchableOpacity>

            {/* Stat tiles */}
            <View style={styles.statsRow}>
              <StatTile value="3" label="Platforms" />
              <View style={styles.statDivider} />
              <StatTile value="200+" label="Products" />
              <View style={styles.statDivider} />
              <StatTile value="30%" label="Max Savings" highlight />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Bento Grid ── */}
        <Animated.View style={[styles.section, slideUp(fadeBento)]}>
          <Text style={styles.sectionTitle}>Browse</Text>
          <View style={styles.bentoGrid}>
            {/* Row 1: Large | Small */}
            <View style={styles.bentoRow}>
              <BentoCategory cat={CATEGORIES[0]} navigation={navigation} isLarge />
              <View style={styles.bentoColSmall}>
                <BentoCategory cat={CATEGORIES[1]} navigation={navigation} />
                <View style={{ height: COL_GAP }} />
                <BentoCategory cat={CATEGORIES[2]} navigation={navigation} />
              </View>
            </View>

            {/* Row 2: Small | Large */}
            <View style={[styles.bentoRow, { marginTop: COL_GAP }]}>
              <View style={styles.bentoColSmall}>
                <BentoCategory cat={CATEGORIES[3]} navigation={navigation} />
                <View style={{ height: COL_GAP }} />
                <BentoCategory cat={CATEGORIES[4]} navigation={navigation} />
              </View>
              <BentoCategory cat={CATEGORIES[5]} navigation={navigation} isLarge />
            </View>

            {/* Row 3: two equal */}
            <View style={[styles.bentoRow, { marginTop: COL_GAP }]}>
              <BentoCategory cat={CATEGORIES[6]} navigation={navigation} isLarge />
              <BentoCategory cat={CATEGORIES[7]} navigation={navigation} isLarge />
            </View>
          </View>
        </Animated.View>

        {/* ── Trending Price Drops ── */}
        <Animated.View style={[styles.section, slideUp(fadeTrend)]}>
          <Text style={styles.sectionTitle}>Trending Price Drops</Text>
          {TRENDING.map((item) => (
            <TrendingCard key={item.id} item={item} navigation={navigation} />
          ))}
        </Animated.View>

        {/* Bottom padding for floating nav */}
        <View style={{ height: 100 }} />
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

  // ── Hero ──
  hero: {
    paddingTop: 60,
    paddingHorizontal: H_PADDING,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xxl,
    borderBottomRightRadius: RADIUS.xxl,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  heroLabel: {
    ...FONTS.badge,
    color: COLORS.textAccent,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  heroTitle: {
    ...FONTS.h1,
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0, 0, 0, 0.60)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  accentStrip: {
    height: 1,
    backgroundColor: "rgba(6, 182, 212, 0.25)",
    marginBottom: SPACING.lg,
    borderRadius: 1,
  },
  searchCta: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  searchCtaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(53,80,112,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchCtaText: {
    ...FONTS.body,
    flex: 1,
    color: COLORS.textTertiary,
  },
  searchCtaArrow: {
    backgroundColor: COLORS.accent,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.60)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingVertical: SPACING.lg,
  },
  statTile: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    ...FONTS.h2,
    marginBottom: 4,
  },
  statLabel: {
    ...FONTS.caption,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
  },

  // ── Section ──
  section: {
    paddingHorizontal: H_PADDING,
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    ...FONTS.h3,
    marginBottom: SPACING.lg,
  },

  // ── Bento Grid ──
  bentoGrid: {},
  bentoRow: {
    flexDirection: "row",
    gap: COL_GAP,
  },
  bentoColSmall: {
    flex: 1,
  },
  bentoTile: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.card,
    justifyContent: "flex-end",
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  bentoLarge: {
    width: TILE_LARGE,
    height: TILE_LARGE,
    flex: undefined,
  },
  bentoSmall: {
    flex: 1,
    height: (TILE_LARGE - COL_GAP) / 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  bentoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bentoLabel: {
    ...FONTS.captionBold,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  bentoLabelLarge: {
    ...FONTS.bodyBold,
  },

  // ── Trending ──
  trendCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glassSurface,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    overflow: "hidden",
    ...SHADOWS.sm,
  },
  trendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trendName: {
    ...FONTS.bodyBold,
    marginBottom: 2,
    fontSize: 14,
  },
  trendMeta: {
    ...FONTS.caption,
    fontSize: 12,
  },
  trendRight: {
    alignItems: "flex-end",
    minWidth: 58,
  },
  trendPrice: {
    ...FONTS.priceSmall,
    fontSize: 16,
  },
  trendSave: {
    ...FONTS.caption,
    fontSize: 11,
    color: COLORS.savings,
  },
});

export default HomeScreen;
