import React, { createContext, useState, useContext, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors } from "../config/theme";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState("system"); // "light", "dark", or "system"
  const [isDark, setIsDark] = useState(systemColorScheme === "dark");

  useEffect(() => {
    // Load saved theme preference
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("appTheme");
        if (savedTheme) {
          setThemeMode(savedTheme);
        }
      } catch (e) {
        console.error("Failed to load theme preference", e);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    if (themeMode === "system") {
      setIsDark(systemColorScheme === "dark");
    } else {
      setIsDark(themeMode === "dark");
    }
  }, [themeMode, systemColorScheme]);

  const toggleTheme = async (mode) => {
    const nextMode = mode || (isDark ? "light" : "dark");
    setThemeMode(nextMode);
    try {
      await AsyncStorage.setItem("appTheme", nextMode);
    } catch (e) {
      console.error("Failed to save theme preference", e);
    }
  };

  const themeColors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ themeColors, isDark, themeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      themeColors: lightColors,
      isDark: false,
      themeMode: "light",
      toggleTheme: () => {},
    };
  }
  return context;
};
