import React, { useContext } from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { AuthProvider, AuthContext } from "../AuthContext";
import axios from "axios";
import { Text, Button, Platform, Alert } from "react-native";

// Mock axios
jest.mock("axios", () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  instance.create = jest.fn(() => instance);
  instance.default = instance;
  return instance;
});

let mockStorageData = {};
jest.mock("../../services/secureStorage", () => ({
  secureStorage: {
    getItem: jest.fn(async (key) => mockStorageData[key] || null),
    setItem: jest.fn(async (key, val) => { mockStorageData[key] = val; }),
    removeItem: jest.fn(async (key) => { delete mockStorageData[key]; }),
  },
}));

Alert.alert = jest.fn();

const TestComponent = () => {
  const { login, logout, register, userToken, isLoading } = useContext(AuthContext);
  return (
    <>
      <Text testID="token">{userToken}</Text>
      <Text testID="loading">{isLoading ? "loading" : "idle"}</Text>
      <Button title="Login" onPress={() => login("test@example.com", "password")} testID="login-btn" />
      <Button title="Logout" onPress={() => logout()} testID="logout-btn" />
      <Button title="Register" onPress={() => register("Test User", "new@example.com", "password")} testID="register-btn" />
    </>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageData = {};
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
    axios.post.mockResolvedValueOnce({
      data: { token: "fake-jwt-token", user: { id: "1", name: "Test" } },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId("loading").props.children).toBe("idle");
    });

    fireEvent.press(getByTestId("login-btn"));

    await waitFor(() => {
      expect(getByTestId("token").props.children).toBe("fake-jwt-token");
      expect(mockStorageData["userToken"]).toBe("fake-jwt-token");
    });
  });

  it("should logout successfully", async () => {
    mockStorageData["userToken"] = "fake-jwt-token";
    
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
      expect(mockStorageData["userToken"]).toBeUndefined();
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

    await waitFor(() => {
      expect(getByTestId("loading").props.children).toBe("idle");
    });

    fireEvent.press(getByTestId("login-btn"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Invalid credentials", expect.any(String));
    });
  });

  it("should register successfully", async () => {
    axios.post.mockResolvedValueOnce({
      data: { token: "new-jwt-token", user: { id: "1", name: "Test User" } },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId("loading").props.children).toBe("idle");
    });

    fireEvent.press(getByTestId("register-btn"));

    await waitFor(() => {
      expect(getByTestId("token").props.children).toBe("new-jwt-token");
      expect(mockStorageData["userToken"]).toBe("new-jwt-token");
    });
  });
});
