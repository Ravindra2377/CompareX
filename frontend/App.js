import React, { useContext } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { COLORS } from "./config/theme";
import { useFonts } from "expo-font";
import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

// Auth Screens
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";

// Main Screens
import HomeScreen from "./screens/HomeScreen";
import DiscoverScreen from "./screens/DiscoverScreen";
import AIResearchScreen from "./screens/AIResearchScreen";
import LibraryScreen from "./screens/LibraryScreen";
import SearchScreen from "./screens/SearchScreen";
import ProductDetailScreen from "./screens/ProductDetailScreen";
import ProfileScreen from "./screens/ProfileScreen";
import WishlistScreen from "./screens/WishlistScreen";
import AccountsScreen from "./screens/AccountsScreen";
import SupportChatScreen from "./screens/SupportChatScreen";
import TermsScreen from "./screens/TermsScreen";
import MealPlannerScreen from "./screens/MealPlannerScreen";
import InAppBrowser from "./components/InAppBrowser";
import CustomTabBar from "./components/CustomTabBar";
import AICopilot from "./components/AICopilot";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const getActiveRouteName = (state) => {
  if (!state?.routes?.length) return "Home";
  let route = state.routes[state.index || 0];
  while (route?.state?.routes?.length) {
    route = route.state.routes[route.state.index || 0];
  }
  return route?.name || "Home";
};

const MainTabs = () => {
  const { themeColors } = useTheme();
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textTertiary,
        tabBarShowLabel: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Shopping" component={SearchScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

import SplashScreen from "./screens/SplashScreen";



const AppNav = () => {
  const { isLoading, userToken } = useContext(AuthContext);
  const { themeColors, isDark } = useTheme();
  const [showSplash, setShowSplash] = React.useState(true);
  const [fontWaitExpired, setFontWaitExpired] = React.useState(false);
  const [activeRouteName, setActiveRouteName] = React.useState("Home");

  const [fontsLoaded, fontError] = useFonts({
    Fraunces: Fraunces_400Regular,
    FrauncesMedium: Fraunces_500Medium,
    FrauncesSemiBold: Fraunces_600SemiBold,
    FrauncesBold: Fraunces_700Bold,
    Inter: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemiBold: Inter_600SemiBold,
    InterBold: Inter_700Bold,
  });

  const fontsReady = fontsLoaded || Boolean(fontError) || fontWaitExpired;

  // Release builds must never be held on the splash by a font-loading failure.
  React.useEffect(() => {
    const safetyTimer = setTimeout(() => {
      console.warn("[App] Startup timeout reached; continuing with available fonts");
      setFontWaitExpired(true);
      setShowSplash(false);
    }, 5000);
    return () => clearTimeout(safetyTimer);
  }, []);

  React.useEffect(() => {
    if (fontError) {
      console.warn("[App] Custom fonts failed to load; using system fallbacks", fontError);
    }
  }, [fontError]);

  // Show splash while it's active or fonts are still loading
  if (showSplash || !fontsReady) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </>
    );
  }

  // After splash is done, wait for auth to finish loading
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ActivityIndicator size="large" color={themeColors.primary || COLORS.primary} />
      </View>
    );
  }

  const customTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      background: themeColors.paper,
      card: themeColors.card,
      text: themeColors.textPrimary,
      border: themeColors.border,
      primary: themeColors.primary,
      notification: themeColors.warning,
    },
  };

  return (
    <NavigationContainer
      theme={customTheme}
      onStateChange={(state) => setActiveRouteName(getActiveRouteName(state))}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={{ flex: 1, backgroundColor: themeColors.paper }}>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
          {userToken !== null ? (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen
                name="AIResearch"
                component={AIResearchScreen}
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="Discover"
                component={DiscoverScreen}
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="Library"
                component={LibraryScreen}
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="Search"
                component={SearchScreen}
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="Shopping"
                component={SearchScreen}
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="Research"
                component={AIResearchScreen}
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="InAppBrowser"
                component={InAppBrowser}
                options={{ animation: "slide_from_bottom" }}
              />
              <Stack.Screen
                name="Accounts"
                component={AccountsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="SupportChat"
                component={SupportChatScreen}
                options={{ animation: "slide_from_right", headerShown: false }}
              />
              <Stack.Screen
                name="Terms"
                component={TermsScreen}
                options={{ animation: "slide_from_right", headerShown: false }}
              />
              <Stack.Screen
                name="MealPlanner"
                component={MealPlannerScreen}
                options={{ animation: "slide_from_bottom", headerShown: false }}
              />
              <Stack.Screen
                name="Likes"
                component={WishlistScreen}
                options={{ animation: "slide_from_right" }}
              />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen
                name="SupportChat"
                component={SupportChatScreen}
                options={{ animation: "slide_from_right", headerShown: false }}
              />
              <Stack.Screen
                name="Terms"
                component={TermsScreen}
                options={{ animation: "slide_from_right", headerShown: false }}
              />
            </>
          )}
        </Stack.Navigator>
        {/* AICopilot must be inside NavigationContainer to use useNavigationState */}
        {userToken !== null && (
          <AICopilot activeRouteName={activeRouteName} />
        )}
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

import { SafeAreaProvider } from "react-native-safe-area-context";

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <WishlistProvider>
            <AppNav />
          </WishlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
