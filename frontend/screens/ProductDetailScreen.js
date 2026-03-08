import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Linking,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PlatformRow from "../components/PlatformRow";
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";
import * as Haptics from 'expo-haptics';

const ProductDetailScreen = ({ route, navigation }) => {
  const { product } = route.params || {};
  const [saved, setSaved] = useState(false);
  
  const heartScale = React.useRef(new Animated.Value(1)).current;

  const toggleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const willSave = !saved;
    setSaved(willSave);
    
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start();
    
    if (willSave) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const rawListings = product?.listings || [];

  const allPlatforms = rawListings.map((listing) => ({
    name: listing.platform,
    price: listing.price || 0,
    deliveryTime: listing.delivery_time || "",
    deliveryCharge: listing.delivery_charge || 0,
    inStock: listing.in_stock !== false && listing.price > 0,
    productUrl: listing.product_url || listing.deep_link || "", // Use product_url from DOM scraper
  }));

  const available = allPlatforms
    .filter((p) => p.inStock && p.price > 0)
    .sort((a, b) => a.price - b.price);
  const unavailable = allPlatforms.filter((p) => !p.inStock || p.price === 0);
  const sorted = [...available, ...unavailable];

  const best = available[0]?.price || 0;
  const worst =
    available.length > 1 ? available[available.length - 1].price : 0;
  const saving = worst > best ? worst - best : 0;

  const handleOpen = (p) => {
    if (p.productUrl) {
      console.log(`[ProductDetail] Opening ${p.name}: ${p.productUrl}`);
      Linking.openURL(p.productUrl).catch((err) => {
        console.error(`[ProductDetail] Failed to open URL:`, err);
        Alert.alert("Cannot Open", "Unable to open this product link");
      });
    } else {
      console.log(`[ProductDetail] No URL for ${p.name}`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compare</Text>
        <TouchableOpacity
          onPress={toggleSave}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={saved ? "heart" : "heart-outline"}
              size={24}
              color={saved ? COLORS.error : COLORS.textSecondary}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product summary */}
        <View style={styles.productSection}>
          <Text style={styles.productName}>{product?.name || "Product"}</Text>
          {product?.brand && (
            <Text style={styles.productBrand}>{product.brand}</Text>
          )}

          <View style={styles.priceRow}>
            {best > 0 && <Text style={styles.bestPrice}>₹{best}</Text>}
            {worst > best && <Text style={styles.worstPrice}>₹{worst}</Text>}
          </View>
        </View>

        {/* Savings */}
        {saving > 0 && (
          <View style={styles.savingsRow}>
            <Ionicons
              name="arrow-down-circle"
              size={18}
              color={COLORS.savings}
            />
            <Text style={styles.savingsText}>
              Save ₹{saving} by choosing {available[0]?.name}
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{available.length}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.textTertiary }]}>
              {unavailable.length}
            </Text>
            <Text style={styles.statLabel}>Unavailable</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.savings }]}>
              {best > 0 ? `₹${best}` : "—"}
            </Text>
            <Text style={styles.statLabel}>Best price</Text>
          </View>
        </View>

        {/* Platforms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Price across {sorted.length} platforms
          </Text>
          {sorted.map((p, i) => (
            <PlatformRow
              key={`${p.name}-${i}`}
              platform={p}
              isCheapest={p.inStock && p.price > 0 && i === 0}
              onOpenStore={() => handleOpen(p)}
            />
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    ...FONTS.h3,
  },
  productSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
  },
  productName: {
    ...FONTS.h1,
    marginBottom: 4,
  },
  productBrand: {
    ...FONTS.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: SPACING.sm,
  },
  bestPrice: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.savings,
  },
  worstPrice: {
    ...FONTS.caption,
    textDecorationLine: "line-through",
  },
  savingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  savingsText: {
    ...FONTS.captionBold,
    color: COLORS.savings,
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.xxl,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    ...FONTS.caption,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },
  section: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...FONTS.captionBold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
});

export default ProductDetailScreen;
