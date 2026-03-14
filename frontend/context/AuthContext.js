import React, { createContext, useState, useEffect } from "react";
import { Platform, Alert } from "react-native";
import axios from "axios";
import { API_URL } from "../config/api";

// Platform-aware token storage
const tokenStorage = {
  getItem: async (key) => {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    const SecureStore = require("expo-secure-store");
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key, value) => {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    const SecureStore = require("expo-secure-store");
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key) => {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    const SecureStore = require("expo-secure-store");
    await SecureStore.deleteItemAsync(key);
  },
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  const login = async (email, password) => {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const normalizedPassword = String(password || "");

    if (!normalizedEmail || !normalizedPassword) {
      Alert.alert("Missing details", "Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/login`, {
        email: normalizedEmail,
        password: normalizedPassword,
      });
      const token = response.data.token;
      setUserToken(token);
      await tokenStorage.setItem("userToken", token);
    } catch (e) {
      const statusCode = e?.response?.status;
      const serverError = e?.response?.data?.error;

      if (statusCode === 401) {
        Alert.alert(
          "Invalid credentials",
          "Email or password is incorrect. If you are new, create an account first.",
        );
      } else {
        Alert.alert(
          "Login failed",
          serverError || "Unable to sign in right now. Please try again.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email, password) => {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const normalizedPassword = String(password || "");

    if (!normalizedEmail || !normalizedPassword) {
      Alert.alert("Missing details", "Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/register`, {
        email: normalizedEmail,
        password: normalizedPassword,
      });
      Alert.alert(
        "Registration successful",
        "Please sign in with your new account.",
      );
    } catch (e) {
      const statusCode = e?.response?.status;
      const serverError = e?.response?.data?.error;

      if (statusCode === 409) {
        Alert.alert(
          "Account exists",
          "This email is already registered. Please sign in instead.",
        );
      } else {
        Alert.alert(
          "Registration failed",
          serverError || "Unable to create account right now.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setUserToken(null);
    await tokenStorage.removeItem("userToken");
    setIsLoading(false);
  };

  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      let token = await tokenStorage.getItem("userToken");
      setUserToken(token);
    } catch (e) {
      console.log("isLoggedIn error:", e?.message || e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    isLoggedIn();
  }, []);

  return (
    <AuthContext.Provider
      value={{ login, logout, register, isLoading, userToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};
