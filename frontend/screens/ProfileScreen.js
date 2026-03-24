import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";
import LocationService from "../services/LocationService";

const STATS = [
  { label: "Searches", value: "24" },
  { label: "Saved", value: "3" },
  { label: "Savings", value: "₹156" },
];

const MENU = [
  {
    icon: "link-outline",
    label: "Link Accounts",
    subtitle: "Connect Blinkit, Zepto, etc.",
  },
  {
    icon: "notifications-outline",
    label: "Price Alerts",
    subtitle: "3 active alerts",
  },
  {
    icon: "time-outline",
    label: "Search History",
    subtitle: "Recent searches",
  },
  { icon: "settings-outline", label: "Settings", subtitle: "App preferences" },
  {
    icon: "help-circle-outline",
    label: "Help & Support",
    subtitle: "FAQ and contact",
  },
];

import { useNavigation } from "@react-navigation/native";

const ProfileScreen = () => {
  const { logout } = useContext(AuthContext);
  const navigation = useNavigation();
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
    Alert.alert("Location Saved", "Your delivery location has been updated. New searches will use this location.");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={FONTS.h1}>Profile</Text>
        </View>

        {/* User Info */}
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>U</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>User</Text>
            <Text style={styles.userEmail}>user@example.com</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {STATS.map((s, i) => (
            <React.Fragment key={s.label}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              {i < STATS.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Location Settings */}
        <View style={styles.locationSection}>
          <View style={styles.locationHeader}>
            <View style={styles.locationIconWrap}>
              <Ionicons name="location" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationTitle}>Delivery Location</Text>
              <Text style={styles.locationSubtitle}>
                {locationEditing ? "Set your delivery pincode" : `${locationCity || "Not set"} • ${locationPincode || "—"}`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setLocationEditing(!locationEditing)}
              style={styles.locationEditBtn}
            >
              <Ionicons
                name={locationEditing ? "close" : "create-outline"}
                size={18}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>
          {locationEditing && (
            <View style={styles.locationForm}>
              <TextInput
                style={styles.locationInput}
                value={locationCity}
                onChangeText={setLocationCity}
                placeholder="City (e.g. Bengaluru)"
                placeholderTextColor={COLORS.textTertiary}
              />
              <TextInput
                style={styles.locationInput}
                value={locationPincode}
                onChangeText={setLocationPincode}
                placeholder="Pincode (e.g. 560001)"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
                maxLength={6}
                testID="pincodeInput"
              />
              <TouchableOpacity style={styles.locationSaveBtn} onPress={saveLocation} testID="pincodeSaveBtn">
                <Text style={styles.locationSaveTxt}>Save Location</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          {MENU.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              activeOpacity={0.6}
              onPress={() => {
                if (item.label === "Link Accounts") {
                  navigation.navigate("Accounts");
                }
              }}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={COLORS.textSecondary}
              />
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={logout}
          activeOpacity={0.6}
          testID="profileLogoutBtn"
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 64,       // Normalized
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
    gap: SPACING.lg,
  },
  avatar: {
    width: 56,            // Normalized (8*7)
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.glowSoft,
  },
  avatarText: {
    ...FONTS.h2Dark,
    fontSize: 20,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...FONTS.h3,
    marginBottom: 2,
  },
  userEmail: {
    ...FONTS.caption,
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.xxl,
    ...SHADOWS.sm,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    ...FONTS.h2,
    marginBottom: 2,
  },
  statLabel: {
    ...FONTS.caption,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  menuSection: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  locationSection: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  locationIconWrap: {
    width: 40,            // Normalized (8*5)
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accentLight,
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
  locationEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.cardAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  locationForm: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  locationInput: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...FONTS.body,
    color: COLORS.textPrimary,
  },
  locationSaveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    marginTop: SPACING.xs,
  },
  locationSaveTxt: {
    ...FONTS.bodyBold,
    color: "#FFFFFF",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.sm,
    gap: SPACING.lg,
    ...SHADOWS.sm,
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
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    backgroundColor: COLORS.errorLight,
  },
  logoutText: {
    ...FONTS.bodyBold,
    color: COLORS.error,
  },
});

export default ProfileScreen;
