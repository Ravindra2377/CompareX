import "@testing-library/jest-native/extend-expect";

// Mock React Native modules
jest.mock("react-native", () => {
  const React = require("react");
  const RealRN = jest.requireActual("react-native");

  const MockComponent = (name) => {
    return (props) => React.createElement(name, props, props.children);
  };

  return {
    ...RealRN,
    View: MockComponent("View"),
    Text: MockComponent("Text"),
    TextInput: MockComponent("TextInput"),
    ScrollView: MockComponent("ScrollView"),
    FlatList: MockComponent("FlatList"),
    TouchableOpacity: MockComponent("TouchableOpacity"),
    TouchableWithoutFeedback: MockComponent("TouchableWithoutFeedback"),
    Image: MockComponent("Image"),
    Modal: MockComponent("Modal"),
    Button: MockComponent("Button"),
    StatusBar: MockComponent("StatusBar"),
    ActivityIndicator: MockComponent("ActivityIndicator"),
    StyleSheet: { 
      create: (obj) => obj,
      flatten: (obj) => obj 
    },
    Platform: { 
      OS: "ios",
      select: (dict) => dict.ios || dict.default
    },
    Alert: { alert: jest.fn() },
    Dimensions: {
      get: () => ({ width: 375, height: 812 }),
    },
    AsyncStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
  };
});

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

// Global fetch mock
global.fetch = jest.fn();
