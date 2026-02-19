import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS } from '../config/theme';

const PLATFORM_ICONS = {
  blinkit: 'flash-outline',
  zepto: 'rocket-outline',
  bigbasket: 'basket-outline',
  instamart: 'storefront-outline',
  swiggy: 'fast-food-outline',
  zomato: 'restaurant-outline',
};

const PlatformRow = ({ platform, isCheapest = false, onOpenStore }) => {
  const {
    name = 'Platform',
    price = 0,
    deliveryTime = '',
    deliveryCharge = 0,
    inStock = true,
  } = platform;

  const isAvailable = inStock && price > 0;
  const icon = PLATFORM_ICONS[name.toLowerCase()] || 'storefront-outline';

  if (!isAvailable) {
    return (
      <View style={[styles.row, styles.unavailable]}>
        <Ionicons name={icon} size={18} color={COLORS.textTertiary} />
        <Text style={[styles.name, { color: COLORS.textTertiary }]}>{name}</Text>
        <Text style={styles.naText}>N/A</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.row, isCheapest && styles.cheapest]}
      onPress={onOpenStore}
      activeOpacity={0.6}
    >
      <Ionicons name={icon} size={18} color={isCheapest ? COLORS.savings : COLORS.textSecondary} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        {deliveryTime ? <Text style={styles.delivery}>{deliveryTime}</Text> : null}
      </View>

      <View style={styles.right}>
        {deliveryCharge === 0 && (
          <Text style={styles.freeTag}>FREE</Text>
        )}
        <Text style={[styles.price, isCheapest && { color: COLORS.savings }]}>
          ₹{price}
        </Text>
      </View>

      {isCheapest && (
        <View style={styles.bestBadge}>
          <Text style={styles.bestText}>BEST</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: SPACING.md,
  },
  cheapest: {
    backgroundColor: COLORS.savingsLight,
    borderRadius: RADIUS.md,
    borderBottomWidth: 0,
    marginBottom: SPACING.xs,
  },
  unavailable: {
    opacity: 0.5,
  },
  info: {
    flex: 1,
  },
  name: {
    ...FONTS.bodyBold,
    fontSize: 14,
  },
  delivery: {
    ...FONTS.caption,
    fontSize: 12,
  },
  right: {
    alignItems: 'flex-end',
  },
  price: {
    ...FONTS.priceSmall,
  },
  freeTag: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.savings,
    marginBottom: 2,
  },
  naText: {
    ...FONTS.caption,
    flex: 1,
    textAlign: 'right',
  },
  bestBadge: {
    backgroundColor: COLORS.savings,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    marginLeft: SPACING.xs,
  },
  bestText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default PlatformRow;
