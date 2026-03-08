import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';

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

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  return (
    <TouchableWithoutFeedback 
      onPress={onPress} 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={COLORS.gradientCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBg}
        >
          <View style={styles.content}>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={2}>{name}</Text>
              {brand ? <Text style={styles.brand}>{brand}</Text> : null}

              <View style={styles.priceRow}>
                <Text style={styles.price}>₹{price}</Text>
                {originalPrice > 0 && <Text style={styles.originalPrice}>₹{originalPrice}</Text>}
                {hasDiscount && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{discount}% OFF</Text>
                  </View>
                )}
              </View>

              <View style={styles.metaRow}>
                <View style={styles.platformPill}>
                  <Text style={styles.platformText}>{platformCount}/{totalPlatforms} Platforms</Text>
                </View>
                {bestPlatform ? (
                  <View style={[styles.platformPill, styles.bestPill]}>
                    <Ionicons name="star" size={10} color={COLORS.savings} style={{marginRight: 4}} />
                    <Text style={[styles.platformText, {color: COLORS.savings}]}>Best on {bestPlatform}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.arrowWrap}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  gradientBg: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    ...FONTS.h3,
    marginBottom: 4,
  },
  brand: {
    ...FONTS.caption,
    color: COLORS.textTertiary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  price: {
    ...FONTS.price,
  },
  originalPrice: {
    ...FONTS.caption,
    textDecorationLine: 'line-through',
    color: COLORS.textTertiary,
  },
  discountBadge: {
    backgroundColor: COLORS.savingsLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    marginLeft: SPACING.xs,
  },
  discountText: {
    ...FONTS.badge,
    color: COLORS.savings,
  },
  metaRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  platformPill: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bestPill: {
    backgroundColor: COLORS.savingsLight,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  platformText: {
    ...FONTS.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  arrowWrap: {
    marginLeft: SPACING.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

export default ProductCard;
