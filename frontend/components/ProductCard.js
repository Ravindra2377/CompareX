import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS } from '../config/theme';

const ProductCard = ({ product, onPress, onCompare }) => {
  const {
    name = 'Product',
    brand = '',
    price = 0,
    originalPrice,
    platformCount = 0,
    totalPlatforms = 6,
    discount,
    bestPlatform = '',
  } = product;

  const hasDiscount = discount > 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.content}>
        {/* Left: Product info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{name}</Text>
          {brand ? <Text style={styles.brand}>{brand}</Text> : null}

          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{price}</Text>
            {originalPrice && <Text style={styles.originalPrice}>₹{originalPrice}</Text>}
            {hasDiscount && <Text style={styles.discount}>{discount}% off</Text>}
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {platformCount}/{totalPlatforms} platforms
            </Text>
            {bestPlatform ? (
              <Text style={styles.metaText}>· Best on {bestPlatform}</Text>
            ) : null}
          </View>
        </View>

        {/* Right: Arrow */}
        <View style={styles.arrowWrap}>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    ...FONTS.bodyBold,
    fontSize: 16,
    marginBottom: 2,
  },
  brand: {
    ...FONTS.caption,
    marginBottom: SPACING.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  price: {
    ...FONTS.price,
    fontSize: 18,
    color: COLORS.savings,
  },
  originalPrice: {
    ...FONTS.caption,
    textDecorationLine: 'line-through',
    fontSize: 14,
  },
  discount: {
    ...FONTS.caption,
    color: COLORS.savings,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  metaText: {
    ...FONTS.caption,
  },
  arrowWrap: {
    marginLeft: SPACING.md,
  },
});

export default ProductCard;
