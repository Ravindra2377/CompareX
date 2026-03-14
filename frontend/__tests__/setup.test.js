/**
 * @fileoverview Test setup verification for Jest
 */

describe("Test Environment Setup", () => {
  it("should have jest globals available", () => {
    expect(jest).toBeDefined();
    expect(jest.fn).toBeDefined();
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
  });

  it("should have testing library setup", () => {
    // This verifies that the jest.setup.js file was loaded
    expect(global.fetch).toBeDefined();
  });

  it("should support async tests", async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(true).toBe(true);
        resolve();
      }, 10);
    });
  });

  it("should properly mock modules", () => {
    // Verify React Native is mocked
    expect(require("react-native").View).toBe("View");
    expect(require("react-native").Text).toBe("Text");
  });
});

describe("Frontend Environment", () => {
  it("should have Node.js environment", () => {
    expect(process).toBeDefined();
    expect(process.env).toBeDefined();
  });

  it("should handle async operations", async () => {
    const promise = Promise.resolve("success");
    const result = await promise;
    expect(result).toBe("success");
  });

  it("should support jest matchers", () => {
    expect(null).toBeNull();
    expect(true).toBeTruthy();
    expect(false).toBeFalsy();
    expect([1, 2, 3]).toHaveLength(3);
    expect({ a: 1 }).toHaveProperty("a");
  });
});
