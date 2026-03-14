import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ProductCard from "../ProductCard";

// Mock LinearGradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }) => children,
}));

// Mock Ionicons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

describe("ProductCard", () => {
  const mockProduct = {
    id: "1",
    name: "Test Milk",
    brand: "Test Brand",
    price: 35.5,
    originalPrice: 40.0,
    platformCount: 3,
    totalPlatforms: 6,
    discount: 11,
    bestPlatform: "Blinkit",
  };

  it("renders correctly with full product info", () => {
    const { getByText } = render(<ProductCard product={mockProduct} />);

    expect(getByText("Test Milk")).toBeTruthy();
    expect(getByText("Test Brand")).toBeTruthy();
    expect(getByText("₹35.5")).toBeTruthy();
    expect(getByText("₹40")).toBeTruthy();
    expect(getByText("3/6 Platforms")).toBeTruthy();
    expect(getByText("11% OFF")).toBeTruthy();
    expect(getByText("Best on Blinkit")).toBeTruthy();
    expect(getByText("Save ₹4.5")).toBeTruthy();
  });

  it("handles onPress correctly", () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <ProductCard product={mockProduct} onPress={onPressMock} />
    );

    fireEvent.press(getByText("Test Milk"));
    expect(onPressMock).toHaveBeenCalledWith(mockProduct);
  });

  it("formats price correctly for integers", () => {
    const productWithIntPrice = { ...mockProduct, price: 50 };
    const { getByText } = render(<ProductCard product={productWithIntPrice} />);
    expect(getByText("₹50")).toBeTruthy();
  });

  it("shows minimal info when fields are missing", () => {
    const minimalProduct = {
      name: "Simple Item",
      price: 10,
    };
    const { getByText, queryByText } = render(
      <ProductCard product={minimalProduct} />
    );

    expect(getByText("Simple Item")).toBeTruthy();
    expect(getByText("₹10")).toBeTruthy();
    expect(queryByText("MRP")).toBeNull();
    expect(queryByText("Platforms")).toBeNull();
  });
});
