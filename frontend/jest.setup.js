global.__DEV__ = true;
process.env.EXPO_OS = "ios";

if (!globalThis.expo) {
  globalThis.expo = {
    EventEmitter: class EventEmitter {
      addListener() { return { remove: () => {} }; }
      removeListener() {}
      emit() {}
    },
    modules: {},
  };
}

require("react-native/jest/setup");
require("@testing-library/jest-native/extend-expect");

jest.mock("expo-font", () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
  loadAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 12.9716, longitude: 77.5946 },
  }),
  reverseGeocodeAsync: jest.fn().mockResolvedValue([
    { city: "Bengaluru", postalCode: "560034", formattedAddress: "Bengaluru, Karnataka 560034" },
  ]),
}));

jest.mock("expo-asset", () => ({
  Asset: {
    loadAsync: jest.fn().mockResolvedValue([]),
    fromModule: jest.fn(() => ({ uri: "test-uri" })),
  },
}));

jest.mock("expo-audio", () => ({
  useAudioRecorder: () => ({
    isRecording: false,
    record: jest.fn(),
    stop: jest.fn(),
  }),
  AudioModule: {
    requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  },
  RecordingPresets: {
    HIGH_QUALITY: {},
  },
}));

// Standard React Native mocks are provided by react-native/jest/setup above

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock(
  "expo-constants",
  () => ({
    expoConfig: {},
  }),
  { virtual: true },
);

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
  NavigationContainer: ({ children }) => children,
  DarkTheme: { colors: {} },
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

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
    Heavy: "heavy",
  },
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
}));

jest.mock("expo-blur", () => ({
  BlurView: "BlurView",
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("react-native-svg", () => {
  const React = require("react");
  const MockSvg = (props) => React.createElement("Svg", props, props.children);
  const MockComponent = (name) => (props) => React.createElement(name, props, props.children);
  return {
    __esModule: true,
    default: MockSvg,
    Svg: MockSvg,
    Path: MockComponent("Path"),
    Circle: MockComponent("Circle"),
    Line: MockComponent("Line"),
    Polyline: MockComponent("Polyline"),
    Polygon: MockComponent("Polygon"),
    Rect: MockComponent("Rect"),
    G: MockComponent("G"),
    Text: MockComponent("Text"),
    Defs: MockComponent("Defs"),
    LinearGradient: MockComponent("LinearGradient"),
    Stop: MockComponent("Stop"),
    ClipPath: MockComponent("ClipPath"),
  };
});

jest.mock("expo-image", () => {
  const React = require("react");
  return {
    Image: (props) => React.createElement("Image", props, props.children),
  };
});

jest.mock("expo-status-bar", () => {
  const React = require("react");
  return {
    StatusBar: (props) => React.createElement("StatusBar", props, null),
  };
});

// Global fetch mock
global.fetch = jest.fn();
