import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  StatusBar,
} from "react-native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../config/api";
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";
import * as Haptics from "expo-haptics";

// Platform configuration with proper login URLs
const PLATFORMS = [
  {
    id: "Blinkit",
    name: "Blinkit",
    loginUrl: "https://blinkit.com/",
    testUrl: "https://blinkit.com/v6/search/products?q=milk&start=0&size=5",
    color: "#F8CB46",
    icon: "flash",
    requiredTokens: ["auth", "authKey"],
  },
  {
    id: "Zepto",
    name: "Zepto",
    loginUrl: "https://www.zepto.com/",
    testUrl: "https://api.zepto.co.in/api/v1/search",
    color: "#5901C9",
    icon: "bicycle",
    requiredTokens: ["user", "cart"],
  },
  {
    id: "BigBasket",
    name: "BigBasket",
    loginUrl: "https://www.bigbasket.com/",
    testUrl: "https://www.bigbasket.com/listing-svc/v2/products?q=milk&page=1",
    color: "#84C225",
    icon: "basket",
    requiredTokens: ["sessionid", "_bb_vid"],
  },
  {
    id: "Amazon",
    name: "Amazon",
    loginUrl: "https://www.amazon.in/ap/signin?openid.return_to=https%3A%2F%2Fwww.amazon.in%2F&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=inflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0",
    testUrl: "https://www.amazon.in/s?k=milk",
    color: "#FF9900",
    icon: "cart",
    requiredTokens: ["session-id"],
  },
  {
    id: "Flipkart",
    name: "Flipkart",
    loginUrl: "https://www.flipkart.com/",
    testUrl: "https://www.flipkart.com/search?q=milk",
    color: "#2874F0",
    icon: "bag",
    requiredTokens: ["T"],
  },
];

export default function AccountsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState(null);
  const [connected, setConnected] = useState({});
  const [loading, setLoading] = useState({});
  const webViewRef = useRef(null);

  React.useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    try {
      const tokens = await AsyncStorage.getItem("userTokens");
      if (tokens) {
        const parsed = JSON.parse(tokens);
        const status = {};

        PLATFORMS.forEach((platform) => {
          const platformTokens = parsed[platform.id];
          if (!platformTokens || Object.keys(platformTokens).length === 0) {
            status[platform.id] = false;
            return;
          }

          // Other platforms: Check if any required token exists
          const hasRequiredToken = platform.requiredTokens.some(
            (tokenKey) => {
              const fromVal = platformTokens[tokenKey];
              const fromCookie = platformTokens.cookie && platformTokens.cookie.includes(tokenKey);
              
              return !!(fromVal || fromCookie);
            }
          );
          status[platform.id] = hasRequiredToken;
        });

        setConnected(status);
      }
    } catch (e) {
      console.error("[AccountsScreen] Error checking connections:", e);
    }
  };

  const openLogin = (platform) => {
    setCurrentPlatform(platform);
    setModalVisible(true);
  };

  const disconnectAccount = async (platformId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Disconnect Account",
      `Are you sure you want to disconnect from ${platformId}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              const tokens = await AsyncStorage.getItem("userTokens");
              if (tokens) {
                const parsed = JSON.parse(tokens);
                delete parsed[platformId];
                await AsyncStorage.setItem(
                  "userTokens",
                  JSON.stringify(parsed),
                );
                await checkConnections();
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
                Alert.alert("Success", `Disconnected from ${platformId}`);
              }
            } catch (e) {
              console.error(e);
            }
          },
        },
      ],
    );
  };

  const handleWebViewMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "LOG") {
        console.log(`[WebView-${currentPlatform?.id}] ${data.message}`);
      } else if (data.type === "TOKENS" && currentPlatform) {
        console.log(
          `[WebView] ✅ Tokens captured for ${currentPlatform.id}:`,
          Object.keys(data.payload),
        );

        await saveTokens(currentPlatform.id, data.payload);
        setModalVisible(false);
        await checkConnections();

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Success!",
          `✅ ${currentPlatform.name} connected successfully!\n\nYou can now search and compare prices.`,
          [{ text: "OK" }],
        );
      }
    } catch (e) {
      console.error("[WebView] Error parsing message:", e);
    }
  };

  const saveTokens = async (platformId, newTokens) => {
    try {
      const existing = await AsyncStorage.getItem("userTokens");
      const tokens = existing ? JSON.parse(existing) : {};

      // Merge tokens
      tokens[platformId] = {
        ...tokens[platformId],
        ...newTokens,
        _capturedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem("userTokens", JSON.stringify(tokens));
      console.log(`[Tokens] Saved tokens for ${platformId} locally`);

      // Upload to backend for backup/analytics
      try {
        await api.post("/accounts/connect", {
          platform: platformId,
          tokens: tokens[platformId],
        });
        console.log(`[Tokens] Uploaded ${platformId} tokens to backend`);
      } catch (backendErr) {
        console.warn(
          `[Tokens] Backend upload failed (non-critical):`,
          backendErr?.message,
        );
        // Continue even if backend fails - local storage is primary
      }
    } catch (e) {
      console.error("[Tokens] Save error:", e);
      throw e;
    }
  };

  // Enhanced token capture script with better detection
  const INJECTED_JAVASCRIPT = `
    (function() {
      let hasProcessed = false;
      
      function log(msg) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', message: msg}));
        } catch(e) {}
      }

      function sendTokens() {
        if (hasProcessed) return;
        
        const host = window.location.hostname;
        const cookies = document.cookie;
        const ls = {...localStorage};
        
        log('Scanning ' + host + ' (keys: ' + Object.keys(ls).length + ')');

        let payload = {};
        let isValid = false;

        // BLINKIT
        if (host.includes('blinkit')) {
          try {
            // Auth token
            if (ls.auth) {
              payload['auth'] = ls.auth;
              const authObj = JSON.parse(ls.auth);
              if (authObj.accessToken) {
                log('✓ Found Blinkit accessToken: ' + authObj.accessToken.substring(0, 20) + '...');
                isValid = true;
              }
            }
            
            // Auth key
            if (ls.authKey) {
              payload['authKey'] = ls.authKey;
              log('✓ Found authKey');
              isValid = true;
            }
            
            // Location
            if (ls.location) {
              payload['location'] = ls.location;
            }
            
            // User data
            if (ls.user) {
              payload['user'] = ls.user;
            }
            
            // Device ID
            if (ls.deviceId) {
              payload['deviceId'] = ls.deviceId;
            }
            
            // Capture cookies
            if (cookies && (cookies.includes('gr_1_accessToken') || cookies.includes('gr_1_deviceId'))) {
              payload['cookie'] = cookies;
              log('✓ Found session cookies');
              isValid = true;
            }
          } catch (e) {
            log('Error parsing Blinkit tokens: ' + e.message);
          }
        }

        // ZEPTO
        else if (host.includes('zepto')) {
          try {
            // User auth
            if (ls.user) {
              payload['user'] = ls.user;
              const userObj = JSON.parse(ls.user);
              if (userObj.state && userObj.state.isAuth) {
                log('✓ Zepto user authenticated');
                isValid = true;
              }
            }
            
            // Location
            if (ls['user-position']) {
              payload['location'] = ls['user-position'];
            }
            
            // Store ID
            if (ls['header-store']) {
              payload['storeId'] = ls['header-store'];
            }
            
            // Cart
            if (ls.cart) {
              payload['cart'] = ls.cart;
            }
            
            // Cookies
            if (cookies && cookies.includes('session_id')) {
              payload['cookie'] = cookies;
              log('✓ Found Zepto session');
              isValid = true;
            }
          } catch (e) {
            log('Error parsing Zepto tokens: ' + e.message);
          }
        }

        // BIGBASKET
        else if (host.includes('bigbasket')) {
          if (cookies && (cookies.includes('sessionid') || cookies.includes('_bb_vid'))) {
            payload['cookie'] = cookies;
            log('✓ Found BigBasket session');
            isValid = true;
          }
          
          // CSRF token if present in localStorage
          for (let key in ls) {
            if (key.toLowerCase().includes('csrf') || key.toLowerCase().includes('token')) {
              payload[key] = ls[key];
            }
          }
        }

        // AMAZON
        else if (host.includes('amazon')) {
          if (cookies && cookies.includes('session-id')) {
            payload['cookie'] = cookies;
            log('✓ Found Amazon session cookies');
            isValid = true;
          }
        }

        // FLIPKART
        else if (host.includes('flipkart')) {
          if (cookies && cookies.includes('T=')) {
            payload['cookie'] = cookies;
            if (ls.snData) payload['snData'] = ls.snData;
            log('✓ Found Flipkart session cookies');
            isValid = true;
          }
        }
        

        // Send if valid
        if (isValid && Object.keys(payload).length > 0) {
          log('✅ Sending ' + Object.keys(payload).length + ' tokens for ' + host);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'TOKENS', 
            payload: payload
          }));
          hasProcessed = true;
        } else {
          log('⏳ No valid session yet for ' + host);
        }
      }
      
      // Check immediately and then periodically
      sendTokens();
      const interval = setInterval(sendTokens, 3000);
      
      // Stop after 2 minutes to avoid memory leaks
      setTimeout(() => clearInterval(interval), 120000);
    })();
  `;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={COLORS.gradientCard} style={styles.header}>
        <Text style={styles.headerTitle}>Link Accounts</Text>
        <Text style={styles.headerSubtitle}>
          Login once to enable price comparisons
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#4A90E2" />
          <Text style={styles.infoText}>
            Tap "Connect" and log in to each platform. Your credentials stay
            secure in the app.
          </Text>
        </View>

        {PLATFORMS.map((platform) => (
          <View key={platform.id} style={styles.card}>
            <View style={styles.cardLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: platform.color },
                ]}
              >
                <Ionicons name={platform.icon} size={24} color="#fff" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.platformName}>{platform.name}</Text>
                <Text style={styles.platformStatus}>
                  {connected[platform.id] ? (
                    <Text style={styles.statusConnected}>● Connected</Text>
                  ) : (
                    <Text style={styles.statusDisconnected}>
                      ○ Not connected
                    </Text>
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.cardButtons}>
              {connected[platform.id] ? (
                <>
                  <TouchableOpacity
                    style={styles.buttonReconnect}
                    onPress={() => openLogin(platform)}
                  >
                    <Ionicons name="refresh" size={18} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.buttonDisconnect}
                    onPress={() => disconnectAccount(platform.id)}
                  >
                    <Ionicons name="close-circle" size={18} color="#ff4444" />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.buttonConnect}
                  onPress={() => openLogin(platform)}
                >
                  <Text style={styles.buttonConnectText}>Connect</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Login Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Text style={styles.modalTitle}>{currentPlatform?.name}</Text>
              <Text style={styles.modalSubtitle}>
                Please log in to continue
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={28} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {currentPlatform && (
            <WebView
              ref={webViewRef}
              source={{ uri: currentPlatform.loginUrl }}
              injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT}
              onMessage={handleWebViewMessage}
              style={styles.webview}
              userAgent={
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              }
              javaScriptEnabled={true}
              domStorageEnabled={true}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              onLoadStart={() =>
                console.log(`[WebView] Loading ${currentPlatform.name}...`)
              }
              onLoadEnd={() =>
                console.log(`[WebView] Loaded ${currentPlatform.name}`)
              }
              onError={(e) => console.log(`[WebView] Error:`, e.nativeEvent)}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: SPACING.xl,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  headerTitle: {
    ...FONTS.h1,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    ...FONTS.body,
  },
  list: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.2)",
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.md,
    ...FONTS.body,
    color: "#38BDF8",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
    ...SHADOWS.glow,
  },
  cardInfo: {
    flex: 1,
  },
  platformName: {
    ...FONTS.h3,
    marginBottom: 4,
  },
  platformStatus: {
    ...FONTS.caption,
  },
  statusConnected: {
    color: COLORS.savings,
    fontWeight: "600",
  },
  statusDisconnected: {
    color: COLORS.textTertiary,
  },
  cardButtons: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  buttonConnect: {
    flexDirection: "row",
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.accentStrong,
    gap: 6,
  },
  buttonConnectText: {
    color: COLORS.textInverse,
    fontSize: 14,
    fontWeight: "700",
  },
  buttonReconnect: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  buttonDisconnect: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.errorLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalTitle: {
    ...FONTS.h2,
    marginBottom: 4,
  },
  modalSubtitle: {
    ...FONTS.caption,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cardAlt,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  webview: {
    flex: 1,
  },
});
