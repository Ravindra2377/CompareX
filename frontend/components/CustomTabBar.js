import React, { useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { COLORS, SHADOWS, RADIUS, SPACING } from "../config/theme";

import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const scaleAnims = useRef(state.routes.map(() => new Animated.Value(1))).current;

  // Calculate safe bottom padding. On Android with navigation buttons, bottomInset is often 0, 
  // so we need a healthy base margin. On gesture-based nav, bottomInset provides the extra space.
  const containerBottom = Math.max(bottomInset, 8) + 8;

  return (
    <View style={[styles.container, { bottom: containerBottom }]}>
      <View style={styles.floatingBar}>
        {/* Glassmorphism Background */}
        <View style={styles.blurContainer}>
          <BlurView intensity={85} tint="light" style={StyleSheet.absoluteFill} />
        </View>

        <View style={styles.content}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const animatedScale = scaleAnims[index];

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

              // Scale animation: 0.92 then bounce back
              Animated.sequence([
                Animated.spring(animatedScale, {
                  toValue: 0.92,
                  useNativeDriver: true,
                  bounciness: 0,
                }),
                Animated.spring(animatedScale, {
                  toValue: 1,
                  useNativeDriver: true,
                  friction: 4,
                  tension: 40,
                }),
              ]).start();

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            // Custom Icon Logic
            const renderIcon = () => {
              let iconName = "";

              switch (route.name) {
                case "Home": iconName = isFocused ? "home" : "home-outline"; break;
                case "Search": iconName = isFocused ? "search" : "search-outline"; break;
                case "Wishlist": iconName = isFocused ? "heart" : "heart-outline"; break;
                case "Profile": iconName = isFocused ? "person" : "person-outline"; break;
              }

              return (
                <View style={styles.tabItem}>
                  <View style={styles.iconWrapper}>
                    <Ionicons
                      name={iconName}
                      size={24}
                      color={isFocused ? COLORS.primary : "#A0A0A0"}
                    />
                  </View>
                </View>
              );
            };

            return (
              <TouchableOpacity
                key={index}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                style={styles.tab}
                activeOpacity={1}
              >
                <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
                  {renderIcon()}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  floatingBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.90)",
    borderRadius: 35,
    height: 70,
    width: "100%",
    ...SHADOWS.navbar,
    borderWidth: 1,
    borderTopWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderTopColor: "rgba(255, 255, 255, 0.8)", // Reflection effect
    overflow: "visible",
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 35,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default CustomTabBar;
