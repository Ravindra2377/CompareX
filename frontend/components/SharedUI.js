import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, RADIUS, FONTS } from '../config/theme';

// Badge
export const Badge = ({ label, color = COLORS.textAccent, bgColor, style }) => {
  const bg = bgColor || COLORS.accentLight;
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
};

// Price Tag
export const PriceTag = ({ price, originalPrice, size = 'md' }) => {
  const priceStyle = size === 'lg' ? FONTS.price : FONTS.priceSmall;
  return (
    <View style={styles.priceRow}>
      <Text style={[priceStyle, { color: COLORS.savings }]}>₹{price}</Text>
      {originalPrice && (
        <Text style={styles.originalPrice}>₹{originalPrice}</Text>
      )}
    </View>
  );
};

// Rating Row
export const RatingRow = ({ rating, reviewCount }) => {
  const { Ionicons } = require('@expo/vector-icons');
  return (
    <View style={styles.ratingRow}>
      <Ionicons name="star" size={14} color={COLORS.warning} />
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      {reviewCount && (
        <Text style={styles.reviewCount}>({reviewCount})</Text>
      )}
    </View>
  );
};

// Section Header
export const SectionHeader = ({ title, subtitle, actionText, onAction }) => {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={FONTS.h3}>{title}</Text>
        {subtitle && <Text style={[FONTS.caption, { marginTop: 2 }]}>{subtitle}</Text>}
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
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  badgeText: {
    ...FONTS.badge,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
  },
  originalPrice: {
    ...FONTS.body,
    color: COLORS.textTertiary,
    textDecorationLine: 'line-through',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  actionText: {
    ...FONTS.captionBold,
    color: COLORS.textAccent,
  },
});
