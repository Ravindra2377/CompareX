/**
 * GlassCard — A clean elevated card component.
 *
 * Luxury monochrome design with subtle shadows.
 * Pass `style`, `accentColor` to customize.
 */
import React from "react";
import { View, StyleSheet } from "react-native";
import { COLORS, RADIUS, SHADOWS } from "../config/theme";

const GlassCard = ({
  children,
  style,
  accentColor,
  noPad = false,
}) => {
  return (
    <View style={[styles.wrapper, SHADOWS.sm, style]}>
      {accentColor && (
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      )}
      <View style={[styles.innerContainer, noPad && styles.noPad]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
  },
  innerContainer: {
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
