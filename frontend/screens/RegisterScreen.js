import React, { useContext, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONTS } from '../config/theme';

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useContext(AuthContext);

  const handleRegister = () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    register(email, password);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Back */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.heading}>Create Account</Text>
        <Text style={styles.subtitle}>Join CompareX and start saving</Text>

        {/* Email */}
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

        {/* Password */}
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

        {/* Confirm Password */}
        <View style={styles.inputWrap}>
          <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textTertiary} />
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor={COLORS.textTertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
          />
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={handleRegister}
          activeOpacity={0.8}
        >
          <Text style={styles.createBtnText}>Create Account</Text>
        </TouchableOpacity>

        {/* Sign In Link */}
        <View style={styles.signInRow}>
          <Text style={FONTS.body}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.signInLink}>Sign In</Text>
          </TouchableOpacity>
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
  backBtn: {
    marginBottom: SPACING.xxxl,
  },
  heading: {
    ...FONTS.h1,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...FONTS.body,
    marginBottom: SPACING.xxxl,
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
  createBtn: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  createBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.textInverse,
    fontSize: 16,
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signInLink: {
    ...FONTS.bodyBold,
    color: COLORS.textAccent,
  },
});

export default RegisterScreen;
