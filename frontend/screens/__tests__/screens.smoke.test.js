jest.mock("react-native-webview", () => ({ WebView: "WebView" }));
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

import HomeScreen from "../HomeScreen";
import SearchScreen from "../SearchScreen";
import LoginScreen from "../LoginScreen";
import RegisterScreen from "../RegisterScreen";
import ProfileScreen from "../ProfileScreen";
import AccountsScreen from "../AccountsScreen";
import ProductDetailScreen from "../ProductDetailScreen";
import WishlistScreen from "../WishlistScreen";

describe("Screen module exports", () => {
  it("all screen modules export components", () => {
    expect(HomeScreen).toBeDefined();
    expect(SearchScreen).toBeDefined();
    expect(LoginScreen).toBeDefined();
    expect(RegisterScreen).toBeDefined();
    expect(ProfileScreen).toBeDefined();
    expect(AccountsScreen).toBeDefined();
    expect(ProductDetailScreen).toBeDefined();
    expect(WishlistScreen).toBeDefined();
  });
});
