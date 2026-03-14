/**
 * GlassCard — A reusable glassmorphism card component.
 *
 * Uses expo-linear-gradient for a translucent frosted look.
 * Pass `style`, `gradientColors`, or `glowColor` to customize.
 */
import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, RADIUS, SHADOWS } from "../config/theme";

const GlassCard = ({
  children,
  style,
  gradientColors = COLORS.gradientCard,
  glowColor,
  accentColor,
  noPad = false,
}) => {
  return (
    <View
      style={[
        styles.wrapper,
        glowColor ? { shadowColor: glowColor, ...SHADOWS.glow } : SHADOWS.md,
        style,
      ]}
    >
      {accentColor && (
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      )}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, noPad && styles.noPad]}
      >
        {children}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  gradient: {
    padding: 16,
  },
  noPad: {
    padding: 0,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    zIndex: 10,
    borderTopLeftRadius: RADIUS.lg,
    borderBottomLeftRadius: RADIUS.lg,
  },
});

export default GlassCard;
