import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions, Image, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../config/theme";

const { width, height } = Dimensions.get("window");

const SplashScreen = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false, // Layout properties (width) don't support native driver
      }),
    ]).start();

    // Give it some time to breathe then finish
    const timer = setTimeout(() => {
      onFinish && onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#FFFFFF", "#F9FAFB", "#F3F4F6"]}
        style={styles.background}
      />
      
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim }
            ],
          },
        ]}
      >
        <Image
          source={require("../assets/icon_new.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <View style={styles.loaderContainer}>
          <View style={styles.loaderBar}>
            <Animated.View 
              style={[
                styles.loaderProgress,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  })
                }
              ]} 
            />
          </View>
          <Text style={styles.loadingText}>Initializing CompareZ...</Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Secure • Fast • Smart</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: width * 0.6,
    height: width * 0.6,
  },
  loaderContainer: {
    marginTop: 40,
    width: width * 0.5,
    alignItems: "center",
  },
  loaderBar: {
    width: "100%",
    height: 3,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  loaderProgress: {
    height: "100%",
    backgroundColor: "#C026D3", // Pink from logo
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  footer: {
    position: "absolute",
    bottom: 50,
  },
  footerText: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});

export default SplashScreen;
