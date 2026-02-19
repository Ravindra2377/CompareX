import React, { useContext, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONTS } from '../config/theme';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={styles.logo}>CompareX</Text>
          <Text style={styles.tagline}>Compare grocery prices across 6 platforms</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Sign in</Text>

          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={COLORS.textTertiary} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textTertiary} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={COLORS.textTertiary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => login(email, password)}
            activeOpacity={0.8}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={FONTS.body}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  logoSection: {
    marginBottom: 48,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -1,
    marginBottom: SPACING.xs,
  },
  tagline: {
    ...FONTS.body,
  },
  form: {},
  formTitle: {
    ...FONTS.h2,
    marginBottom: SPACING.xl,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 4,
  },
  signInBtn: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  signInText: {
    ...FONTS.bodyBold,
    color: COLORS.textInverse,
    fontSize: 16,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerLink: {
    ...FONTS.bodyBold,
    color: COLORS.textAccent,
  },
});

export default LoginScreen;
