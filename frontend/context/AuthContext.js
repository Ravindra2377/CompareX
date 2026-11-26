import React, { createContext, useState, useEffect } from "react";
import { Alert } from "react-native";
import axios from "axios";
import { API_URL } from "../config/api";
import { secureStorage } from "../services/secureStorage";
import { platformTokenStorage } from "../services/platformTokenStorage";
import {
  expireSession,
  markSessionActive,
  subscribeToSessionExpiry,
} from "../services/sessionManager";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);

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
      }, { timeout: 15000 });
      const { token, user: userData } = response.data;
      setUserToken(token);
      setUser(userData);
      markSessionActive();
      await secureStorage.setItem("userToken", token);
      await secureStorage.setItem("userData", JSON.stringify(userData || {}));
    } catch (e) {
      console.log("[Auth] Login Error:", {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message
      });
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
          serverError || `Unable to sign in (Error ${statusCode || 'Network'}).`,
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, email, password) => {
    const normalizedName = String(name || "").trim();
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const normalizedPassword = String(password || "");

    if (!normalizedName || !normalizedEmail || !normalizedPassword) {
      Alert.alert("Missing details", "Please enter your name, email and password.");
      return;
    }

    setIsLoading(true);
    console.log(`[Auth] Attempting Register at: ${API_URL}/register`);
    try {
      const response = await axios.post(`${API_URL}/register`, {
        name: normalizedName,
        email: normalizedEmail,
        password: normalizedPassword,
      }, { timeout: 15000 });
      console.log(`[Auth] Register Response:`, response.status);
      const { token, user: userData } = response.data;
      setUserToken(token);
      setUser(userData);
      markSessionActive();
      await secureStorage.setItem("userToken", token);
      await secureStorage.setItem("userData", JSON.stringify(userData || {}));
    } catch (e) {
      console.log("[Auth] Registration Error:", {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message
      });
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
          serverError || `Unable to create account (Error ${statusCode || 'Network'}).`,
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    if (userToken) {
      try {
        await axios.delete(`${API_URL}/accounts`, {
          headers: { Authorization: `Bearer ${userToken}` },
          timeout: 10000,
        });
      } catch (e) {
        console.warn("[Auth] Could not revoke linked sessions:", e?.message);
      }
    }
    setUserToken(null);
    setUser(null);
    await secureStorage.removeItem("userToken");
    await secureStorage.removeItem("userData");
    await platformTokenStorage.clear();
    setIsLoading(false);
  };

  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      const token = await secureStorage.getItem("userToken");
      const userData = await secureStorage.getItem("userData");

      if (token) {
        try {
          await axios.get(`${API_URL}/accounts/status`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 12000,
          });
        } catch (error) {
          if (error?.response?.status === 401) {
            await expireSession("expired");
            setUserToken(null);
            setUser(null);
            setIsLoading(false);
            return;
          }
          // Keep a valid cached session when the backend is merely offline.
        }
      }

      setUserToken(token);
      if (token) markSessionActive();
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (e) {
      console.log("isLoggedIn error:", e?.message || e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    return subscribeToSessionExpiry(() => {
      setUserToken(null);
      setUser(null);
      setIsLoading(false);
      Alert.alert(
        "Session expired",
        "Please sign in again to continue using Beans and connected services.",
      );
    });
  }, []);

  useEffect(() => {
    isLoggedIn();
  }, []);

  return (
    <AuthContext.Provider
      value={{ login, logout, register, isLoading, userToken, user }}
    >
      {children}
    </AuthContext.Provider>
  );
};
