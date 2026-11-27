import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../components/Icon";
import { AuthContext } from "../context/AuthContext";
import { SPACING, RADIUS, FONTS } from "../config/theme";
import { useTheme } from "../context/ThemeContext";
import LocationService from "../services/LocationService";
import LocationPickerModal from "../components/LocationPickerModal";
import BrandHeader from "../components/BrandHeader";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

const MENU = [
  {
    icon: "shield-checkmark-outline",
    label: "Privacy & data sources",
    subtitle: "Data policy & on-device controls",
    color: "coriander",
  },
  {
    icon: "help-circle-outline",
    label: "Help & support",
    subtitle: "FAQ and contact",
    color: "turmeric",
  },
  {
    icon: "document-text-outline",
    label: "Terms & conditions",
    subtitle: "Legal and privacy",
    color: "ink",
  },
];

const ProfileScreen = () => {
  const { user, logout } = useContext(AuthContext);
  const navigation = useNavigation();
  const { themeColors, isDark, toggleTheme } = useTheme();

  const [locationCity, setLocationCity] = useState("");
  const [locationPincode, setLocationPincode] = useState("");
  const [locationEditing, setLocationEditing] = useState(false);

  useEffect(() => {
    LocationService.init().then((loc) => {
      setLocationCity(loc.city || "");
      setLocationPincode(loc.pincode || "");
    });
  }, []);

  const saveLocation = async () => {
    if (!locationPincode || locationPincode.length < 5) {
      Alert.alert("Invalid Pincode", "Please enter a valid pincode.");
      return;
    }
    await LocationService.setLocation({
      latitude: LocationService.getLocation().latitude,
      longitude: LocationService.getLocation().longitude,
      city: locationCity,
      pincode: locationPincode,
    });
    setLocationEditing(false);
    Alert.alert(
      "Location Saved",
      "Your delivery location has been updated. New searches will use this location.",
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { backgroundColor: themeColors.paper }]}>
        <BrandHeader
          city={locationCity}
          pincode={locationPincode}
          onLocationPress={() => setLocationEditing(true)}
          editorial
        />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Section heading */}
          <View style={{ paddingHorizontal: SPACING.xl, paddingTop: 14, marginBottom: 16 }}>
            <Text style={[FONTS.editorialBold, { fontSize: 27, color: themeColors.ink }]}>Your account</Text>
            <Text style={[FONTS.uiBody, { fontSize: 13, color: themeColors.inkSoft, marginTop: 3 }]}>
              Your account, preferences, and connected services.
            </Text>
          </View>

          {/* User identity */}
          <View style={[styles.identityCard, { backgroundColor: themeColors.card, borderColor: themeColors.line }]}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: themeColors.aubergineSoft,
                  borderColor: themeColors.primary,
                },
              ]}
            >
              <Text style={[FONTS.editorialBold, { fontSize: 19, color: themeColors.primary }]}>
                {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.identityName, { color: themeColors.ink }]}>{user?.name || "User"}</Text>
              <Text style={[styles.identityEmail, { color: themeColors.inkSoft }]}>{user?.email || "No email provided"}</Text>
            </View>
          </View>

          {/* Location Settings */}
          <Text style={[styles.groupLabel, { color: themeColors.inkSoft }]}>DELIVERY</Text>
          <TouchableOpacity
            style={[styles.menuItem, styles.locationCard, { backgroundColor: themeColors.card, borderColor: themeColors.line, borderWidth: 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setLocationEditing(true);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.locationIconWrap, { backgroundColor: themeColors.tomatoSoft }]}>
              <Ionicons name="location" size={18} color={themeColors.tomato} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={[FONTS.uiBodyBold, { fontSize: 13.5, color: themeColors.ink }]}>Delivery location</Text>
              <Text style={[FONTS.uiBody, { fontSize: 11.5, color: themeColors.inkSoft, marginTop: 2 }]}>
                {locationCity || "Not set"} • {locationPincode || "—"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.inkFaint} />
          </TouchableOpacity>

          <LocationPickerModal
            visible={locationEditing}
            onClose={() => setLocationEditing(false)}
            onSave={({ city, pincode }) => {
              setLocationCity(city);
              setLocationPincode(pincode);
            }}
          />

          {/* Settings Section */}
          <Text style={[styles.groupLabel, { color: themeColors.inkSoft }]}>SETTINGS & SUPPORT</Text>
          <View style={styles.menuSection}>
            {/* Theme Toggle */}
            <View
              style={[
                styles.menuItem,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.line,
                },
              ]}
            >
              <Ionicons name="moon" size={18} color={themeColors.aubergine} />
              <View style={styles.menuInfo}>
                <Text style={[FONTS.uiBodyBold, { fontSize: 13.5, color: themeColors.ink }]}>Dark mode</Text>
                <Text style={[FONTS.uiBody, { fontSize: 11.5, color: themeColors.inkSoft, marginTop: 2 }]}>Switch app theme</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleTheme(val ? "dark" : "light");
                }}
                trackColor={{ false: themeColors.line, true: themeColors.ink }}
                thumbColor={"#FFF"}
              />
            </View>

            {MENU.map((item, index) => {
              const baseColor = themeColors[item.color] || themeColors.inkSoft;
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    {
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.line,
                    },
                  ]}
                  activeOpacity={0.6}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (item.label.includes("Privacy") || item.label.includes("accounts")) {
                      navigation.navigate("Accounts");
                    } else if (item.label.includes("Help")) {
                      navigation.navigate("SupportChat");
                    } else if (item.label.includes("Terms")) {
                      navigation.navigate("Terms");
                    }
                  }}
                >
                  <Ionicons name={item.icon} size={18} color={baseColor} />
                  <View style={styles.menuInfo}>
                    <Text style={[FONTS.uiBodyBold, { fontSize: 13.5, color: themeColors.ink }]}>{item.label}</Text>
                    <Text style={[FONTS.uiBody, { fontSize: 11.5, color: themeColors.inkSoft, marginTop: 2 }]}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={themeColors.inkFaint} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Logout */}
          <View style={{ marginHorizontal: SPACING.xl }}>
            <TouchableOpacity
              style={[styles.signOutBtn, { borderColor: themeColors.line }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                logout();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color={themeColors.tomato} />
              <Text style={[FONTS.uiBodyBold, { color: themeColors.tomato, fontSize: 14 }]}>Sign out</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  identityCard: {
    marginHorizontal: SPACING.xl,
    marginBottom: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 76,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...FONTS.h2Dark,
    fontSize: 20,
    color: "#FFFFFF",
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  identityName: {
    ...FONTS.editorial,
    fontSize: 18,
    lineHeight: 22,
  },
  identityEmail: {
    ...FONTS.uiBody,
    fontSize: 11.5,
    marginTop: 3,
  },
  userName: {
    ...FONTS.h3,
    marginBottom: 2,
  },
  userEmail: {
    ...FONTS.caption,
  },
  menuSection: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
    gap: 10,
  },
  groupLabel: {
    ...FONTS.uiBodyBold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginHorizontal: SPACING.xl,
    marginBottom: 8,
  },
  locationSection: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  locationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  locationTitle: {
    ...FONTS.bodyBold,
  },
  locationSubtitle: {
    ...FONTS.caption,
    marginTop: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 16,
    minHeight: 68,
    gap: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  locationCard: {
    borderRadius: 999,
    marginHorizontal: SPACING.xl,
    marginBottom: 22,
  },
  menuInfo: {
    flex: 1,
  },
  menuLabel: {
    ...FONTS.bodyBold,
    marginBottom: 2,
  },
  menuSubtitle: {
    ...FONTS.caption,
  },
  signOutBtn: {
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});

export default ProfileScreen;
