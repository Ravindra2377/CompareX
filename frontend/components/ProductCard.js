import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";

const formatPrice = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "0";

  const isInt = Math.round(numeric) === numeric;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: isInt ? 0 : 2,
  }).format(numeric);
};

const ProductCard = ({ product, onPress, onCompare }) => {
  const {
    name = "Product",
    brand = "",
    price = 0,
    originalPrice,
    platformCount = 0,
    totalPlatforms = 6,
    discount,
    bestPlatform = "",
  } = product;

  const effectivePrice = Number(price) > 0 ? Number(price) : 0;
  const effectiveOriginalPrice =
    Number(originalPrice) > 0 ? Number(originalPrice) : 0;
  const hasDiscount = discount > 0;
  const hasOriginal =
    effectiveOriginalPrice > effectivePrice && effectivePrice > 0;
  const savingsValue = hasOriginal
    ? Math.max(0, effectiveOriginalPrice - effectivePrice)
    : 0;

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
      onPress={() => onPress?.(product)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
      >
        <LinearGradient
          colors={COLORS.gradientCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBg}
        >
          <View style={styles.content}>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={2}>
                {name}
              </Text>
              {brand ? <Text style={styles.brand}>{brand}</Text> : null}

              <View style={styles.priceRow}>
                <View style={styles.priceBlock}>
                  <Text style={styles.priceLabel}>BEST PRICE</Text>
                  <Text style={styles.price}>
                    ₹{formatPrice(effectivePrice)}
                  </Text>
                </View>

                {hasOriginal ? (
                  <View style={styles.mrpBlock}>
                    <Text style={styles.mrpLabel}>MRP</Text>
                    <Text style={styles.originalPrice}>
                      ₹{formatPrice(effectiveOriginalPrice)}
                    </Text>
                  </View>
                ) : null}

                {savingsValue > 0 ? (
                  <View style={styles.savingsChip}>
                    <Ionicons
                      name="trending-down"
                      size={11}
                      color={COLORS.savings}
                    />
                    <Text style={styles.savingsText}>
                      Save ₹{formatPrice(savingsValue)}
                    </Text>
                  </View>
                ) : null}

                {hasDiscount && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{discount}% OFF</Text>
                  </View>
                )}
              </View>

              <View style={styles.metaRow}>
                <View style={styles.platformPill}>
                  <Ionicons
                    name="layers-outline"
                    size={11}
                    color={COLORS.textTertiary}
                    style={styles.pillIcon}
                  />
                  <Text style={styles.platformText}>
                    {platformCount}/{totalPlatforms} Platforms
                  </Text>
                </View>
                {bestPlatform ? (
                  <View style={[styles.platformPill, styles.bestPill]}>
                    <Ionicons
                      name="star"
                      size={10}
                      color={COLORS.savings}
                      style={styles.pillIcon}
                    />
                    <Text
                      style={[styles.platformText, { color: COLORS.savings }]}
                    >
                      Best on {bestPlatform}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.arrowWrap}>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.textTertiary}
              />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const areEqual = (prevProps, nextProps) => {
  const prevProduct = prevProps.product || {};
  const nextProduct = nextProps.product || {};

  return (
    prevProduct.id === nextProduct.id &&
    prevProduct.name === nextProduct.name &&
    prevProduct.brand === nextProduct.brand &&
    prevProduct.price === nextProduct.price &&
    prevProduct.originalPrice === nextProduct.originalPrice &&
    prevProduct.platformCount === nextProduct.platformCount &&
    prevProduct.totalPlatforms === nextProduct.totalPlatforms &&
    prevProduct.discount === nextProduct.discount &&
    prevProduct.bestPlatform === nextProduct.bestPlatform &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.onCompare === nextProps.onCompare
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
    flexDirection: "row",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    ...FONTS.h3,
    marginBottom: 6,
  },
  brand: {
    ...FONTS.caption,
    color: COLORS.textTertiary,
    marginBottom: SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  priceBlock: {
    marginRight: SPACING.xs,
  },
  priceLabel: {
    ...FONTS.badge,
    color: COLORS.textAccent,
    marginBottom: 2,
  },
  price: {
    ...FONTS.price,
    lineHeight: 30,
  },
  mrpBlock: {
    paddingBottom: 3,
  },
  mrpLabel: {
    ...FONTS.caption,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: COLORS.textTertiary,
  },
  originalPrice: {
    ...FONTS.captionBold,
    textDecorationLine: "line-through",
    color: COLORS.textTertiary,
  },
  savingsChip: {
    backgroundColor: COLORS.savingsLight,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
    paddingHorizontal: SPACING.sm,
    height: 24,
    borderRadius: RADIUS.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  savingsText: {
    ...FONTS.captionBold,
    fontSize: 11,
    color: COLORS.savings,
  },
  discountBadge: {
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.38)",
    paddingHorizontal: 7,
    height: 24,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  discountText: {
    ...FONTS.badge,
    color: COLORS.warning,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  platformPill: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  pillIcon: {
    marginRight: 4,
  },
  bestPill: {
    backgroundColor: COLORS.savingsLight,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  platformText: {
    ...FONTS.caption,
    fontSize: 11,
    fontWeight: "600",
  },
  arrowWrap: {
    marginLeft: SPACING.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

export default React.memo(ProductCard, areEqual);
