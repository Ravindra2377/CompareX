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
  { id: "tech", label: "Tech & Mobiles", icon: "phone-portrait-outline", color: "#3B82F6" },
  { id: "health", label: "Health & Nutrition", icon: "flame-outline", color: "#F59E0B" },
  { id: "appliances", label: "Home & Appliances", icon: "home-outline", color: "#8B5CF6" },
  { id: "audio", label: "Audio & Gadgets", icon: "headset-outline", color: "#EC4899" },
  { id: "auto", label: "EV & Auto", icon: "speedometer-outline", color: "#16845B" },
];

const TRENDING_COMPARISONS = [
  {
    id: "1",
    title: "iPhone 16 vs Samsung Galaxy S25",
    category: "Flagship Smartphones",
    bestDeal: "A18 vs Snapdragon 8 Elite • 60Hz vs 120Hz • iOS vs Android",
    highlights: ["A18 Processor", "Snapdragon 8 Elite", "60Hz vs 120Hz", "AI Camera"],
    query: "Which smartphone should I buy? Apple iPhone 16 vs Samsung Galaxy S25 full comparison",
  },
  {
    id: "2",
    title: "Cold-Pressed vs Refined Cooking Oil",
    category: "Health & Nutrition",
    bestDeal: "Evidence-backed health analysis, smoke points & lab norms",
    highlights: ["Nutrient Retention", "Heart Health", "Smoke Points", "FSSAI Norms"],
    query: "Is cold-pressed mustard oil healthier than refined oil? Evidence and scientific research",
  },
  {
    id: "3",
    title: "Sony WH-1000XM5 vs Bose QC Ultra",
    category: "Wireless Audio",
    bestDeal: "Active noise cancellation, soundstage & comfort comparison",
    highlights: ["Industry ANC", "Spatial Audio", "30h Battery", "Call Clarity"],
    query: "Sony WH-1000XM5 vs Bose QuietComfort Ultra comparison which is better",
  },
  {
    id: "4",
    title: "Tata Punch EV vs Nexon EV",
    category: "Electric Vehicles",
    bestDeal: "Range, battery capacity, fast charging & value comparison",
    highlights: ["315km vs 465km", "Fast Charging", "City Commute", "Price-to-Value"],
    query: "Tata Punch EV vs Nexon EV comparison range battery and specs",
  },
];

const AI_RESEARCH_GUIDES = [
  {
    id: "g1",
    title: "How to choose between iPhone 16 and Galaxy S25 in 2026?",
    tag: "PRODUCT INTELLIGENCE",
    readTime: "3 min read",
    query: "Which smartphone should I buy? Apple iPhone 16 vs Samsung Galaxy S25 comparison",
  },
  {
    id: "g2",
    title: "Evidence-backed guide: Identifying authentic cold-pressed oils",
    tag: "HEALTH RESEARCH",
    readTime: "4 min read",
    query: "How to identify pure cold-pressed kachi ghani mustard oil with lab tests and fssai norms?",
  },
  {
    id: "g3",
    title: "Air Purifier Guide: True HEPA vs H13 filters for high AQI",
    tag: "HOME & SCIENCE",
    readTime: "3 min read",
    query: "How to choose an air purifier for high AQI in India? HEPA H13 CADR and room size guide",
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
                  <Ionicons name="sparkles" size={12} color={themeColors.coriander || "#059669"} />
                  <Text style={[FONTS.monoBold, { fontSize: 11, color: themeColors.coriander || "#059669", marginLeft: 4 }]}>
                    {comp.bestDeal}
                  </Text>
                </View>

                {/* Highlights & specs pills */}
                <View style={styles.platformPillsRow}>
                  {(comp.highlights || []).map((h, idx) => (
                    <View key={idx} style={[styles.platformPill, { backgroundColor: themeColors.paper }]}>
                      <Text style={[FONTS.mono, { fontSize: 10, color: themeColors.inkSoft }]}>
                        {h}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.cardBtnRow, { borderTopColor: themeColors.line }]}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: themeColors.line, flex: 1 }]}
                    onPress={() => handleOpenResearch(comp.query)}
                  >
                    <Ionicons name="sparkles" size={12} color={themeColors.primary} />
                    <Text style={[FONTS.uiBodyBold, { fontSize: 11, color: themeColors.primary, marginLeft: 4 }]}>
                      AI Product Compare
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
