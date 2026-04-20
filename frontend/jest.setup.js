import "@testing-library/jest-native/extend-expect";

// Mock React Native modules
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  ScrollView: "ScrollView",
  FlatList: "FlatList",
  TouchableOpacity: "TouchableOpacity",
  TouchableWithoutFeedback: "TouchableWithoutFeedback",
  Image: "Image",
  Modal: "Modal",
  Button: "Button",
  StatusBar: "StatusBar",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: { 
    create: (obj) => obj,
    flatten: (obj) => obj 
  },
  Platform: { 
    OS: "ios",
    select: (dict) => dict.ios || dict.default
  },
  Alert: { alert: jest.fn() },
  Animated: {
    Value: class {
      constructor(v) { this.value = v; }
      setValue(v) { this.value = v; }
      interpolate() { return this; }
    },
    timing: () => ({ start: (cb) => cb && cb() }),
    spring: () => ({ start: (cb) => cb && cb() }),
    sequence: () => ({ start: (cb) => cb && cb() }),
    loop: () => ({ start: (cb) => cb && cb() }),
    View: "View",
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
  },
  AsyncStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
}));

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
