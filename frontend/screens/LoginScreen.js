import React, { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "../components/Icon";
import { AuthContext } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { COLORS, SPACING, RADIUS, FONTS } from "../config/theme";
import { AppButton, TextField, SurfaceCard } from "../components/SharedUI";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const { themeColors } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.paper }]}>
      <View style={[styles.container, { backgroundColor: themeColors.paper }]}>


      <LinearGradient colors={[themeColors.paper, themeColors.paperDim]} style={styles.heroBg} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <View style={styles.logoSection}>
          <Text style={[FONTS.uiBodyMedium, { color: themeColors.inkSoft, marginBottom: SPACING.sm }]}>Smart Grocery Assistant</Text>
          <Text style={[FONTS.heading, { fontSize: 40, color: themeColors.ink, marginBottom: SPACING.sm }]}>CompareZ</Text>
          <Text style={[FONTS.uiBody, { color: themeColors.inkSoft, fontSize: 16, lineHeight: 24 }]}>
            Compare prices across platforms and buy smarter every day.
          </Text>
        </View>

        <SurfaceCard style={[styles.form, { backgroundColor: themeColors.card }]}>
          <Text style={[FONTS.heading, { fontSize: 24, color: themeColors.ink, marginBottom: SPACING.xl }]}>Sign in</Text>

          <TextField
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            keyboardType="email-address"
            testID="loginEmail"
          />

          <TextField
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry={!showPassword}
            testID="loginPassword"
            rightAccessory={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={themeColors.inkFaint}
                />
              </TouchableOpacity>
            }
          />

          <AppButton
            label="Sign In"
            pill
            onPress={() => login(email, password)}
            icon="arrow-forward"
            style={[styles.signInBtn, { backgroundColor: themeColors.aubergine }]}
            testID="loginBtn"
          />

          <View style={styles.registerRow}>
            <Text style={[FONTS.uiBody, { color: themeColors.inkSoft }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={[FONTS.uiBodyBold, { color: themeColors.aubergine }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </SurfaceCard>
      </KeyboardAvoidingView>
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
    backgroundColor: COLORS.backgroundDark,
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: SPACING.xxl,
  },
  logoSection: {
    marginBottom: SPACING.xxl,
  },
  eyebrow: {
    ...FONTS.eyebrow,
    marginBottom: SPACING.sm,
  },
  logo: {
    ...FONTS.luxury,
    fontSize: 40,         // Normalized (8*5)
    marginBottom: SPACING.sm,
  },
  tagline: {
    ...FONTS.luxurySub,
  },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
  },
  formTitle: {
    ...FONTS.h2,
    marginBottom: SPACING.xl,
  },
  signInBtn: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerPrompt: {
    ...FONTS.body,
  },
  registerLink: {
    ...FONTS.bodyBold,
    color: COLORS.textAccent,
  },
});

export default LoginScreen;
