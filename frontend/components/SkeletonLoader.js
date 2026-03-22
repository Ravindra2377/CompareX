/**
 * SkeletonLoader — Modern skeleton with sweep shimmer (Aurora design).
 */
import React from "react";
import { View, StyleSheet, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, RADIUS } from "../config/theme";

const SHIMMER_DARK = "rgba(100, 116, 139, 0.06)";
const SHIMMER_LIGHT = "rgba(100, 116, 139, 0.12)";

const ShimmerBlock = ({ style, shimmerX }) => {
  const translateX = shimmerX.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View style={[styles.shimmerBase, style]}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}
      >
        <LinearGradient
          colors={[SHIMMER_DARK, SHIMMER_LIGHT, SHIMMER_DARK]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const SkeletonCard = ({ shimmerX }) => (
  <View style={styles.card}>
    <View style={styles.accentBarSkeleton} />
    <View style={styles.content}>
      <View style={styles.info}>
        <ShimmerBlock style={styles.titleLine} shimmerX={shimmerX} />
        <ShimmerBlock style={styles.brandLine} shimmerX={shimmerX} />
        <View style={styles.priceRow}>
          <ShimmerBlock style={styles.priceLine} shimmerX={shimmerX} />
          <ShimmerBlock style={styles.badgeLine} shimmerX={shimmerX} />
        </View>
        <View style={styles.metaRow}>
          <ShimmerBlock style={styles.pill} shimmerX={shimmerX} />
          <ShimmerBlock style={styles.pillWide} shimmerX={shimmerX} />
        </View>
      </View>
      <ShimmerBlock style={styles.circle} shimmerX={shimmerX} />
    </View>
  </View>
);

const SkeletonLoader = ({ count = 4 }) => {
  const shimmerX = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerX, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }),
    ).start();
  }, [shimmerX]);

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} shimmerX={shimmerX} />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  accentBarSkeleton: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: COLORS.border,
    borderTopLeftRadius: RADIUS.lg,
    borderBottomLeftRadius: RADIUS.lg,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingLeft: 20,
  },
  info: { flex: 1 },
  shimmerBase: {
    backgroundColor: SHIMMER_DARK,
    borderRadius: RADIUS.xs,
    overflow: "hidden",
  },
  titleLine: {
    height: 16,
    width: "82%",
    marginBottom: SPACING.sm,
  },
  brandLine: {
    height: 12,
    width: "38%",
    marginBottom: SPACING.md,
  },
  priceRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    alignItems: "center",
  },
  priceLine: {
    height: 26,
    width: 80,
  },
  badgeLine: {
    height: 22,
    width: 64,
    borderRadius: RADIUS.full,
  },
  metaRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  pill: {
    height: 22,
    width: 84,
    borderRadius: RADIUS.full,
  },
  pillWide: {
    height: 22,
    width: 104,
    borderRadius: RADIUS.full,
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginLeft: SPACING.md,
  },
});

export default SkeletonLoader;
