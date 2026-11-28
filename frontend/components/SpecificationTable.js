import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "./Icon";
import { COLORS, SPACING, RADIUS, FONTS } from "../config/theme";
import { useTheme } from "../context/ThemeContext";

const SpecificationTable = ({ specifications = [] }) => {
  const { themeColors, isDark } = useTheme();

  if (!specifications || specifications.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.card,
          borderColor: themeColors.border,
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <Ionicons name="hardware-chip-outline" size={16} color={themeColors.primary} />
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
          Verified Technical Specifications
        </Text>
      </View>

      {specifications.map((item, index) => {
        const isEven = index % 2 === 0;
        const rowBg = isEven
          ? isDark
            ? "rgba(255, 255, 255, 0.02)"
            : "rgba(0, 0, 0, 0.015)"
          : "transparent";

        return (
          <View
            key={`spec-${index}-${item.feature}`}
            style={[
              styles.row,
              {
                backgroundColor: rowBg,
                borderBottomColor:
                  index === specifications.length - 1
                    ? "transparent"
                    : themeColors.border,
              },
            ]}
          >
            <View style={styles.featureCol}>
              <Text style={[styles.featureText, { color: themeColors.textSecondary }]}>
                {item.feature}
              </Text>
            </View>
            <View style={styles.valueCol}>
              <Text style={[styles.valueText, { color: themeColors.textPrimary }]}>
                {item.value}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: "hidden",
    marginVertical: SPACING.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: "row",
    paddingVertical: SPACING.sm + 3,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-start",
  },
  featureCol: {
    flex: 0.42,
    paddingRight: SPACING.sm,
  },
  featureText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    lineHeight: 18,
  },
  valueCol: {
    flex: 0.58,
  },
  valueText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    lineHeight: 19,
  },
});

export default SpecificationTable;
