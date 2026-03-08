import React
from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/theme';

const SkeletonLoader = () => {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.info}>
          <Animated.View style={[styles.shimmerLine, styles.titleWidth, { opacity }]} />
          <Animated.View style={[styles.shimmerLine, styles.brandWidth, { opacity }]} />
          
          <View style={styles.priceRow}>
            <Animated.View style={[styles.shimmerLine, styles.priceWidth, { opacity }]} />
            <Animated.View style={[styles.shimmerBadge, { opacity }]} />
          </View>

          <View style={styles.metaRow}>
            <Animated.View style={[styles.shimmerPill, { opacity }]} />
            <Animated.View style={[styles.shimmerPill, styles.bestPillWidth, { opacity }]} />
          </View>
        </View>
        <Animated.View style={[styles.shimmerCircle, { opacity }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  shimmerLine: {
    height: 16,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.xs,
    marginBottom: SPACING.sm,
  },
  titleWidth: { width: '85%' },
  brandWidth: { width: '40%', height: 12, marginBottom: SPACING.md },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  priceWidth: { width: '30%', height: 24, marginBottom: 0 },
  shimmerBadge: {
    width: 60,
    height: 20,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.xs,
  },
  metaRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  shimmerPill: {
    width: 80,
    height: 24,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
  },
  bestPillWidth: { width: 110 },
  shimmerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.md,
  },
});

export default SkeletonLoader;
