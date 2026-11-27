import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../components/Icon";
import { useTheme } from "../context/ThemeContext";
import { FONTS, SPACING, RADIUS, SHADOWS } from "../config/theme";
import BrandHeader from "../components/BrandHeader";
import * as Haptics from "expo-haptics";

const CATEGORIES = [
  { id: "grocery", label: "Quick Grocery", icon: "basket-outline", color: "#16845B" },
  { id: "tech", label: "Tech & Mobiles", icon: "speedometer-outline", color: "#3B82F6" },
  { id: "health", label: "Health & Diet", icon: "flame-outline", color: "#F59E0B" },
  { id: "personal", label: "Personal Care", icon: "sparkles", color: "#EC4899" },
  { id: "home", label: "Home & Kitchen", icon: "restaurant-outline", color: "#8B5CF6" },
];

const TRENDING_COMPARISONS = [
  {
    id: "1",
    title: "Amul Gold Milk vs Nandini GoodLife",
    category: "Dairy & Milk",
    bestDeal: "Compare live pricing across Zepto, Blinkit & BigBasket",
    platforms: ["Zepto", "Blinkit", "BigBasket"],
    query: "Amul Gold Milk vs Nandini GoodLife",
  },
  {
    id: "2",
    title: "Fortune Sunlite Oil vs Saffola Gold",
    category: "Cooking Oils",
    bestDeal: "Compare live oil rates across platforms",
    platforms: ["Blinkit", "Zepto", "Amazon"],
    query: "Fortune Sunlite Oil 1L price compare",
  },
  {
    id: "3",
    title: "Aashirvaad Shudh Chakki Atta 5kg",
    category: "Grains & Staples",
    bestDeal: "Check bulk staples discounts & stock",
    platforms: ["BigBasket", "Zepto", "Blinkit"],
    query: "Aashirvaad Shudh Chakki Atta 5kg",
  },
  {
    id: "4",
    title: "iPhone 16 (128GB) — Blinkit 10m vs Amazon",
    category: "Smartphones",
    bestDeal: "Compare 10-min quick commerce vs e-commerce",
    platforms: ["Blinkit", "Amazon", "Flipkart"],
    query: "iPhone 16 128gb price compare blinkit amazon",
  },
];

const AI_RESEARCH_GUIDES = [
  {
    id: "g1",
    title: "How to choose genuinely cold-pressed mustard oil in India?",
    tag: "HEALTH RESEARCH",
    readTime: "3 min read",
    query: "How to identify pure cold-pressed kachi ghani mustard oil with lab tests and fssai norms?",
  },
  {
    id: "g2",
    title: "High-protein vegetarian grocery list under ₹250/day",
    tag: "NUTRITION & BUDGET",
    readTime: "4 min read",
    query: "High protein vegetarian Indian grocery basket plan under 250 rupees per day",
  },
  {
    id: "g3",
    title: "Which quick-commerce app has the lowest delivery fees in 2026?",
    tag: "SHOPPING INTELLIGENCE",
    readTime: "2 min read",
    query: "Compare delivery charges and handling fees between Blinkit, Zepto, Swiggy Instamart, and BigBasket",
  },
];

const DiscoverScreen = ({ navigation }) => {
  const { themeColors, isDark } = useTheme();
  const [selectedCat, setSelectedCat] = useState("grocery");

  const handleOpenResearch = (promptQuery) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("AIResearch", { initialQuery: promptQuery });
  };

  const handleOpenLiveCompare = (productQuery) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Search", { query: productQuery });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.paper }]}>
      <BrandHeader editorial title="Discover" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Headline ── */}
        <View style={styles.headerTitleWrap}>
          <Text style={[FONTS.editorialBold, { fontSize: 24, color: themeColors.ink }]}>
            Explore & Compare
          </Text>
          <Text style={[FONTS.uiBody, { fontSize: 13, color: themeColors.inkSoft, marginTop: 4 }]}>
            AI-curated buying guides, price trends, and top consumer discoveries in India.
          </Text>
        </View>

        {/* ── Categories Bar ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCat === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: isSelected ? themeColors.primary : themeColors.card,
                    borderColor: isSelected ? themeColors.primary : themeColors.line,
                  },
                ]}
                onPress={() => {
                  setSelectedCat(cat.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={isSelected ? "#FFFFFF" : cat.color}
                />
                <Text
                  style={[
                    FONTS.uiBodyBold,
                    {
                      fontSize: 12,
                      marginLeft: 6,
                      color: isSelected ? "#FFFFFF" : themeColors.ink,
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Live Trending Comparisons ── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="pricetags-outline" size={16} color={themeColors.coriander || "#059669"} />
              <Text style={[FONTS.monoBold, { fontSize: 12, color: themeColors.coriander || "#059669", marginLeft: 6, letterSpacing: 0.5 }]}>
                TRENDING PRICE COMPARISONS
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate("Search")}>
              <Text style={[FONTS.uiBodyBold, { fontSize: 12, color: themeColors.primary }]}>
                View all →
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardsGrid}>
            {TRENDING_COMPARISONS.map((comp) => (
              <View
                key={comp.id}
                style={[styles.compCard, { backgroundColor: themeColors.card, borderColor: themeColors.line }]}
              >
                <Text style={[FONTS.monoBold, { fontSize: 10, color: themeColors.primary, textTransform: "uppercase" }]}>
                  {comp.category}
                </Text>

                <Text style={[FONTS.uiBodyBold, { fontSize: 15, color: themeColors.ink, marginTop: 4 }]}>
                  {comp.title}
                </Text>

                <View style={[styles.bestDealRow, { backgroundColor: `${themeColors.coriander || "#059669"}14` }]}>
                  <Ionicons name="flash" size={12} color={themeColors.coriander || "#059669"} />
                  <Text style={[FONTS.monoBold, { fontSize: 11, color: themeColors.coriander || "#059669", marginLeft: 4 }]}>
                    {comp.bestDeal}
                  </Text>
                </View>

                {/* Platform availability pills */}
                <View style={styles.platformPillsRow}>
                  {comp.platforms.map((p, idx) => (
                    <View key={idx} style={[styles.platformPill, { backgroundColor: themeColors.paper }]}>
                      <Text style={[FONTS.mono, { fontSize: 10, color: themeColors.inkSoft }]}>
                        {p}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.cardBtnRow, { borderTopColor: themeColors.line }]}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: themeColors.line }]}
                    onPress={() => handleOpenResearch(comp.query)}
                  >
                    <Ionicons name="sparkles" size={12} color={themeColors.primary} />
                    <Text style={[FONTS.uiBodyBold, { fontSize: 11, color: themeColors.primary, marginLeft: 4 }]}>
                      AI Research
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtnFilled, { backgroundColor: themeColors.ink }]}
                    onPress={() => handleOpenLiveCompare(comp.query)}
                  >
                    <Text style={[FONTS.uiBodyBold, { fontSize: 11, color: "#FFFFFF" }]}>
                      Live Scan
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── AI Research & Buying Guides ── */}
        <View style={[styles.sectionWrap, { marginTop: 24 }]}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="globe-outline" size={16} color={themeColors.primary} />
              <Text style={[FONTS.monoBold, { fontSize: 12, color: themeColors.primary, marginLeft: 6, letterSpacing: 0.5 }]}>
                AI BUYING GUIDES & EVIDENCE
              </Text>
            </View>
          </View>

          <View style={styles.guidesList}>
            {AI_RESEARCH_GUIDES.map((guide) => (
              <TouchableOpacity
                key={guide.id}
                style={[styles.guideCard, { backgroundColor: themeColors.card, borderColor: themeColors.line }]}
                onPress={() => handleOpenResearch(guide.query)}
                activeOpacity={0.8}
              >
                <View style={styles.guideTopRow}>
                  <View style={[styles.guideTag, { backgroundColor: `${themeColors.primary}18` }]}>
                    <Text style={[FONTS.monoBold, { fontSize: 9, color: themeColors.primary }]}>
                      {guide.tag}
                    </Text>
                  </View>
                  <Text style={[FONTS.mono, { fontSize: 10, color: themeColors.inkFaint }]}>
                    {guide.readTime}
                  </Text>
                </View>

                <Text style={[FONTS.uiBodyBold, { fontSize: 14, color: themeColors.ink, marginTop: 8, lineHeight: 20 }]}>
                  {guide.title}
                </Text>

                <View style={styles.guideBottomLink}>
                  <Text style={[FONTS.uiBodyBold, { fontSize: 12, color: themeColors.primary }]}>
                    Explore cited evidence
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color={themeColors.primary} style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerTitleWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 14,
  },
  catScroll: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  sectionWrap: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardsGrid: {
    gap: 12,
  },
  compCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  bestDealRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  platformPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  platformPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardBtnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnFilled: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  guidesList: {
    gap: 10,
  },
  guideCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  guideTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  guideTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  guideBottomLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
});

export default DiscoverScreen;
