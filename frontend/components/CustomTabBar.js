import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  LayoutAnimation,
} from "react-native";
import { Ionicons } from "../components/Icon";
import LiquidGlass from "./LiquidGlass";
import * as Haptics from "expo-haptics";
import { TabActions } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";

import { useSafeAreaInsets } from "react-native-safe-area-context";

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { themeColors } = useTheme();
  const [barWidth, setBarWidth] = useState(0);
  const [lensOffset, setLensOffset] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const swipeInProgress = useRef(false);
  const scaleAnims = useRef(
    state.routes.map(() => new Animated.Value(1)),
  ).current;

  // Calculate safe bottom padding. On Android with navigation buttons, bottomInset is often 0,
  // so we need a healthy base margin. On gesture-based nav, bottomInset provides the extra space.
  const containerBottom = Math.max(bottomInset, 8) + 8;
  const horizontalInset = 8;
  const tabWidth =
    barWidth > 0
      ? (barWidth - horizontalInset * 2) / state.routes.length
      : 0;

  const moveLensTo = (index, animated = true) => {
    if (!tabWidth) return;
    if (animated && !reduceMotion) {
      LayoutAnimation.configureNext({
        duration: 190,
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
      });
    }
    setLensOffset(horizontalInset + index * tabWidth);
  };

  useEffect(() => {
    moveLensTo(state.index);
  }, [state.index, tabWidth]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener?.(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription?.remove?.();
  }, []);

  const swipeResponder = useMemo(
    () => {
      const wantsHorizontalSwipe = (gesture) =>
        Math.abs(gesture.dx) > 9 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35;

      const finishSwipe = () => {
        setTimeout(() => {
          swipeInProgress.current = false;
        }, 80);
      };

      return (
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          wantsHorizontalSwipe(gesture),
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          wantsHorizontalSwipe(gesture),
        onPanResponderGrant: () => {
          swipeInProgress.current = true;
        },
        onPanResponderMove: (_, gesture) => {
          if (!tabWidth) return;
          const minimum = horizontalInset;
          const maximum =
            horizontalInset + (state.routes.length - 1) * tabWidth;
          const current = horizontalInset + state.index * tabWidth;
          setLensOffset(
            Math.min(Math.max(current + gesture.dx, minimum), maximum),
          );
        },
        onPanResponderRelease: (_, gesture) => {
          const currentPosition = horizontalInset + state.index * tabWidth;
          const releasedPosition = currentPosition + gesture.dx;
          let nextIndex = Math.round(
            (releasedPosition - horizontalInset) / tabWidth,
          );
          nextIndex = Math.min(
            Math.max(nextIndex, 0),
            state.routes.length - 1,
          );

          // A deliberate short flick should still advance one tab even when
          // the finger did not cross the next lens midpoint.
          if (
            nextIndex === state.index &&
            (Math.abs(gesture.dx) > 16 || Math.abs(gesture.vx) > 0.35)
          ) {
            nextIndex = Math.min(
              Math.max(state.index + (gesture.dx < 0 ? 1 : -1), 0),
              state.routes.length - 1,
            );
          }

          if (nextIndex === state.index) {
            moveLensTo(state.index);
            finishSwipe();
            return;
          }

          const route = state.routes[nextIndex];
          moveLensTo(nextIndex);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.dispatch(TabActions.jumpTo(route.name));
          finishSwipe();
        },
        onPanResponderTerminate: () => {
          moveLensTo(state.index);
          finishSwipe();
        },
      })
      );
    },
    [navigation, reduceMotion, state.index, state.routes, tabWidth],
  );

  return (
    <View style={[styles.container, { bottom: containerBottom }]}>
      <View style={styles.gestureSurface} {...swipeResponder.panHandlers}>
        <LiquidGlass
          neutral
          radius={34}
          intensity={100}
          style={[styles.floatingBar, { shadowColor: themeColors.ink }]}
          contentStyle={styles.content}
        >
          <View
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
          />
          {tabWidth > 0 ? (
            <View
              pointerEvents="none"
              style={[
                styles.selectionLens,
                {
                  width: tabWidth,
                  borderColor: `${themeColors.primary}30`,
                  backgroundColor: `${themeColors.primary}18`,
                  shadowColor: themeColors.primary,
                  transform: [{ translateX: lensOffset }],
                },
              ]}
            />
          ) : null}
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const animatedScale = scaleAnims[index];
            const accessibilityLabel =
              route.name === "MealPlanner"
                ? "Meal Cart"
                : route.name === "Likes"
                  ? "Wishlist"
                  : route.name === "Research"
                    ? "AI Research"
                    : route.name === "Shopping"
                      ? "Shopping"
                      : route.name;

            const onPress = () => {
              if (swipeInProgress.current) return;

              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

              if (!reduceMotion) {
                Animated.sequence([
                  Animated.spring(animatedScale, {
                    toValue: 0.96,
                    useNativeDriver: true,
                    bounciness: 0,
                  }),
                  Animated.spring(animatedScale, {
                    toValue: 1,
                    useNativeDriver: true,
                    friction: 6,
                    tension: 46,
                  }),
                ]).start();
              }

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            // Custom Icon Logic
            const renderIcon = () => {
              let iconName = "";

              switch (route.name) {
                case "Home":
                  iconName = isFocused
                    ? "comparez-home-active"
                    : "comparez-home";
                  break;
                case "Discover":
                  iconName = isFocused ? "compass" : "compass-outline";
                  break;
                case "Shopping":
                case "Search":
                  iconName = isFocused ? "cart" : "cart-outline";
                  break;
                case "Research":
                  iconName = isFocused ? "chatbubbles" : "chatbubbles-outline";
                  break;
                case "Library":
                  iconName = isFocused ? "library" : "library-outline";
                  break;
                case "MealPlanner":
                  iconName = "comparez-meal-cart";
                  break;
                case "Search":
                  iconName = "comparez-search";
                  break;
                case "Deals":
                  iconName = isFocused ? "pricetags" : "pricetags-outline";
                  break;
                case "Likes":
                  iconName = "comparez-wishlist";
                  break;
                case "Profile":
                  iconName = isFocused ? "person" : "person-outline";
                  break;
              }

              return (
                <View style={styles.tabItem}>
                  <Ionicons
                    name={iconName}
                    size={26}
                    color={
                      isFocused ? themeColors.primary : themeColors.inkSoft
                    }
                  />
                </View>
              );
            };

            return (
              <TouchableOpacity
                key={index}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                style={styles.tab}
                activeOpacity={1}
              >
                <Animated.View
                  style={{ transform: [{ scale: animatedScale }] }}
                >
                  {renderIcon()}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </LiquidGlass>
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
    borderRadius: 34,
    height: 66,
    width: "100%",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 26,
    elevation: 10,
    overflow: "visible",
  },
  gestureSurface: {
    width: "100%",
    height: 66,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  selectionLens: {
    position: "absolute",
    left: 0,
    top: 6,
    height: 54,
    borderRadius: 24,
    borderWidth: 1,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 54,
    borderRadius: 24,
  },
});

export default CustomTabBar;
