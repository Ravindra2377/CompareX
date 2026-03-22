import React from "react";
import { View, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../config/theme";
import * as Haptics from "expo-haptics";

const SearchBar = ({
  value,
  onChangeText,
  placeholder = "Search products...",
  onClear,
  autoFocus = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="search" size={18} color={COLORS.primary} />
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        returnKeyType="search"
        autoCorrect={false}
        autoFocus={autoFocus}
        selectionColor={COLORS.primary}
      />
      {value ? (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (onClear) onClear();
          }}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          style={styles.clearBtn}
        >
          <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    minHeight: 52,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
    paddingVertical: 2,
  },
  clearBtn: {
    padding: 4,
  },
});

export default SearchBar;
