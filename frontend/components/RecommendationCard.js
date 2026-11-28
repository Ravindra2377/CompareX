import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "./Icon";
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";
import { useTheme } from "../context/ThemeContext";

const RecommendationCard = ({
  rankedItem,
  onPress,
  isTopChoice = false,
}) => {
  const { themeColors, isDark } = useTheme();

  if (!rankedItem || !rankedItem.product) return null;

  const { product, overall_score, score_breakdown, fit_verdict } = rankedItem;

  const scoreColor =
    overall_score >= 9.0
      ? "#10B981"
      : overall_score >= 8.5
      ? themeColors.primary
      : "#F59E0B";

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress && onPress(product)}
      style={[
        styles.card,
        {
          backgroundColor: themeColors.card,
          borderColor: isTopChoice ? themeColors.primary : themeColors.border,
          borderWidth: isTopChoice ? 1.5 : 1,
        },
        SHADOWS.sm,
      ]}
    >
      {isTopChoice && (
        <View style={[styles.topBadge, { backgroundColor: themeColors.primary }]}>
          <Ionicons name="sparkles" size={11} color="#FFFFFF" />
          <Text style={styles.topBadgeText}>Top Personalized Fit</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <Image
          source={{ uri: product.image_url }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.headerInfo}>
          <Text style={[styles.brandText, { color: themeColors.textTertiary }]}>
            {product.brand}
          </Text>
          <Text
            style={[styles.titleText, { color: themeColors.textPrimary }]}
            numberOfLines={2}
          >
            {product.name}
          </Text>
          <Text style={[styles.priceText, { color: themeColors.textSecondary }]}>
            {product.benchmark_price
              ? `₹${product.benchmark_price.toLocaleString("en-IN")}`
              : "Price unverified"}
          </Text>
        </View>

        <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}18`, borderColor: scoreColor }]}>
          <Text style={[styles.scoreValue, { color: scoreColor }]}>
            {overall_score.toFixed(1)}
          </Text>
          <Text style={[styles.scoreScale, { color: scoreColor }]}>/10</Text>
        </View>
      </View>

      {fit_verdict ? (
        <View
          style={[
            styles.verdictBox,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.03)"
                : "rgba(0, 0, 0, 0.02)",
            },
          ]}
        >
          <Ionicons name="checkmark-circle-outline" size={14} color={scoreColor} />
          <Text style={[styles.verdictText, { color: themeColors.textSecondary }]}>
            {fit_verdict}
          </Text>
        </View>
      ) : null}

      {/* Attribute Breakdown Bars */}
      {score_breakdown && (
        <View style={styles.breakdownContainer}>
          {Object.entries(score_breakdown).map(([dim, val]) => {
            const pct = Math.min(Math.max((val / 10) * 100, 10), 100);
            return (
              <View key={`dim-${dim}`} style={styles.dimRow}>
                <Text style={[styles.dimLabel, { color: themeColors.textTertiary }]}>
                  {dim.charAt(0).toUpperCase() + dim.slice(1)}
                </Text>
                <View style={[styles.barTrack, { backgroundColor: themeColors.border }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: scoreColor,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.dimScore, { color: themeColors.textPrimary }]}>
                  {val.toFixed(1)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={[styles.footerRow, { borderTopColor: themeColors.border }]}>
        <Text style={[styles.footerLink, { color: themeColors.primary }]}>
          View Detailed Intelligence
        </Text>
        <Ionicons name="arrow-forward" size={14} color={themeColors.primary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginVertical: SPACING.xs + 2,
    overflow: "hidden",
  },
  topBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderBottomLeftRadius: RADIUS.md,
  },
  topBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  headerInfo: {
    flex: 1,
    paddingRight: SPACING.xs,
  },
  brandText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    marginTop: 1,
    lineHeight: 18,
  },
  priceText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    marginTop: 3,
  },
  scoreBadge: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  scoreValue: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    lineHeight: 22,
  },
  scoreScale: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    marginTop: -2,
  },
  verdictBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  verdictText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    flex: 1,
  },
  breakdownContainer: {
    marginTop: SPACING.sm,
    gap: 6,
  },
  dimRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dimLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    width: 80,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  dimScore: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    width: 28,
    textAlign: "right",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerLink: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
});

export default RecommendationCard;
