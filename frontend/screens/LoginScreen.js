import React, { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { COLORS, SPACING, RADIUS, FONTS } from "../config/theme";
import { AppButton, TextField, SurfaceCard } from "../components/SharedUI";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={COLORS.gradientHero} style={styles.heroBg} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <View style={styles.logoSection}>
          <Text style={styles.eyebrow}>Smart Grocery Assistant</Text>
          <Text style={styles.logo}>CompareZ</Text>
          <Text style={styles.tagline}>
            Compare prices across platforms and buy smarter every day.
          </Text>
        </View>

        <SurfaceCard style={styles.form}>
          <Text style={styles.formTitle}>Sign in</Text>

          <TextField
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            keyboardType="email-address"
          />

          <TextField
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry={!showPassword}
            rightAccessory={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={COLORS.textTertiary}
                />
              </TouchableOpacity>
            }
          />

          <AppButton
            label="Sign In"
            onPress={() => login(email, password)}
            icon="arrow-forward"
            style={styles.signInBtn}
          />

          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </SurfaceCard>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
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
