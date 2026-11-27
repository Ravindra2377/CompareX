import React, { useState, useRef, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../components/Icon";
import { useTheme } from "../context/ThemeContext";
import { WishlistContext } from "../context/WishlistContext";
import { FONTS, SPACING, RADIUS, SHADOWS } from "../config/theme";
import GroqService from "../services/GroqService";
import LocationService from "../services/LocationService";
import BrandHeader from "../components/BrandHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const PLATFORM_COLORS = {
  Blinkit: "#F8CB46",
  Zepto: "#7C3AED",
  BigBasket: "#84C225",
  Amazon: "#FF9900",
  Flipkart: "#2874F0",
};

const RESEARCH_STEPS = [
  { id: 1, label: "Analyzing query intent & context...", icon: "search-outline" },
  { id: 2, label: "Scanning web intelligence & databases...", icon: "globe-outline" },
  { id: 3, label: "Verifying merchant prices in India...", icon: "basket-outline" },
  { id: 4, label: "Synthesizing evidence and recommendations...", icon: "sparkles" },
];

const AIResearchScreen = ({ navigation, route }) => {
  const { initialQuery = "", mode = "all" } = route.params || {};
  const { themeColors, isDark } = useTheme();
  const { toggleWishlist, isInWishlist } = useContext(WishlistContext);

  const [query, setQuery] = useState("");
  const [activeMode, setActiveMode] = useState(mode);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [savedAnswerIds, setSavedAnswerIds] = useState(new Set());
  const [locationInfo, setLocationInfo] = useState({ city: "Bengaluru", pincode: "560034" });
  const [conversationId, setConversationId] = useState(null);

  const scrollRef = useRef(null);
  const historyRef = useRef([]);
  const stepAnim = useRef(new Animated.Value(0)).current;

  // Load user location for accurate quick-commerce pricing
  useEffect(() => {
    LocationService.init().then((loc) => {
      if (loc) {
        setLocationInfo({
          city: loc.city || "Bengaluru",
          pincode: loc.pincode || "560034",
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
      }
    });
  }, []);

  // Run initial query if provided from Home or Search screen
  useEffect(() => {
    if (initialQuery.trim()) {
      handleSend(initialQuery.trim());
    }
  }, [initialQuery]);

  // Animate research step progress
  useEffect(() => {
    let interval;
    if (loading) {
      setActiveStep(1);
      stepAnim.setValue(0);
      Animated.timing(stepAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      interval = setInterval(() => {
        setActiveStep((prev) => (prev < 4 ? prev + 1 : 4));
      }, 900);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSend = async (textToSend) => {
    const promptText = (typeof textToSend === "string" ? textToSend : query).trim();
    if (!promptText || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery("");

    const userMsgId = `user-${Date.now()}`;
    const userMessage = {
      id: userMsgId,
      role: "user",
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    // Save query into recent searches
    try {
      const stored = await AsyncStorage.getItem("comparex_search_history");
      const list = stored ? JSON.parse(stored) : [];
      const updated = [promptText, ...list.filter((q) => q.toLowerCase() !== promptText.toLowerCase())].slice(0, 15);
      await AsyncStorage.setItem("comparex_search_history", JSON.stringify(updated));
    } catch {}

    const conversationHistory = [
      ...historyRef.current,
      { role: "user", content: promptText },
    ].slice(-8);

    try {
      const result = await GroqService.research(
        promptText,
        activeMode,
        conversationHistory,
        { ...locationInfo, conversationId },
      );

      if (result.conversationId) {
        setConversationId(result.conversationId);
      }

      const aiMsgId = `ai-${Date.now()}`;
      const aiMessage = {
        id: aiMsgId,
        role: "assistant",
        data: result,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      historyRef.current = [
        ...conversationHistory,
        { role: "assistant", content: result.summary || "" },
      ];

      setMessages((prev) => [...prev, aiMessage]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const errorMsg = {
        id: `ai-error-${Date.now()}`,
        role: "assistant",
        data: {
          summary: "I encountered an issue gathering live research data. Please check your connection or tap retry.",
          keyTakeaways: ["Temporary connection interruption"],
          sources: [],
          isProductQuery: false,
          comparisonData: [],
          followUps: ["Retry research", "Compare prices on Search tab"],
        },
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  };

  const handleSaveAnswer = async (message) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const stored = await AsyncStorage.getItem("comparez_saved_research");
      const list = stored ? JSON.parse(stored) : [];
      const newEntry = {
        id: message.id,
        savedAt: new Date().toISOString(),
        query: messages.find((m) => m.role === "user")?.text || "Research Answer",
        summary: message.data?.summary || "",
        sources: message.data?.sources || [],
        comparisonData: message.data?.comparisonData || [],
      };

      const updated = [newEntry, ...list.filter((item) => item.id !== message.id)];
      await AsyncStorage.setItem("comparez_saved_research", JSON.stringify(updated));

      setSavedAnswerIds((prev) => new Set([...prev, message.id]));
      Alert.alert("Saved to Library", "This research answer and citations are saved to your Library.");
    } catch {
      Alert.alert("Error", "Could not save answer to Library.");
    }
  };

  const handleShare = async (summaryText) => {
    try {
      await Share.share({
        message: `${summaryText}\n\n— Researched via CompareZ AI (India)`,
      });
    } catch {}
  };

  const openSourceUrl = (url) => {
    if (!url) return;
    navigation.navigate("InAppBrowser", { url, title: "Web Intelligence Source" });
  };

  const openLiveProductComparison = (productKeyword) => {
    navigation.navigate("Search", { query: productKeyword });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.paper }]}>
      {/* ── CompareZ Brand Header ── */}
      <BrandHeader
        city={locationInfo.city}
        pincode={locationInfo.pincode}
        editorial
        showBack={Boolean(navigation.canGoBack && navigation.canGoBack())}
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity
            style={[styles.headerButton, { borderColor: themeColors.line, backgroundColor: themeColors.card }]}
            onPress={() => navigation.navigate("Library")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="bookmark-outline" size={18} color={themeColors.ink} />
          </TouchableOpacity>
        }
      />

      {/* ── Mode Switcher Pills ── */}
      <View style={[styles.modesBar, { borderBottomColor: themeColors.line }]}>
        {[
          { id: "all", label: "Overview", icon: "sparkles" },
          { id: "research", label: "Web Research", icon: "globe-outline" },
          { id: "compare", label: "Compare Prices", icon: "pricetags-outline" },
          { id: "shopping", label: "Buying Advice", icon: "basket-outline" },
        ].map((item) => {
          const isActive = activeMode === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.modePill,
                {
                  backgroundColor: isActive ? themeColors.primary : themeColors.card,
                  borderColor: isActive ? themeColors.primary : themeColors.line,
                },
              ]}
              onPress={() => {
                setActiveMode(item.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons
                name={item.icon}
                size={13}
                color={isActive ? "#FFFFFF" : themeColors.inkSoft}
              />
              <Text
                style={[
                  FONTS.uiBodyBold,
                  {
                    fontSize: 12,
                    marginLeft: 4,
                    color: isActive ? "#FFFFFF" : themeColors.inkSoft,
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Messages Stream ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && !loading && (
          <View style={styles.emptyWelcome}>
            <View style={[styles.emptyIconCircle, { backgroundColor: `${themeColors.primary}15` }]}>
              <Ionicons name="sparkles" size={32} color={themeColors.primary} />
            </View>
            <Text style={[FONTS.editorialBold, { fontSize: 22, color: themeColors.ink, textAlign: "center", marginTop: 14 }]}>
              Ask CompareZ Anything
            </Text>
            <Text style={[FONTS.uiBody, { fontSize: 14, color: themeColors.inkSoft, textAlign: "center", marginTop: 6, lineHeight: 21, paddingHorizontal: 20 }]}>
              Research internet topics with cited evidence, compare real grocery and tech prices, or discover the best deals in India.
            </Text>

            {/* Quick Starter Prompts */}
            <View style={styles.starterGrid}>
              {[
                { title: "Amul vs Nandini Full Cream Milk", tag: "Compare" },
                { title: "Best cold-pressed cooking oils in India", tag: "Research" },
                { title: "Is Blinkit or Zepto cheaper for daily essentials?", tag: "Deals" },
                { title: "High-protein vegetarian meal plan under ₹200", tag: "Plan" },
              ].map((starter, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.starterCard, { backgroundColor: themeColors.card, borderColor: themeColors.line }]}
                  onPress={() => handleSend(starter.title)}
                  activeOpacity={0.8}
                >
                  <Text style={[FONTS.monoBold, { fontSize: 10, color: themeColors.primary, textTransform: "uppercase" }]}>
                    {starter.tag}
                  </Text>
                  <Text style={[FONTS.uiBodyBold, { fontSize: 13, color: themeColors.ink, marginTop: 4 }]}>
                    {starter.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <View key={msg.id} style={styles.userMessageRow}>
                <View style={[styles.userBubble, { backgroundColor: themeColors.aubergineDeep || "#0D4F3C" }]}>
                  <Text style={[FONTS.uiBodyBold, { fontSize: 15, color: "#FFFFFF", lineHeight: 22 }]}>
                    {msg.text}
                  </Text>
                  <Text style={[FONTS.uiBody, { fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 4, alignSelf: "flex-end" }]}>
                    {msg.timestamp}
                  </Text>
                </View>
              </View>
            );
          }

          const aiData = msg.data || {};
          const isSaved = savedAnswerIds.has(msg.id);

          return (
            <View key={msg.id} style={styles.aiMessageContainer}>
              {/* AI Avatar & Header */}
              <View style={styles.aiHeaderRow}>
                <View style={[styles.aiBadge, { backgroundColor: themeColors.primary }]}>
                  <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                </View>
                <Text style={[FONTS.uiBodyBold, { fontSize: 14, color: themeColors.ink, marginLeft: 8 }]}>
                  CompareZ Intelligence
                </Text>
                <Text style={[FONTS.uiBody, { fontSize: 11, color: themeColors.inkFaint, marginLeft: 8 }]}>
                  {msg.timestamp}
                </Text>

                <View style={styles.aiActionsRight}>
                  <TouchableOpacity
                    style={styles.iconAction}
                    onPress={() => handleSaveAnswer(msg)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={isSaved ? "bookmark" : "bookmark-outline"}
                      size={18}
                      color={isSaved ? themeColors.primary : themeColors.inkSoft}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconAction, { marginLeft: 8 }]}
                    onPress={() => handleShare(aiData.summary || "")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="share-outline" size={18} color={themeColors.inkSoft} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Main Summary Text */}
              <View style={[styles.aiCard, { backgroundColor: themeColors.card, borderColor: themeColors.line }]}>
                <Text style={[FONTS.uiBody, { fontSize: 15, color: themeColors.ink, lineHeight: 24 }]}>
                  {aiData.summary || "No answer generated."}
                </Text>

                {/* Key Takeaways */}
                {aiData.keyTakeaways && aiData.keyTakeaways.length > 0 && (
                  <View style={[styles.takeawaysBox, { backgroundColor: `${themeColors.primary}0D`, borderColor: `${themeColors.primary}30` }]}>
                    <Text style={[FONTS.monoBold, { fontSize: 11, color: themeColors.primary, letterSpacing: 0.5, marginBottom: 8 }]}>
                      KEY TAKEAWAYS
                    </Text>
                    {aiData.keyTakeaways.map((point, idx) => (
                      <View key={idx} style={styles.takeawayRow}>
                        <Ionicons name="checkmark-circle" size={15} color={themeColors.primary} style={{ marginTop: 2 }} />
                        <Text style={[FONTS.uiBody, { fontSize: 13, color: themeColors.ink, marginLeft: 8, flex: 1, lineHeight: 19 }]}>
                          {point}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Web Intelligence Sources */}
                {aiData.sources && aiData.sources.length > 0 && (
                  <View style={styles.sourcesSection}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="globe-outline" size={14} color={themeColors.inkSoft} />
                      <Text style={[FONTS.monoBold, { fontSize: 11, color: themeColors.inkSoft, marginLeft: 6, letterSpacing: 0.5 }]}>
                        VERIFIED SOURCES ({aiData.sources.length})
                      </Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sourcesScroll}>
                      {aiData.sources.map((src, sIdx) => (
                        <TouchableOpacity
                          key={sIdx}
                          style={[styles.sourceCard, { backgroundColor: themeColors.paper, borderColor: themeColors.line }]}
                          onPress={() => openSourceUrl(src.url)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.sourceCardTop}>
                            <View style={[styles.citationNumberBadge, { backgroundColor: `${themeColors.primary}20` }]}>
                              <Text style={[FONTS.monoBold, { fontSize: 10, color: themeColors.primary }]}>
                                [{src.id || sIdx + 1}]
                              </Text>
                            </View>
                            <Text style={[FONTS.mono, { fontSize: 11, color: themeColors.inkFaint, flex: 1, marginLeft: 6 }]} numberOfLines={1}>
                              {src.domain || "web"}
                            </Text>
                            <Ionicons name="open-outline" size={12} color={themeColors.inkFaint} />
                          </View>
                          <Text style={[FONTS.uiBodyBold, { fontSize: 12, color: themeColors.ink, marginTop: 4 }]} numberOfLines={2}>
                            {src.title || src.domain}
                          </Text>
                          {src.snippet ? (
                            <Text style={[FONTS.uiBody, { fontSize: 11, color: themeColors.inkSoft, marginTop: 3 }]} numberOfLines={2}>
                              {src.snippet}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Embedded Product Comparison Card (Shopping Intelligence) */}
                {aiData.comparisonData && aiData.comparisonData.length > 0 && (
                  <View style={styles.comparisonSection}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="pricetags-outline" size={14} color={themeColors.coriander || "#059669"} />
                      <Text style={[FONTS.monoBold, { fontSize: 11, color: themeColors.coriander || "#059669", marginLeft: 6, letterSpacing: 0.5 }]}>
                        INDIAN MERCHANT PRICE COMPARISON
                      </Text>
                    </View>

                    {aiData.comparisonData.map((prod, pIdx) => (
                      <View key={pIdx} style={[styles.comparisonCard, { backgroundColor: themeColors.paper, borderColor: themeColors.line }]}>
                        <View style={styles.productHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={[FONTS.uiBodyBold, { fontSize: 15, color: themeColors.ink }]}>
                              {prod.name}
                            </Text>
                            <Text style={[FONTS.uiBody, { fontSize: 12, color: themeColors.inkSoft, marginTop: 2 }]}>
                              {prod.category || "Grocery & Essentials"}
                            </Text>
                          </View>
                          {prod.bestPrice > 0 && (
                            <View style={[styles.bestPriceTag, { backgroundColor: `${themeColors.coriander || "#059669"}18` }]}>
                              <Text style={[FONTS.monoBold, { fontSize: 13, color: themeColors.coriander || "#059669" }]}>
                                ₹{prod.bestPrice} Best
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Platform Breakdown Grid */}
                        <View style={styles.platformGrid}>
                          {(prod.platforms || []).map((plat, platIdx) => (
                            <View
                              key={platIdx}
                              style={[
                                styles.platformItem,
                                {
                                  backgroundColor: themeColors.card,
                                  borderColor: plat.price === prod.bestPrice && prod.bestPrice > 0 ? themeColors.coriander || "#059669" : themeColors.line,
                                },
                              ]}
                            >
                              <View style={styles.platformBadgeRow}>
                                <View
                                  style={[
                                    styles.platformColorDot,
                                    { backgroundColor: PLATFORM_COLORS[plat.platform] || themeColors.primary },
                                  ]}
                                />
                                <Text style={[FONTS.uiBodyBold, { fontSize: 12, color: themeColors.ink, marginLeft: 5 }]}>
                                  {plat.platform}
                                </Text>
                              </View>

                              <Text style={[FONTS.monoBold, { fontSize: 15, color: themeColors.ink, marginTop: 4 }]}>
                                {plat.price > 0 ? `₹${plat.price}` : "Available"}
                              </Text>

                              <Text style={[FONTS.uiBody, { fontSize: 10, color: themeColors.inkFaint, marginTop: 2 }]}>
                                {plat.delivery || "In stock"}
                              </Text>

                              <TouchableOpacity
                                style={[styles.buyBtn, { backgroundColor: themeColors.ink }]}
                                onPress={() => openSourceUrl(plat.url)}
                              >
                                <Text style={[FONTS.uiBodyBold, { fontSize: 10, color: "#FFFFFF" }]}>
                                  Open
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>

                        {/* Button to run full headless scan */}
                        <TouchableOpacity
                          style={[styles.fullScanBtn, { borderColor: themeColors.primary }]}
                          onPress={() => openLiveProductComparison(aiData.suggestedSearch || prod.name)}
                        >
                          <Ionicons name="sync-outline" size={14} color={themeColors.primary} />
                          <Text style={[FONTS.uiBodyBold, { fontSize: 12, color: themeColors.primary, marginLeft: 6 }]}>
                            Run Live 5-Platform WebView Scan
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Follow-up Questions */}
                {aiData.followUps && aiData.followUps.length > 0 && (
                  <View style={styles.followUpsWrap}>
                    <Text style={[FONTS.monoBold, { fontSize: 11, color: themeColors.inkSoft, letterSpacing: 0.5, marginBottom: 8 }]}>
                      EXPLORE FURTHER
                    </Text>
                    <View style={styles.followUpPillsContainer}>
                      {aiData.followUps.map((question, fIdx) => (
                        <TouchableOpacity
                          key={fIdx}
                          style={[styles.followUpPill, { backgroundColor: themeColors.paper, borderColor: themeColors.line }]}
                          onPress={() => handleSend(question)}
                        >
                          <Ionicons name="arrow-forward" size={12} color={themeColors.primary} />
                          <Text style={[FONTS.uiBody, { fontSize: 12, color: themeColors.ink, marginLeft: 6 }]}>
                            {question}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* ── Active Research Stepper (Loading State) ── */}
        {loading && (
          <View style={[styles.loadingContainer, { backgroundColor: themeColors.card, borderColor: themeColors.line }]}>
            <View style={styles.loadingHeader}>
              <ActivityIndicator size="small" color={themeColors.primary} />
              <Text style={[FONTS.uiBodyBold, { fontSize: 14, color: themeColors.ink, marginLeft: 10 }]}>
                Synthesizing Research & Evidence...
              </Text>
            </View>

            <View style={styles.stepsList}>
              {RESEARCH_STEPS.map((step) => {
                const isPassed = activeStep > step.id;
                const isCurrent = activeStep === step.id;
                return (
                  <View key={step.id} style={styles.stepItemRow}>
                    <View
                      style={[
                        styles.stepCircle,
                        {
                          backgroundColor: isPassed
                            ? themeColors.primary
                            : isCurrent
                              ? `${themeColors.primary}20`
                              : themeColors.line,
                        },
                      ]}
                    >
                      {isPassed ? (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      ) : (
                        <Ionicons
                          name={step.icon}
                          size={12}
                          color={isCurrent ? themeColors.primary : themeColors.inkFaint}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        FONTS.uiBody,
                        {
                          fontSize: 12,
                          color: isCurrent ? themeColors.ink : themeColors.inkFaint,
                          fontWeight: isCurrent ? "600" : "400",
                          marginLeft: 10,
                          flex: 1,
                        },
                      ]}
                    >
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Bottom Input Bar ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={[styles.inputBar, { backgroundColor: themeColors.card, borderTopColor: themeColors.line }]}>
          <View style={[styles.inputBox, { backgroundColor: themeColors.paper, borderColor: themeColors.line }]}>
            <Ionicons name="search" size={18} color={themeColors.inkFaint} style={{ marginLeft: 12 }} />
            <TextInput
              style={[styles.textInput, { color: themeColors.ink }]}
              placeholder="Ask a follow-up or research anything..."
              placeholderTextColor={themeColors.inkFaint}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSend(query)}
              returnKeyType="send"
              editable={!loading}
            />
            {query.trim().length > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => setQuery("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={16} color={themeColors.inkFaint} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: query.trim() ? themeColors.primary : `${themeColors.primary}40`,
              },
            ]}
            onPress={() => handleSend(query)}
            disabled={!query.trim() || loading}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  modeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  modesBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyWelcome: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  starterGrid: {
    width: "100%",
    marginTop: 24,
    gap: 10,
  },
  starterCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  userMessageRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  userBubble: {
    maxWidth: "85%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  aiMessageContainer: {
    marginBottom: 24,
  },
  aiHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  aiBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  aiActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
  },
  iconAction: {
    padding: 4,
  },
  aiCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  takeawaysBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  takeawayRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  sourcesSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sourcesScroll: {
    marginHorizontal: -6,
  },
  sourceCard: {
    width: 200,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 6,
  },
  sourceCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  citationNumberBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  comparisonSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  comparisonCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bestPriceTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  platformGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  platformItem: {
    flex: 1,
    minWidth: "45%",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  platformBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  platformColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buyBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 8,
  },
  fullScanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  followUpsWrap: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  followUpPillsContainer: {
    gap: 8,
  },
  followUpPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  loadingContainer: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  loadingHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepsList: {
    marginTop: 14,
    gap: 10,
  },
  stepItemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  inputBox: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  clearBtn: {
    padding: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});

export default AIResearchScreen;
