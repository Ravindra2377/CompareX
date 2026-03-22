jest.mock("expo", () => ({ registerRootComponent: jest.fn() }));
jest.mock("@react-navigation/native", () => ({
  NavigationContainer: ({ children }) => children,
  DarkTheme: { colors: {} },
  useFocusEffect: jest.fn(),
}));
jest.mock("@react-navigation/native-stack", () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: () => null,
  }),
}));
jest.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: () => null,
  }),
}));
jest.mock("react-native-webview", () => ({ WebView: "WebView" }));

describe("App bootstrap modules", () => {
  it("App module exports default component", () => {
    const App = require("../App").default;
    expect(App).toBeDefined();
    expect(typeof App).toBe("function");
  });

  it("index module registers root component", () => {
    const expo = require("expo");
    require("../index");
    expect(expo.registerRootComponent).toHaveBeenCalled();
  });

  it("config modules load", () => {
    const jestConfig = require("../jest.config");
    const metroConfig = require("../metro.config");
    expect(jestConfig).toBeDefined();
    expect(metroConfig).toBeDefined();
  });
});
