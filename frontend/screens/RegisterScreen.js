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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../context/AuthContext";
import { COLORS, SPACING, RADIUS, FONTS } from "../config/theme";
import { AppButton, SurfaceCard, TextField } from "../components/SharedUI";

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useContext(AuthContext);

  const handleRegister = () => {
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    register(email, password);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={COLORS.gradientHero} style={styles.heroBg} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textOnDark} />
        </TouchableOpacity>

        <Text style={styles.heading}>Create Account</Text>
        <Text style={styles.subtitle}>Join CompareZ and start saving</Text>

        <SurfaceCard style={styles.formCard}>
          <TextField
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            keyboardType="email-address"
            testID="register-email"
          />

          <TextField
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry={!showPassword}
            testID="register-password"
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

          <TextField
            icon="shield-checkmark-outline"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            secureTextEntry={!showPassword}
            testID="register-confirm"
          />

          <AppButton
            label="Create Account"
            onPress={handleRegister}
            icon="person-add-outline"
            style={styles.createBtn}
            testID="register-button"
          />

          <View style={styles.signInRow}>
            <Text style={styles.signInPrompt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()} testID="register-signin-link">
              <Text style={styles.signInLink}>Sign In</Text>
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
    opacity: 0.28,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: SPACING.xxl,
  },
  backBtn: {
    marginBottom: SPACING.xxxl,
  },
  heading: {
    ...FONTS.luxury,
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...FONTS.luxurySub,
    marginBottom: SPACING.xxl,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
  },
  createBtn: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  signInRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signInPrompt: {
    ...FONTS.body,
  },
  signInLink: {
    ...FONTS.bodyBold,
    color: COLORS.textAccent,
  },
});

export default RegisterScreen;
