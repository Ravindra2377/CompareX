import React, { createContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config/api';

// Platform-aware token storage
const tokenStorage = {
  getItem: async (key) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    const SecureStore = require('expo-secure-store');
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key, value) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    const SecureStore = require('expo-secure-store');
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    const SecureStore = require('expo-secure-store');
    await SecureStore.deleteItemAsync(key);
  },
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });
      const token = response.data.token;
      setUserToken(token);
      await tokenStorage.setItem('userToken', token);
    } catch (e) {
      console.log(`Login error: ${e}`);
      alert('Login failed');
    }
    setIsLoading(false);
  };

  const register = async (email, password) => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/register`, {
        email,
        password,
      });
      alert('Registration successful! Please login.');
    } catch (e) {
      console.log(`Register error: ${e}`);
      alert('Registration failed');
    }
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    setUserToken(null);
    await tokenStorage.removeItem('userToken');
    setIsLoading(false);
  };

  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      let token = await tokenStorage.getItem('userToken');
      setUserToken(token);
    } catch (e) {
      console.log(`isLoggedIn error: ${e}`);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    isLoggedIn();
  }, []);

  return (
    <AuthContext.Provider value={{ login, logout, register, isLoading, userToken }}>
      {children}
    </AuthContext.Provider>
  );
};
