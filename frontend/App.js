import React, { useContext } from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import { View, ActivityIndicator } from "react-native";
import { COLORS } from "./config/theme";

// Auth Screens
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";

// Main Screens
import HomeScreen from "./screens/HomeScreen";
import SearchScreen from "./screens/SearchScreen";
import ProductDetailScreen from "./screens/ProductDetailScreen";
import WishlistScreen from "./screens/WishlistScreen";
import ProfileScreen from "./screens/ProfileScreen";
import AccountsScreen from "./screens/AccountsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: { active: "home", inactive: "home-outline" },
  Search: { active: "search", inactive: "search-outline" },
  Wishlist: { active: "heart", inactive: "heart-outline" },
  Profile: { active: "person", inactive: "person-outline" },
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        const iconName = focused
          ? TAB_ICONS[route.name].active
          : TAB_ICONS[route.name].inactive;
        return <Ionicons name={iconName} size={24} color={color} />;
      },
      tabBarActiveTintColor: COLORS.accent,
      tabBarInactiveTintColor: COLORS.textTertiary,
      tabBarStyle: {
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        elevation: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.24,
        shadowRadius: 14,
        height: 82,
        paddingTop: 8,
        paddingBottom: 24,
        position: "absolute",
      },

      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: "600",
      },
      tabBarShowLabel: false,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Search" component={SearchScreen} />
    <Tab.Screen name="Wishlist" component={WishlistScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const AppNav = () => {
  const { isLoading, userToken } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const customTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: COLORS.background,
      card: COLORS.surface,
      text: COLORS.textPrimary,
      border: COLORS.border,
      primary: COLORS.accent,
      notification: COLORS.warning,
    },
  };

  return (
    <NavigationContainer theme={customTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken !== null ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="ProductDetail"
              component={ProductDetailScreen}
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="Accounts"
              component={AccountsScreen}
              options={{
                headerShown: true,
                title: "Link Accounts",
                headerStyle: { backgroundColor: COLORS.surface },
                headerTintColor: COLORS.textPrimary,
                headerShadowVisible: false,
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppNav />
    </AuthProvider>
  );
}
