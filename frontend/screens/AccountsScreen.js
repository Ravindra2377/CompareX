import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../config/api";

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
            (tokenKey) =>
              platformTokens[tokenKey] ||
              (platformTokens.cookie &&
                platformTokens.cookie.includes(tokenKey)),
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
      <LinearGradient colors={["#1a1a1a", "#000"]} style={styles.header}>
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
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {currentPlatform && (
            <WebView
              ref={webViewRef}
              source={{ uri: currentPlatform.loginUrl }}
              injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT}
              onMessage={handleWebViewMessage}
              style={styles.webview}
              userAgent={"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
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
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#ccc",
  },
  list: {
    padding: 16,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: "#1976D2",
    lineHeight: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  platformName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  platformStatus: {
    fontSize: 14,
  },
  statusConnected: {
    color: "#4CAF50",
    fontWeight: "500",
  },
  statusDisconnected: {
    color: "#999",
  },
  cardButtons: {
    flexDirection: "row",
    gap: 8,
  },
  buttonConnect: {
    flexDirection: "row",
    backgroundColor: "#4A90E2",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    gap: 6,
  },
  buttonConnectText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonReconnect: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisconnect: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffebee",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  webview: {
    flex: 1,
  },
});
