import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { COLORS, SPACING, RADIUS, FONTS } from "../config/theme";

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

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
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
    gap: SPACING.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...FONTS.h2,
    color: COLORS.textSecondary,
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
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cardAlt,
    marginBottom: SPACING.xxl,
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
    backgroundColor: COLORS.divider,
  },
  menuSection: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cardAlt,
    marginBottom: SPACING.sm,
    gap: SPACING.lg,
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
    borderWidth: 1,
    borderColor: COLORS.errorLight,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.errorLight,
  },
  logoutText: {
    ...FONTS.bodyBold,
    color: COLORS.error,
  },
});

export default ProfileScreen;
