import React, { useContext } from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { AuthProvider, AuthContext } from "../AuthContext";
import axios from "axios";
import { Text, Button, Platform, Alert } from "react-native";

// Mock axios
jest.mock("axios");

// Setup for web
Platform.OS = "web";
Alert.alert = jest.fn();

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    clear: jest.fn(() => { store = {}; }),
    removeItem: jest.fn(key => { delete store[key]; }),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock SecureStore
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const TestComponent = () => {
  const { login, logout, register, userToken, isLoading } = useContext(AuthContext);
  return (
    <>
      <Text testID="token">{userToken}</Text>
      <Text testID="loading">{isLoading ? "loading" : "idle"}</Text>
      <Button title="Login" onPress={() => login("test@example.com", "password")} testID="login-btn" />
      <Button title="Logout" onPress={() => logout()} testID="logout-btn" />
      <Button title="Register" onPress={() => register("new@example.com", "password")} testID="register-btn" />
    </>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("should initialize with null token", async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId("token").children).toEqual([]);
      expect(getByTestId("loading").props.children).toBe("idle");
    });
  });

  it("should login successfully", async () => {
    axios.post.mockResolvedValueOnce({ data: { token: "fake-jwt-token" } });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.press(getByTestId("login-btn"));

    await waitFor(() => {
      expect(getByTestId("token").props.children).toBe("fake-jwt-token");
      expect(localStorage.getItem("userToken")).toBe("fake-jwt-token");
    });
  });

  it("should logout successfully", async () => {
    localStorage.setItem("userToken", "fake-jwt-token");
    
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state check
    await waitFor(() => {
      expect(getByTestId("token").props.children).toBe("fake-jwt-token");
    });

    fireEvent.press(getByTestId("logout-btn"));

    await waitFor(() => {
      expect(getByTestId("token").children).toEqual([]);
      expect(localStorage.getItem("userToken")).toBeNull();
    });
  });

  it("should handle login failure", async () => {
    axios.post.mockRejectedValueOnce({
      response: { status: 401, data: { error: "Invalid credentials" } }
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.press(getByTestId("login-btn"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Invalid credentials", expect.any(String));
    });
  });

  it("should register successfully", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.press(getByTestId("register-btn"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Registration successful", expect.any(String));
    });
  });
});
