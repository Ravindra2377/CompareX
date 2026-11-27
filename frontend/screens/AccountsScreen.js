import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "../components/Icon";
import { SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";
import { useTheme } from "../context/ThemeContext";
import * as Haptics from "expo-haptics";
import ScreenHeader from "../components/ScreenHeader";
import LocationService from "../services/LocationService";

const DATA_SOURCES = [
  {
    icon: "globe-outline",
    title: "Licensed Web Intelligence",
    description: "Real-time grounded search retrieval with numerical citations from public web sources.",
    tag: "ACTIVE",
    tagColor: "#059669",
  },
  {
    icon: "document-text-outline",
    title: "Manufacturer Specifications",
    description: "Official hardware, nutritional, and technical parameters for objective product comparisons.",
    tag: "ACTIVE",
    tagColor: "#059669",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Independent Product Evaluation",
    description: "CompareZ does not extract third-party user credentials or scrape private dark-store sessions.",
    tag: "V5 POLICY",
    tagColor: "#3B82F6",
  },
  {
    icon: "storefront-outline",
    title: "Authorised Affiliate & Merchant APIs",
    description: "Permitted direct partner integrations and verified affiliate referral channels.",
    tag: "PLANNED",
    tagColor: "#8B5CF6",
  },
];

const AccountsScreen = ({ navigation }) => {
  const { themeColors, isDark } = useTheme();

  const handleClearHistory = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Clear Search History",
      "Are you sure you want to delete all locally stored search queries?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("comparex_search_history");
            Alert.alert("History Cleared", "Your search history has been removed.");
          },
        },
      ],
    );
  };

  const handleClearSavedResearch = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Clear Saved Research",
      "Are you sure you want to delete all saved research answers in your library?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("comparez_saved_research");
            Alert.alert("Library Cleared", "All saved research answers have been removed.");
          },
        },
      ],
    );
  };

  const handleResetLocation = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await LocationService.setLocation({
      latitude: 12.9716,
      longitude: 77.5946,
      city: "Bengaluru",
      pincode: "560001",
    });
    Alert.alert("Location Reset", "Default delivery location reset to Bengaluru (560001).");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.paper }]}>
      <ScreenHeader
        title="Privacy & Data Sources"
        onBack={() => navigation.goBack()}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Independence Badge */}
        <View style={[styles.policyBanner, { backgroundColor: `${themeColors.primary}12`, borderColor: `${themeColors.primary}30` }]}>
          <View style={styles.bannerHeader}>
            <Ionicons name="shield-checkmark" size={20} color={themeColors.primary} />
            <Text style={[FONTS.uiBodyBold, { fontSize: 14, color: themeColors.primary, marginLeft: 8 }]}>
              CompareZ Independence Guarantee
            </Text>
          </View>
          <Text style={[FONTS.uiBody, { fontSize: 12.5, color: themeColors.inkSoft, marginTop: 6, lineHeight: 18 }]}>
            CompareZ is an independent, general-purpose AI research and product intelligence platform. We do not extract credentials, access private dark-store accounts, or execute unauthorised scrapers.
          </Text>
        </View>

        {/* Data Acquisition Strategy */}
        <Text style={[styles.sectionTitle, { color: themeColors.ink }]}>
          DATA ACQUISITION STANDARDS
        </Text>
        <Text style={[styles.sectionSubtitle, { color: themeColors.inkSoft }]}>
          How CompareZ gathers specifications, intelligence, and verified research:
        </Text>

        <View style={styles.sourcesList}>
          {DATA_SOURCES.map((source, index) => (
            <View
              key={index}
              style={[
                styles.sourceCard,
                { backgroundColor: themeColors.card, borderColor: themeColors.line },
              ]}
            >
              <View style={styles.sourceCardTop}>
                <View style={[styles.sourceIconWrap, { backgroundColor: `${themeColors.primary}15` }]}>
                  <Ionicons name={source.icon} size={18} color={themeColors.primary} />
                </View>
                <View style={styles.sourceInfo}>
                  <Text style={[FONTS.uiBodyBold, { fontSize: 14, color: themeColors.ink }]}>
                    {source.title}
                  </Text>
                  <Text style={[FONTS.uiBody, { fontSize: 12, color: themeColors.inkSoft, marginTop: 2, lineHeight: 17 }]}>
                    {source.description}
                  </Text>
                </View>
                <View style={[styles.tagBadge, { backgroundColor: `${source.tagColor}18` }]}>
                  <Text style={[FONTS.monoBold, { fontSize: 9, color: source.tagColor }]}>
                    {source.tag}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Local Privacy Controls */}
        <Text style={[styles.sectionTitle, { color: themeColors.ink, marginTop: 24 }]}>
          ON-DEVICE PRIVACY CONTROLS
        </Text>
        <Text style={[styles.sectionSubtitle, { color: themeColors.inkSoft }]}>
          Manage locally cached queries and research history stored on your device:
        </Text>

        <View style={[styles.controlsCard, { backgroundColor: themeColors.card, borderColor: themeColors.line }]}>
          <TouchableOpacity
            style={[styles.controlRow, { borderBottomColor: themeColors.line }]}
            onPress={handleClearHistory}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={themeColors.ink} />
            <View style={styles.controlTextWrap}>
              <Text style={[FONTS.uiBodyBold, { fontSize: 13.5, color: themeColors.ink }]}>
                Clear Search History
              </Text>
              <Text style={[FONTS.uiBody, { fontSize: 11.5, color: themeColors.inkSoft, marginTop: 1 }]}>
                Delete all previous search queries stored locally
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.inkFaint} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlRow, { borderBottomColor: themeColors.line }]}
            onPress={handleClearSavedResearch}
            activeOpacity={0.7}
          >
            <Ionicons name="library-outline" size={18} color={themeColors.ink} />
            <View style={styles.controlTextWrap}>
              <Text style={[FONTS.uiBodyBold, { fontSize: 13.5, color: themeColors.ink }]}>
                Clear Saved Research Cache
              </Text>
              <Text style={[FONTS.uiBody, { fontSize: 11.5, color: themeColors.inkSoft, marginTop: 1 }]}>
                Remove all bookmarked research responses from your library
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.inkFaint} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlRow}
            onPress={handleResetLocation}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={18} color={themeColors.ink} />
            <View style={styles.controlTextWrap}>
              <Text style={[FONTS.uiBodyBold, { fontSize: 13.5, color: themeColors.ink }]}>
                Reset Delivery Location
              </Text>
              <Text style={[FONTS.uiBody, { fontSize: 11.5, color: themeColors.inkSoft, marginTop: 1 }]}>
                Reset geographical coordinates and delivery parameters
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.inkFaint} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  policyBanner: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.xl,
  },
  bannerHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    ...FONTS.monoBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    ...FONTS.uiBody,
    fontSize: 12,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  sourcesList: {
    gap: SPACING.sm,
  },
  sourceCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
  },
  sourceCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  sourceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  sourceInfo: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  controlsCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
  },
  controlTextWrap: {
    flex: 1,
    marginLeft: SPACING.md,
  },
});

export default AccountsScreen;
