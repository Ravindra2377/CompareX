import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../config/api";

const PLATFORMS = [
  {
    id: "Blinkit",
    name: "Blinkit",
    url: "https://blinkit.com/login",
    color: "#F8CB46",
  },
  {
    id: "Zepto",
    name: "Zepto",
    url: "https://zeptonow.com/",
    color: "#5901C9",
  },
  {
    id: "BigBasket",
    name: "BigBasket",
    url: "https://www.bigbasket.com/auth/login/",
    color: "#84C225",
  },
  {
    id: "Instamart",
    name: "Instamart",
    url: "https://www.swiggy.com/instamart",
    color: "#FC8019",
  },
];

export default function AccountsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState(null);
  const [connected, setConnected] = useState({});
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
        PLATFORMS.forEach((p) => {
          // Check for specific tokens to ensure valid connection
          const platformTokens = parsed[p.id];
          if (
            platformTokens &&
            (platformTokens.cookie ||
              platformTokens.auth_ticket ||
              platformTokens.token)
          ) {
            status[p.id] = true;
          }
        });
        setConnected(status);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openLogin = (platform) => {
    setCurrentPlatform(platform);
    setModalVisible(true);
  };

  const handleWebViewMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "LOG") {
        console.log(`[WebView Log] ${data.message}`);
      } else if (data.type === "TOKENS" && currentPlatform) {
        console.log(
          `[WebView] ✅ Tokens captured for ${currentPlatform.id}:`,
          data.payload
        );
        console.log(`[WebView] Token keys:`, Object.keys(data.payload));
        await saveTokens(currentPlatform.id, data.payload);
        setModalVisible(false); // Auto close only on success
        checkConnections();
        alert(`✅ ${currentPlatform.name} connected successfully!`);
      }
    } catch (e) {
      console.error("[WebView] Error parsing message:", e);
    }
  };

  const saveTokens = async (platformId, newTokens) => {
    try {
      const existing = await AsyncStorage.getItem("userTokens");
      const tokens = existing ? JSON.parse(existing) : {};
      tokens[platformId] = { ...tokens[platformId], ...newTokens };
      await AsyncStorage.setItem("userTokens", JSON.stringify(tokens));

      // Also upload to backend so /compare can reuse tokens without large headers
      try {
        await api.post("/tokens", tokens);
        console.log(
          "[Tokens] Uploaded tokens to backend for",
          Object.keys(tokens)
        );
      } catch (err) {
        console.log("[Tokens] Upload failed:", err?.message || err);
      }
      // alert(`Connected to ${platformId}!`);
    } catch (e) {
      console.error(e);
    }
  };

  // Stricter Injection Logic
  const INJECTED_JAVASCRIPT = `
    (function() {
      function log(msg) {
         window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', message: msg}));
      }

      function sendTokens() {
        const host = window.location.hostname;
        const cookies = document.cookie;
        const ls = {...localStorage};
        
        log('Scanning ' + host + ' with keys: ' + Object.keys(ls).join(', '));

        let payload = {};
        let isValid = false;

        if (host.includes('blinkit')) {
            // Log valuable keys to inspect content
            log('Blinkit Auth: ' + ls.auth); 
            log('Blinkit Location: ' + ls.location);

            if (ls.auth) payload['auth'] = ls.auth;
            if (ls.authKey) payload['auth_key'] = ls.authKey;
            if (ls.location) payload['location'] = ls.location;
            if (ls.user) payload['user'] = ls.user;
            
            // Allow if any auth-like key is present
            if (payload['auth'] || payload['auth_key']) {
                isValid = true;
            }
        } else if (host.includes('zepto')) {
             // Zepto-specific keys
             if (ls.user) payload['user'] = ls.user;
             if (ls['user-position']) payload['location'] = ls['user-position'];
             if (ls['header-store']) payload['storeId'] = ls['header-store'];
             if (ls.cart) payload['cart'] = ls.cart;
             
             // Check for valid session
             if (ls.user || cookies.includes('_s_i_d')) {
                 isValid = true;
             }
        } else if (host.includes('bigbasket')) {
             if (cookies && (cookies.includes('sessionid') || cookies.includes('_bb_vid'))) {
                 isValid = true;
             }
        } else if (host.includes('swiggy')) { // Instamart
             if (cookies && cookies.includes('_session_tid')) {
                 isValid = true;
             }
        }
        
        // Always capture cookies if valid
        if (isValid) {
            payload['cookie'] = cookies;
            window.ReactNativeWebView.postMessage(JSON.stringify({type: 'TOKENS', payload: payload}));
            log('Tokens sent for ' + host);
        } else {
           // log('No valid tokens found for ' + host);
        }
      }
      
      setInterval(sendTokens, 2000);
    })();
  `;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1a1a1a", "#000"]} style={styles.header}>
        <Text style={styles.headerTitle}>Link Accounts</Text>
        <Text style={styles.headerSubtitle}>Login to bypass bot detection</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.list}>
        {PLATFORMS.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardInfo}>
              <View style={[styles.icon, { backgroundColor: p.color }]}>
                <Text style={styles.iconText}>{p.name[0]}</Text>
              </View>
              <Text style={styles.cardTitle}>{p.name}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.button,
                connected[p.id] ? styles.buttonConnected : styles.buttonConnect,
              ]}
              onPress={() => openLogin(p)}
            >
              <Text style={styles.buttonText}>
                {connected[p.id] ? "Connected" : "Connect"}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Login to {currentPlatform?.name}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          {currentPlatform && (
            <WebView
              ref={webViewRef}
              source={{ uri: currentPlatform.url }}
              injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT}
              onMessage={handleWebViewMessage}
              style={{ flex: 1 }}
              userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              incognito={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onLoadEnd={() => console.log("[WebView] Load End")}
              onError={(e) => console.log("[WebView] Error: ", e.nativeEvent)}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { padding: 20, paddingTop: 60, paddingBottom: 30 },
  headerTitle: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 14, color: "#aaa", marginTop: 5 },
  list: { padding: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  cardInfo: { flexDirection: "row", alignItems: "center" },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  iconText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  button: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  buttonConnect: { backgroundColor: "#333" },
  buttonConnected: { backgroundColor: "#4CAF50" },
  buttonText: { color: "#fff", fontWeight: "600" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
});
