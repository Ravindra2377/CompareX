import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";
import LocationService from "../services/LocationService";
import * as Haptics from "expo-haptics";

const InAppBrowser = ({ navigation, route }) => {
  const { url, title, platform } = route.params || {};
  const webViewRef = useRef(null);
  const insets = useSafeAreaInsets();

  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url || "about:blank");
  const [pageTitle, setPageTitle] = useState(title || "");
  const [loading, setLoading] = useState(true);

  const handleNavigationStateChange = useCallback((navState) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url || "");
    setPageTitle(navState.title || "");
  }, []);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: currentUrl,
        title: pageTitle,
      });
    } catch (e) {
      console.warn("[InAppBrowser] Share error:", e);
    }
  }, [currentUrl, pageTitle]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  }, [navigation]);

  const handleGoBack = useCallback(() => {
    if (canGoBack) {
      webViewRef.current?.goBack();
    }
  }, [canGoBack]);

  const handleGoForward = useCallback(() => {
    if (canGoForward) {
      webViewRef.current?.goForward();
    }
  }, [canGoForward]);

  const handleReload = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webViewRef.current?.reload();
  }, []);

  // Get display domain from URL
  const displayDomain = (() => {
    try {
      const parsed = new URL(currentUrl);
      return parsed.hostname.replace("www.", "");
    } catch {
      return "";
    }
  })();

  // Get location injection script for this platform's WebView
  const locationScript = platform
    ? LocationService.getFullInjectionScript(platform)
    : LocationService.getGeolocationInjectionScript();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.headerBtn}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="close" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.urlRow}>
            <Ionicons
              name="lock-closed"
              size={11}
              color={COLORS.savings}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.domainText} numberOfLines={1}>
              {displayDomain}
            </Text>
          </View>
          {pageTitle ? (
            <Text style={styles.pageTitle} numberOfLines={1}>
              {pageTitle}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={handleShare}
          style={styles.headerBtn}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons
            name="share-outline"
            size={20}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Loading bar */}
      {loading && (
        <View style={styles.loadingBar}>
          <View style={styles.loadingBarInner} />
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        geolocationEnabled={true}
        allowsBackForwardNavigationGestures={true}
        injectedJavaScriptBeforeContentLoaded={locationScript}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        onError={(e) =>
          console.log("[InAppBrowser] Error:", e.nativeEvent.description)
        }
      />

      {/* Bottom toolbar */}
      <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={[styles.toolBtn, !canGoBack && styles.toolBtnDisabled]}
          disabled={!canGoBack}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={canGoBack ? COLORS.textPrimary : COLORS.textTertiary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleGoForward}
          style={[styles.toolBtn, !canGoForward && styles.toolBtnDisabled]}
          disabled={!canGoForward}
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={canGoForward ? COLORS.textPrimary : COLORS.textTertiary}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleReload} style={styles.toolBtn}>
          <Ionicons name="reload" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: "#FFFFFF",
    ...SHADOWS.sm,
    zIndex: 10,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: SPACING.sm,
  },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  domainText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  pageTitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
    maxWidth: 200,
  },
  loadingBar: {
    height: 2,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  loadingBarInner: {
    height: 2,
    width: "30%",
    backgroundColor: COLORS.primary,
  },
  webView: {
    flex: 1,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    backgroundColor: "#FFFFFF",
    ...SHADOWS.sm,
    gap: SPACING.xxl,
  },
  toolBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  toolBtnDisabled: {
    opacity: 0.4,
  },
});

export default InAppBrowser;
