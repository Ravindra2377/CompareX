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
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../components/Icon";
import { useTheme } from "../context/ThemeContext";
import { WishlistContext } from "../context/WishlistContext";
import { FONTS, SPACING, RADIUS, SHADOWS } from "../config/theme";
import GroqService from "../services/GroqService";
import LocationService from "../services/LocationService";
import ConversationService from "../services/ConversationService";
import BrandHeader from "../components/BrandHeader";
import MarkdownRenderer from "../components/MarkdownRenderer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const SOURCE_BADGE_COLORS = {
  "Official Source": "#10B981",
  "Verified Manufacturer": "#6366F1",
  "Benchmark Index": "#F59E0B",
};

const RESEARCH_STEPS = [
  { id: 1, label: "Analyzing query intent & context...", icon: "search-outline" },
  { id: 2, label: "Scanning web intelligence & databases...", icon: "globe-outline" },
  { id: 3, label: "Verifying specifications & evidence...", icon: "shield-checkmark-outline" },
  { id: 4, label: "Synthesizing evidence and recommendations...", icon: "sparkles" },
];

const AIResearchScreen = ({ navigation, route }) => {
  const { initialQuery = "", mode = "all", conversationId: routeConvId } = route.params || {};
  const { themeColors, isDark } = useTheme();
  const { toggleWishlist, isInWishlist } = useContext(WishlistContext);

  const [query, setQuery] = useState("");
  const [activeMode, setActiveMode] = useState(mode);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [savedAnswerIds, setSavedAnswerIds] = useState(new Set());
  const [locationInfo, setLocationInfo] = useState({ city: "Bengaluru", pincode: "560034" });
  const [conversationId, setConversationId] = useState(routeConvId || null);

  // Live streaming text accumulator — updated token-by-token during active SSE stream
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSources, setCurrentSources] = useState([]);

  // Conversation history modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyConversations, setHistoryConversations] = useState([]);

  // Feedback and interaction state
  const [feedbackMap, setFeedbackMap] = useState({}); // { [msgId]: 'up' | 'down' }
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  const streamingMsgIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const scrollRef = useRef(null);
  const historyRef = useRef([]);

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

  // Resume existing conversation if route params specify one
  useEffect(() => {
    if (routeConvId) {
      resumeConversation(routeConvId);
    } else if (initialQuery.trim()) {
      handleSend(initialQuery.trim());
    }
  }, [routeConvId, initialQuery]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleNewChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (loading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setConversationId(null);
    setMessages([]);
    historyRef.current = [];
    setStreamingText("");
    setIsStreaming(false);
    setCurrentSources([]);
    setQuery("");
  };

  const openHistoryModal = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowHistoryModal(true);
    const list = await ConversationService.listConversations();
    if (Array.isArray(list)) {
      setHistoryConversations(list);
    }
  };

  const resumeConversation = async (targetConvId) => {
    try {
      setLoading(true);
      const conv = await ConversationService.getConversation(targetConvId);
      if (conv) {
        setConversationId(conv.id);
        if (conv.mode) setActiveMode(conv.mode);
        const restoredMessages = (conv.messages || []).map((m) => {
          if (m.role === "user") {
            return {
              id: `user-${m.id || Math.random()}`,
              role: "user",
              text: m.content,
              timestamp: new Date(m.created_at || Date.now()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
          }
          let comparisonData = [];
          if (m.comparison && m.comparison.comparison_json) {
            try {
              comparisonData = JSON.parse(m.comparison.comparison_json);
            } catch {}
          }
          return {
            id: `ai-${m.id || Math.random()}`,
            role: "assistant",
            data: {
              summary: m.content,
              sources: m.sources || [],
              comparisonData,
              keyTakeaways: [],
              followUps: [],
            },
            timestamp: new Date(m.created_at || Date.now()).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        });

        setMessages(restoredMessages);
        historyRef.current = (conv.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        }));
        setShowHistoryModal(false);
      }
    } catch (e) {
      Alert.alert("Error", "Could not load conversation.");
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  };

  const handleEditMessage = (msg, index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery(msg.text);
    // Truncate messages to this turn
    setMessages((prev) => prev.slice(0, index));
    historyRef.current = historyRef.current.slice(0, index);
  };

  const handleRegenerate = (msgIndex) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let precedingPrompt = "";
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        precedingPrompt = messages[i].text;
        break;
      }
    }
    if (!precedingPrompt) return;

    setMessages((prev) => prev.slice(0, msgIndex));
    historyRef.current = historyRef.current.slice(0, msgIndex);
    handleSend(precedingPrompt);
  };

  const handleFeedback = (msgId, type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeedbackMap((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === type ? null : type,
    }));
  };

  const handleCopy = async (msgId, text) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
      await Share.share({ message: text });
    } catch {}
  };

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
    setActiveStep(1);
    setStreamingText("");
    setCurrentSources([]);
    streamingMsgIdRef.current = `streaming-${Date.now()}`;

    // Create a new AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let isCancelled = false;

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

    const tokenAccumulatorRef = { current: "" };
    let firstTokenReceived = false;

    try {
      const result = await GroqService.researchStream(
        promptText,
        activeMode,
        conversationHistory,
        { ...locationInfo, conversationId },
        {
          onIntent: () => setActiveStep(2),
          onSources: (srcs) => {
            setCurrentSources(srcs || []);
            setActiveStep(3);
          },
          onToken: (tokenChunk) => {
            if (isCancelled) return;
            if (!firstTokenReceived) {
              firstTokenReceived = true;
              setIsStreaming(true);
              setActiveStep(4);
            }
            tokenAccumulatorRef.current += tokenChunk;
            setStreamingText(tokenAccumulatorRef.current);
            scrollRef.current?.scrollToEnd({ animated: false });
          },
          onDone: () => setActiveStep(4),
          onError: (err) => console.log("[AIResearchScreen] Stream error:", err?.message),
        },
        controller.signal
      );

      if (isCancelled) return;

      if (result.conversationId) {
        setConversationId(result.conversationId);
      }

      // Persist local conversation cache
      ConversationService.saveLocalConversation({
        id: result.conversationId || conversationId || `local-${Date.now()}`,
        title: promptText,
        mode: activeMode,
        messages: [
          ...conversationHistory,
          { role: "assistant", content: result.summary || "" },
        ],
      });

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

      setIsStreaming(false);
      streamingMsgIdRef.current = null;
      setStreamingText("");
      setMessages((prev) => [...prev, aiMessage]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      if (err?.name === "AbortError" || controller.signal.aborted) {
        isCancelled = true;
        const partialText = tokenAccumulatorRef.current;
        setIsStreaming(false);
        streamingMsgIdRef.current = null;
        setStreamingText("");
        if (partialText.trim()) {
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-partial-${Date.now()}`,
              role: "assistant",
              data: {
                summary: partialText + "\n\n*[Generation stopped by user]*",
                keyTakeaways: [],
                sources: currentSources,
                followUps: [],
              },
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
        return;
      }
      const errorMsg = {
        id: `ai-error-${Date.now()}`,
        role: "assistant",
        data: {
          summary: "I encountered an issue gathering live research data. Please check your connection or tap retry.",
          keyTakeaways: ["Temporary connection interruption"],
          sources: [],
          followUps: ["Try asking again", "Check network connection"],
        },
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setIsStreaming(false);
      streamingMsgIdRef.current = null;
      setStreamingText("");
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  };

  const handleSaveAnswer = async (message) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const existingRaw = await AsyncStorage.getItem("comparez_saved_research");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];

      const queryMsg = messages.find((m) => m.role === "user");
      const userPrompt = queryMsg ? queryMsg.text : "AI Research";

      const itemToSave = {
        id: message.id,
        savedAt: new Date().toISOString(),
        query: userPrompt,
        summary: message.data?.summary || "",
        keyTakeaways: message.data?.keyTakeaways || [],
        sources: message.data?.sources || [],
      };

      const updated = [itemToSave, ...existing.filter((item) => item.id !== message.id)];
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
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              style={[styles.headerButton, { borderColor: themeColors.line, backgroundColor: themeColors.card, marginRight: 8 }]}
              onPress={handleNewChat}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add-circle-outline" size={18} color={themeColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, { borderColor: themeColors.line, backgroundColor: themeColors.card, marginRight: 8 }]}
              onPress={openHistoryModal}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="time-outline" size={18} color={themeColors.ink} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, { borderColor: themeColors.line, backgroundColor: themeColors.card }]}
              onPress={() => navigation.navigate("Library")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="bookmark-outline" size={18} color={themeColors.ink} />
            </TouchableOpacity>
          </View>
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
                { title: "Calculate EMI for 10L loan at 8.5% for 10 yrs", tag: "Calc" },
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

        {messages.map((msg, index) => {
          if (msg.role === "user") {
            return (
              <View key={msg.id} style={styles.userMessageRow}>
                <View style={[styles.userBubble, { backgroundColor: themeColors.aubergineDeep || "#0D4F3C" }]}>
                  <Text style={[FONTS.uiBodyBold, { fontSize: 15, color: "#FFFFFF", lineHeight: 22 }]}>
                    {msg.text}
                  </Text>
                  <View style={styles.userFooterRow}>
                    <Text style={[FONTS.uiBody, { fontSize: 10, color: "rgba(255,255,255,0.6)" }]}>
                      {msg.timestamp}
                    </Text>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleEditMessage(msg, index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="pencil-outline" size={12} color="rgba(255,255,255,0.85)" />
                      <Text style={[FONTS.uiBodyBold, { fontSize: 10, color: "rgba(255,255,255,0.85)", marginLeft: 3 }]}>
                        Edit
                      </Text>
                    </TouchableOpacity>
                  </View>
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
                  {/* Regenerate Response */}
                  <TouchableOpacity
                    style={styles.iconAction}
                    onPress={() => handleRegenerate(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="reload-outline" size={16} color={themeColors.inkSoft} />
                  </TouchableOpacity>

                  {/* Copy Response */}
                  <TouchableOpacity
                    style={[styles.iconAction, { marginLeft: 6 }]}
                    onPress={() => handleCopy(msg.id, aiData.summary || "")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={copiedMsgId === msg.id ? "checkmark" : "copy-outline"}
                      size={16}
                      color={copiedMsgId === msg.id ? themeColors.primary : themeColors.inkSoft}
                    />
                  </TouchableOpacity>

                  {/* Feedback Thumbs Up */}
                  <TouchableOpacity
                    style={[styles.iconAction, { marginLeft: 6 }]}
                    onPress={() => handleFeedback(msg.id, "up")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={feedbackMap[msg.id] === "up" ? "thumbs-up" : "thumbs-up-outline"}
                      size={16}
                      color={feedbackMap[msg.id] === "up" ? themeColors.primary : themeColors.inkSoft}
                    />
                  </TouchableOpacity>

                  {/* Feedback Thumbs Down */}
                  <TouchableOpacity
                    style={[styles.iconAction, { marginLeft: 6 }]}
                    onPress={() => handleFeedback(msg.id, "down")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={feedbackMap[msg.id] === "down" ? "thumbs-down" : "thumbs-down-outline"}
                      size={16}
                      color={feedbackMap[msg.id] === "down" ? themeColors.tomato || "#EF4444" : themeColors.inkSoft}
                    />
                  </TouchableOpacity>

                  {/* Bookmark Save */}
                  <TouchableOpacity
                    style={[styles.iconAction, { marginLeft: 6 }]}
                    onPress={() => handleSaveAnswer(msg)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={isSaved ? "bookmark" : "bookmark-outline"}
                      size={16}
                      color={isSaved ? themeColors.primary : themeColors.inkSoft}
                    />
                  </TouchableOpacity>

                  {/* Native Share */}
                  <TouchableOpacity
                    style={[styles.iconAction, { marginLeft: 6 }]}
                    onPress={() => handleShare(aiData.summary || "")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="share-outline" size={16} color={themeColors.inkSoft} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Main Summary Rendered with Markdown, Tables, and Clickable Citations */}
              <View style={[styles.aiCard, { backgroundColor: themeColors.card, borderColor: themeColors.line }]}>
                <MarkdownRenderer
                  content={aiData.summary || "No answer generated."}
                  sources={aiData.sources || []}
                  onCitationPress={(citeNum) => {
                    const src = (aiData.sources || []).find((s, sIdx) => (s.number || s.id || sIdx + 1) === citeNum);
                    if (src && src.url) openSourceUrl(src.url);
                  }}
                />

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
                                [{src.number || src.id || sIdx + 1}]
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
                                    { backgroundColor: SOURCE_BADGE_COLORS[plat.platform] || themeColors.primary },
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

                        {/* Button to explore product intelligence */}
                        <TouchableOpacity
                          style={[styles.fullScanBtn, { borderColor: themeColors.primary }]}
                          onPress={() => openLiveProductComparison(aiData.suggestedSearch || prod.name)}
                        >
                          <Ionicons name="layers-outline" size={14} color={themeColors.primary} />
                          <Text style={[FONTS.uiBodyBold, { fontSize: 12, color: themeColors.primary, marginLeft: 6 }]}>
                            Explore Product Intelligence & Specifications
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
                      EXPLORE NEXT
                    </Text>
                    <View style={styles.followUpButtonsRow}>
                      {aiData.followUps.map((question, qIdx) => (
                        <TouchableOpacity
                          key={qIdx}
                          style={[styles.followUpChip, { backgroundColor: themeColors.paper, borderColor: themeColors.line }]}
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

        {/* ── Live Streaming Bubble (token-by-token output) ── */}
        {isStreaming && (
          <View style={styles.aiMessageContainer}>
            <View style={styles.aiHeaderRow}>
              <View style={[styles.aiBadge, { backgroundColor: themeColors.primary }]}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
              <Text style={[FONTS.uiBodyBold, { fontSize: 14, color: themeColors.ink, marginLeft: 8 }]}>
                CompareZ Intelligence
              </Text>
              <View style={[styles.streamingPill, { backgroundColor: `${themeColors.primary}18`, borderColor: `${themeColors.primary}30` }]}>
                <View style={[styles.streamingDot, { backgroundColor: themeColors.primary }]} />
                <Text style={[FONTS.monoBold, { fontSize: 10, color: themeColors.primary, marginLeft: 5 }]}>
                  WRITING
                </Text>
              </View>
            </View>
            <View style={[styles.aiCard, { backgroundColor: themeColors.card, borderColor: themeColors.line }]}>
              {streamingText ? (
                <MarkdownRenderer
                  content={streamingText}
                  sources={currentSources}
                  isStreaming={true}
                  onCitationPress={(citeNum) => {
                    const src = currentSources.find((s, sIdx) => (s.number || s.id || sIdx + 1) === citeNum);
                    if (src && src.url) openSourceUrl(src.url);
                  }}
                />
              ) : (
                <View style={styles.streamingPlaceholder}>
                  <View style={[styles.shimmerLine, { width: "90%", backgroundColor: themeColors.line }]} />
                  <View style={[styles.shimmerLine, { width: "75%", backgroundColor: themeColors.line, marginTop: 10 }]} />
                  <View style={[styles.shimmerLine, { width: "60%", backgroundColor: themeColors.line, marginTop: 10 }]} />
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Active Research Stepper (shows only while awaiting first tokens) ── */}
        {loading && !isStreaming && (
          <View style={[styles.loadingContainer, { backgroundColor: themeColors.card, borderColor: themeColors.line }]}>
            <View style={styles.loadingHeader}>
              <ActivityIndicator size="small" color={themeColors.primary} />
              <Text style={[FONTS.uiBodyBold, { fontSize: 14, color: themeColors.ink, marginLeft: 10 }]}>
                Researching with Real-Time Intelligence...
              </Text>
            </View>

            {/* Stepper indicator */}
            <View style={styles.stepsList}>
              {RESEARCH_STEPS.map((step) => {
                const isDone = activeStep > step.id;
                const isCurrent = activeStep === step.id;

                return (
                  <View key={step.id} style={styles.stepItemRow}>
                    <View
                      style={[
                        styles.stepCircle,
                        {
                          backgroundColor: isDone
                            ? themeColors.primary
                            : isCurrent
                            ? `${themeColors.primary}20`
                            : themeColors.paper,
                          borderColor: isCurrent ? themeColors.primary : themeColors.line,
                          borderWidth: isCurrent ? 2 : 1,
                        },
                      ]}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      ) : (
                        <Ionicons
                          name={step.icon}
                          size={11}
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

          {/* Send or Stop Generation Button */}
          {loading ? (
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: themeColors.tomato || "#EF4444" }]}
              onPress={handleStop}
              activeOpacity={0.8}
            >
              <Ionicons name="stop" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: query.trim() ? themeColors.primary : `${themeColors.primary}40`,
                },
              ]}
              onPress={() => handleSend(query)}
              disabled={!query.trim()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ── Conversation History Modal ── */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.paper }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.line }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="chatbubbles-outline" size={20} color={themeColors.primary} />
              <Text style={[FONTS.editorialBold, { fontSize: 18, color: themeColors.ink, marginLeft: 8 }]}>
                Chat History
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                style={[styles.modalNewBtn, { backgroundColor: themeColors.primary }]}
                onPress={() => {
                  handleNewChat();
                  setShowHistoryModal(false);
                }}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={[FONTS.uiBodyBold, { fontSize: 12, color: "#FFFFFF", marginLeft: 4 }]}>
                  New Chat
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { marginLeft: 12 }]}
                onPress={() => setShowHistoryModal(false)}
              >
                <Ionicons name="close" size={20} color={themeColors.ink} />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={historyConversations}
            keyExtractor={(item, index) => String(item.id || index)}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <View style={styles.modalEmpty}>
                <Ionicons name="chatbubbles-outline" size={36} color={themeColors.inkFaint} />
                <Text style={[FONTS.uiBodyBold, { fontSize: 15, color: themeColors.ink, marginTop: 10 }]}>
                  No past conversations
                </Text>
                <Text style={[FONTS.uiBody, { fontSize: 12, color: themeColors.inkSoft, marginTop: 4, textAlign: "center" }]}>
                  Past AI conversations and research turns will be listed here.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.historyModalItem, { backgroundColor: themeColors.card, borderColor: themeColors.line }]}
                onPress={() => resumeConversation(item.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[FONTS.uiBodyBold, { fontSize: 14, color: themeColors.ink }]} numberOfLines={1}>
                    {item.title || "Research Conversation"}
                  </Text>
                  <Text style={[FONTS.uiBody, { fontSize: 11, color: themeColors.inkFaint, marginTop: 4 }]}>
                    {new Date(item.updated_at || item.created_at || Date.now()).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.historyDeleteBtn}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await ConversationService.deleteConversation(item.id);
                    setHistoryConversations((prev) => prev.filter((c) => String(c.id) !== String(item.id)));
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={16} color={themeColors.inkFaint} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyWelcome: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 20,
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
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  userMessageRow: {
    alignItems: "flex-end",
    marginBottom: 16,
  },
  userBubble: {
    maxWidth: "85%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  userFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginLeft: 12,
  },
  aiMessageContainer: {
    marginBottom: 20,
  },
  aiHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  aiBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  takeawaysBox: {
    marginTop: 14,
    padding: 12,
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
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sourcesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  sourceCard: {
    width: 170,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 10,
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
    marginTop: 18,
  },
  comparisonCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  bestPriceTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  platformGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  buyBtn: {
    marginTop: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
  },
  fullScanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  followUpsWrap: {
    marginTop: 16,
  },
  followUpButtonsRow: {
    gap: 8,
  },
  followUpChip: {
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
  // ── Streaming bubble styles ──────────────────────────────────────────────
  streamingPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 8,
  },
  streamingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  streamingPlaceholder: {
    paddingVertical: 4,
  },
  shimmerLine: {
    height: 14,
    borderRadius: 7,
    opacity: 0.4,
  },
  // ── Conversation History Modal styles ────────────────────────────────────
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  historyModalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  historyDeleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
});

export default AIResearchScreen;
