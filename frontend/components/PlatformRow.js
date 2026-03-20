import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";

const PLATFORM_ICONS = {
  blinkit: "flash-outline",
  zepto: "rocket-outline",
  bigbasket: "basket-outline",
  swiggy: "fast-food-outline",
  zomato: "restaurant-outline",
};

const PlatformRow = ({ platform, isCheapest = false, onOpenStore }) => {
  const {
    name = "Platform",
    price = 0,
    deliveryTime = "",
    deliveryCharge = 0,
    inStock = true,
    image_url: imageURL,
  } = platform;

  const [imageError, setImageError] = useState(false);

  const isAvailable = inStock && price > 0;
  const iconName = PLATFORM_ICONS[name.toLowerCase()] || "storefront-outline";

  if (!isAvailable) {
    return (
      <View style={[styles.row, styles.unavailable]}>
        <Ionicons name={iconName} size={18} color={COLORS.textTertiary} />
        <Text style={[styles.name, { color: COLORS.textTertiary }]}>
          {name}
        </Text>
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
      <View style={styles.imageIconContainer}>
        {imageURL && !imageError ? (
          <Image
            source={{ uri: imageURL }}
            style={styles.platformImage}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <Ionicons
            name={iconName}
            size={20}
            color={isCheapest ? COLORS.savings : COLORS.textSecondary}
          />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        {deliveryTime ? (
          <Text style={styles.delivery}>{deliveryTime}</Text>
        ) : null}
      </View>

      <View style={styles.right}>
        {deliveryCharge === 0 && <Text style={styles.freeTag}>FREE</Text>}
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

const areEqual = (prevProps, nextProps) => {
  const prevPlatform = prevProps.platform || {};
  const nextPlatform = nextProps.platform || {};

  return (
    prevProps.isCheapest === nextProps.isCheapest &&
    prevProps.onOpenStore === nextProps.onOpenStore &&
    prevPlatform.name === nextPlatform.name &&
    prevPlatform.price === nextPlatform.price &&
    prevPlatform.deliveryTime === nextPlatform.deliveryTime &&
    prevPlatform.deliveryCharge === nextPlatform.deliveryCharge &&
    prevPlatform.inStock === nextPlatform.inStock
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: SPACING.md,
  },
  imageIconContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  platformImage: {
    width: "100%",
    height: "100%",
  },
  cheapest: {
    backgroundColor: "rgba(16, 185, 129, 0.08)", // Faint emerald wash
    borderColor: COLORS.savings,
  },
  unavailable: {
    opacity: 0.5,
    backgroundColor: COLORS.background,
  },
  info: {
    flex: 1,
  },
  name: {
    ...FONTS.bodyBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  delivery: {
    ...FONTS.caption,
    fontSize: 12,
  },
  right: {
    alignItems: "flex-end",
  },
  price: {
    ...FONTS.priceSmall,
    fontSize: 18,
  },
  freeTag: {
    ...FONTS.badge,
    color: COLORS.savings,
    marginBottom: 4,
  },
  naText: {
    ...FONTS.caption,
    flex: 1,
    textAlign: "right",
  },
  bestBadge: {
    backgroundColor: COLORS.savings,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginLeft: SPACING.sm,
    ...SHADOWS.glow,
  },
  bestText: {
    ...FONTS.badge,
    color: "#FFFFFF",
  },
});

export default React.memo(PlatformRow, areEqual);
