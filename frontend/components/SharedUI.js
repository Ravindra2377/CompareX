import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";

export const SurfaceCard = ({ children, style }) => (
  <View style={[styles.surfaceCard, style]}>{children}</View>
);

export const AppButton = ({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled = false,
  style,
  textStyle,
  testID,
}) => {
  const isPrimary = variant === "primary";
  const isGhost = variant === "ghost";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        isPrimary && styles.buttonPrimary,
        !isPrimary && !isGhost && styles.buttonSecondary,
        isGhost && styles.buttonGhost,
        disabled && styles.buttonDisabled,
        style,
      ]}
      activeOpacity={0.8}
      testID={testID}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={isPrimary ? COLORS.textInverse : COLORS.textPrimary}
          style={styles.buttonIcon}
        />
      ) : null}
      <Text
        style={[
          styles.buttonText,
          isPrimary && styles.buttonTextPrimary,
          !isPrimary && styles.buttonTextSecondary,
          disabled && styles.buttonTextDisabled,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export const TextField = ({
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  rightAccessory,
  testID,
}) => (
  <View style={styles.inputWrap}>
    {icon ? (
      <Ionicons name={icon} size={18} color={COLORS.textTertiary} />
    ) : null}
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textTertiary}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      testID={testID}
    />
    {rightAccessory || null}
  </View>
);

export const ScreenHeader = ({ title, subtitle, rightAction }) => (
  <View style={styles.screenHeader}>
    <View style={styles.screenHeaderTextWrap}>
      <Text style={styles.screenTitle}>{title}</Text>
      {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
    </View>
    {rightAction || null}
  </View>
);

export const Badge = ({ label, color = COLORS.textAccent, bgColor, style }) => {
  const bg = bgColor || COLORS.accentLight;
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
};

export const PriceTag = ({ price, originalPrice, size = "md" }) => {
  const priceStyle = size === "lg" ? FONTS.price : FONTS.priceSmall;
  return (
    <View style={styles.priceRow}>
      <Text style={[priceStyle, { color: COLORS.savings }]}>₹{price}</Text>
      {originalPrice && (
        <Text style={styles.originalPrice}>₹{originalPrice}</Text>
      )}
    </View>
  );
};

export const RatingRow = ({ rating, reviewCount }) => {
  return (
    <View style={styles.ratingRow}>
      <Ionicons name="star" size={14} color={COLORS.warning} />
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      {reviewCount && <Text style={styles.reviewCount}>({reviewCount})</Text>}
    </View>
  );
};

export const SectionHeader = ({ title, subtitle, actionText, onAction }) => {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={FONTS.h3}>{title}</Text>
        {subtitle && (
          <Text style={[FONTS.caption, { marginTop: 2 }]}>{subtitle}</Text>
        )}
      </View>
      {actionText && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  surfaceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.xl,
  },
  screenHeaderTextWrap: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  screenTitle: {
    ...FONTS.h2,
    marginBottom: 2,
  },
  screenSubtitle: {
    ...FONTS.caption,
  },
  button: {
    minHeight: 56,        // Strict 8pt (8*7)
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.glow,
  },
  buttonSecondary: {
    backgroundColor: COLORS.cardAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    ...FONTS.bodyBold,
  },
  buttonTextPrimary: {
    color: "#FFFFFF",
  },
  buttonTextSecondary: {
    color: COLORS.textPrimary,
  },
  buttonTextDisabled: {
    color: COLORS.textTertiary,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,        // Strict 8pt (8*7)
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.cardAlt,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    ...FONTS.body,
    paddingVertical: SPACING.xs,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    ...FONTS.badge,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: SPACING.sm,
  },
  originalPrice: {
    ...FONTS.body,
    color: COLORS.textTertiary,
    textDecorationLine: "line-through",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  ratingText: {
    ...FONTS.captionBold,
    color: COLORS.warning,
  },
  reviewCount: {
    ...FONTS.caption,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  actionText: {
    ...FONTS.captionBold,
    color: COLORS.textAccent,
  },
});
