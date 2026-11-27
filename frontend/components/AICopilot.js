import React, { useState, useRef, useContext, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
  Image,
  ScrollView,
  PanResponder,
  Keyboard,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "../components/Icon";
import { WishlistContext } from "../context/WishlistContext";
import { SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";
import { useTheme } from "../context/ThemeContext";
import GroqService from "../services/GroqService";
import * as Haptics from "expo-haptics";
import LiquidGlass from "./LiquidGlass";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");
const FAB_SIZE = 64;
const FAB_RIGHT = 20;
const FAB_BOTTOM = 140;
const FAB_EDGE_MARGIN = 12;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const WELCOME_MESSAGE =
  "Hi, I'm CompareZ AI. Ask me anything — research questions, product specifications comparison, and consumer advice.";

const STARTER_PROMPTS = [
  { label: "Compare Smartphones", prompt: "Compare iPhone 16 vs Galaxy S25 specifications and features" },
  { label: "Research Question", prompt: "What are the health benefits of cold-pressed mustard oil?" },
  { label: "Financial Calculation", prompt: "Calculate home loan EMI for 30 lakhs at 8.5% for 20 years" },
];

const AICopilot = ({ activeRouteName }) => {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { id: "welcome", role: "assistant", text: WELCOME_MESSAGE },
  ]);
  const historyRef = useRef([]);
  const flatListRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const breathAnim = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY()).current;
  const dragOrigin = useRef({ x: 0, y: 0 });
  const { wishlist } = useContext(WishlistContext);
  const navigation = useNavigation();
  const { themeColors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setKeyboardVisible(true);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    let loop;
    if (!open) {
      breathAnim.setValue(1);
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breathAnim, {
            toValue: 1.04,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(breathAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [open, breathAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        pan.stopAnimation((value) => {
          dragOrigin.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const baseLeft = SCREEN_W - FAB_RIGHT - FAB_SIZE;
        const baseTop = SCREEN_H - FAB_BOTTOM - FAB_SIZE;
        const minX = FAB_EDGE_MARGIN - baseLeft;
        const maxX = SCREEN_W - FAB_EDGE_MARGIN - FAB_SIZE - baseLeft;
        const minY = FAB_EDGE_MARGIN - baseTop;
        const maxY = SCREEN_H - FAB_EDGE_MARGIN - FAB_SIZE - baseTop;

        pan.setValue({
          x: clamp(dragOrigin.current.x + gestureState.dx, minX, maxX),
          y: clamp(dragOrigin.current.y + gestureState.dy, minY, maxY),
        });
      }
    })
  ).current;

  const openCopilot = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOpen(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const closeCopilot = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(slideAnim, {
      toValue: SCREEN_H,
      duration: 120,
      useNativeDriver: true,
    }).start(() => setOpen(false));
  };

  const sendMessage = async (prompt) => {
    const userText =
      typeof prompt === "string" ? prompt.trim() : inputText.trim();
    if (!userText) return;

    const userMsg = { id: Date.now().toString(), role: "user", text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newHistory = [
      ...historyRef.current,
      { role: "user", content: userText },
    ].slice(-10);
    historyRef.current = newHistory;

    // Build context from wishlist
    const ctx =
      wishlist.length > 0
        ? {
            screen: "Wishlist",
            wishlistCount: wishlist.length,
            wishlistItems: wishlist.map((w) => w.name || w.title).slice(0, 6),
          }
        : {};

    try {
      const reply = await GroqService.copilotChat(newHistory, ctx);

      const showCart = reply.includes("[SHOW_CART]");
      let cleanedReply = reply.replace(/\[SHOW_CART\]/g, "");

      const suggestedSearches = [];
      const searchRegex = /\[SUGGEST_SEARCH:\s*(.*?)\]/g;
      let match;
      while ((match = searchRegex.exec(cleanedReply)) !== null) {
        if (match[1]) suggestedSearches.push(match[1].trim());
      }
      cleanedReply = cleanedReply.replace(searchRegex, "").trim();

      historyRef.current = [
        ...historyRef.current,
        { role: "assistant", content: cleanedReply },
      ];
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: cleanedReply,
          showCart,
          suggestedSearches,
        },
      ]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          text: "I'm having trouble connecting. Please try again! 🔄",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderBubbleWrapper = (isUser, children) => {
    if (isUser) {
      return (
        <View
          style={[
            styles.bubble,
            styles.userBubble,
            { backgroundColor: themeColors.ink },
          ]}
        >
          {children}
        </View>
      );
    }
    return (
      <View
        style={[styles.bubble, styles.aiBubble, { backgroundColor: themeColors.card, borderColor: themeColors.line, borderWidth: 1 }]}
      >
        {children}
      </View>
    );
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && (
          <View
            style={[styles.aiAvatar, { backgroundColor: themeColors.aubergineSoft }]}
          >
            <Text style={[styles.aiAvatarText, { color: themeColors.primary }]}>B</Text>
          </View>
        )}
        {renderBubbleWrapper(isUser, 
          <>
          {item.text ? (
            <Text
              style={[
                styles.bubbleText,
                { color: isUser ? "#fff" : themeColors.textPrimary },
              ]}
            >
              {item.text}
            </Text>
          ) : null}

          {item.showCart && wishlist.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.cartCarousel}
            >
              {wishlist.map((product, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.miniProductCard,
                    {
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    closeCopilot();
                    navigation.navigate("ProductDetail", { product });
                  }}
                >
                  <Image
                    source={{ uri: product.image_url || product.image }}
                    style={styles.miniProductImg}
                    resizeMode="contain"
                  />
                  <Text
                    style={[
                      styles.miniProductTitle,
                      { color: themeColors.textPrimary },
                    ]}
                    numberOfLines={2}
                  >
                    {product.name || product.title}
                  </Text>
                  <Text
                    style={[
                      styles.miniProductPrice,
                      { color: themeColors.primary },
                    ]}
                  >
                    ₹
                    {product.price ||
                      (product.listings && product.listings[0]?.price) ||
                      "--"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {item.suggestedSearches && item.suggestedSearches.length > 0 && (
            <View style={styles.suggestedSearchesContainer}>
              {item.suggestedSearches.map((searchQuery, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.searchChip,
                    { backgroundColor: themeColors.primary },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    closeCopilot();
                    navigation.navigate("Search", { query: searchQuery });
                  }}
                >
                  <Ionicons name="search" size={12} color="#fff" />
                  <Text style={styles.searchChipText}>
                    Search {searchQuery}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
        )}
      </View>
    );
  };

  const pressFab = () => {
    openCopilot();
  };

  return (
    <>
      {/* Floating Action Button */}
      {!open && activeRouteName !== "Home" && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.fab,
            {
              transform: [
                ...pan.getTranslateTransform(),
                { scale: breathAnim },
              ],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: fabScale }] }}>
            <TouchableOpacity onPress={pressFab} activeOpacity={1}>
              <View style={styles.beanFab}>
                <Svg
                  pointerEvents="none"
                  width={FAB_SIZE}
                  height={FAB_SIZE}
                  viewBox="0 0 24 24"
                  style={StyleSheet.absoluteFill}
                >
                  <Path
                    d="M17.8 3.4c3.7 2.6 3.4 8.5.2 12.7-3.5 4.6-9.7 6.3-13.2 2.5-3.2-3.5-1.3-8.1 2.2-9.1 2.6-.8 3.1-2.3 4-4.1 1.3-2.6 4.3-3.7 6.8-2z"
                    fill={themeColors.primary}
                    stroke="rgba(255,255,255,0.56)"
                    strokeWidth="0.55"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Ionicons
                  name="sparkles"
                  size={25}
                  color="#FFFFFF"
                  style={styles.beanFabSparkles}
                />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}

      {/* Slide-up Panel */}
      {open && (
        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: themeColors.background,
              transform: [{ translateY: slideAnim }],
              height: isKeyboardVisible ? SCREEN_H * 0.95 : SCREEN_H * 0.82,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.panelHeader, { backgroundColor: themeColors.paper }]}>
            <View style={styles.panelHeaderLeft}>
              <View>
                <Text style={[styles.panelTitle, { color: themeColors.ink }]}>CompareZ Copilot</Text>
                <Text style={[styles.panelSubtitle, { color: themeColors.inkSoft }]}>AI Shopping Companion</Text>
              </View>
            </View>
            <TouchableOpacity onPress={closeCopilot} style={[styles.closeBtn, { backgroundColor: themeColors.aubergineSoft }]}>
              <Ionicons
                name="chevron-down"
                size={22}
                color={themeColors.inkSoft}
              />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <View style={{ flex: 1, paddingBottom: isKeyboardVisible ? keyboardHeight : 0 }}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              ListFooterComponent={
                <>
                  {messages.length === 1 && !isTyping ? (
                    <View style={styles.starterPrompts}>
                      <Text style={[styles.starterLabel, { color: themeColors.inkSoft }]}>TRY ASKING</Text>
                      {STARTER_PROMPTS.map((item) => (
                        <TouchableOpacity
                          key={item.label}
                          style={[styles.starterPrompt, { backgroundColor: themeColors.card, borderColor: themeColors.line }]}
                          onPress={() => sendMessage(item.prompt)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.starterPromptText, { color: themeColors.ink }]}>{item.label}</Text>
                          <Ionicons name="arrow-forward" size={14} color={themeColors.primary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                  {isTyping ? (
                  <View style={[styles.messageRow, styles.aiRow]}>
                    <View
                      style={[styles.aiAvatar, { backgroundColor: themeColors.aubergineSoft }]}
                    >
                      <Text style={[styles.aiAvatarText, { color: themeColors.primary }]}>B</Text>
                    </View>
                    <View
                      style={[
                        styles.bubble,
                        styles.aiBubble,
                        styles.typingBubble,
                        { backgroundColor: themeColors.card, borderColor: themeColors.line, borderWidth: 1 },
                      ]}
                    >
                      <ActivityIndicator
                        size="small"
                        color={themeColors.inkSoft}
                      />
                      <Text
                        style={[
                          styles.typingText,
                          { color: themeColors.inkSoft },
                        ]}
                      >
                        Thinking...
                      </Text>
                    </View>
                  </View>
                  ) : null}
                </>
              }
            />

            {/* Input */}
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: themeColors.paper,
                  borderTopColor: themeColors.line,
                  paddingBottom: isKeyboardVisible
                    ? 12
                    : Math.max(insets.bottom, Platform.OS === "android" ? 44 : 24) + 18,
                },
              ]}
            >
              <LiquidGlass
                radius={RADIUS.full}
                intensity={56}
                style={[
                  styles.inputWrapper,
                  {
                    borderColor: themeColors.line,
                  },
                ]}
                contentStyle={styles.inputWrapperContent}
              >
                <TextInput
                  style={[styles.input, { color: themeColors.ink }]}
                  placeholder="Ask me anything..."
                  placeholderTextColor={themeColors.inkFaint}
                  value={inputText}
                  onChangeText={setInputText}
                  returnKeyType="send"
                  onSubmitEditing={sendMessage}
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={!inputText.trim()}
                  style={styles.sendBtn}
                >
                  <View
                    style={[
                      styles.sendGradient,
                      { backgroundColor: inputText.trim() ? themeColors.primary : themeColors.line },
                    ]}
                  >
                    <Ionicons name="send" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              </LiquidGlass>
            </View>
          </View>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: FAB_BOTTOM,
    right: FAB_RIGHT,
    zIndex: 9999,
    ...SHADOWS.md,
  },
  beanFab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  beanFabSparkles: {
    transform: [{ translateX: -1 }, { translateY: 2 }],
  },
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 9998,
    overflow: "hidden",
    ...SHADOWS.md,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingTop: 18,
    paddingBottom: 14,
  },
  panelHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  panelTitle: {
    ...FONTS.editorial,
    fontSize: 18,
    lineHeight: 21,
  },
  panelSubtitle: {
    ...FONTS.uiBody,
    fontSize: 10.5,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  messageList: {
    paddingHorizontal: SPACING.xl,
    paddingTop: 18,
    paddingBottom: SPACING.xl,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: SPACING.md,
    alignItems: "flex-end",
    gap: 8,
  },
  userRow: { justifyContent: "flex-end" },
  aiRow: { justifyContent: "flex-start" },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  aiAvatarText: {
    ...FONTS.editorialBold,
    fontSize: 12,
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    ...FONTS.uiBody,
    fontSize: 13,
    lineHeight: 19,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typingText: {
    ...FONTS.caption,
  },
  inputContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  inputWrapper: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    minHeight: 46,
  },
  inputWrapperContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
  },
  input: {
    flex: 1,
    minHeight: 44,
    ...FONTS.body,
    fontSize: 14,
  },
  sendBtn: { marginLeft: 8 },
  sendGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  starterPrompts: {
    marginLeft: 36,
    marginTop: 4,
    gap: 8,
  },
  starterLabel: {
    ...FONTS.uiBodyBold,
    fontSize: 8.5,
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  starterPrompt: {
    minHeight: 46,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  starterPromptText: {
    ...FONTS.uiBodyMedium,
    fontSize: 12,
  },
  cartCarousel: {
    marginTop: SPACING.sm,
    paddingVertical: 4,
  },
  miniProductCard: {
    width: 110,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginRight: SPACING.md,
    borderWidth: 1,
  },
  miniProductImg: {
    width: "100%",
    height: 60,
    marginBottom: 6,
  },
  miniProductTitle: {
    ...FONTS.captionBold,
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 4,
  },
  miniProductPrice: {
    ...FONTS.bodyBold,
    fontSize: 12,
  },
  suggestedSearchesContainer: {
    marginTop: SPACING.sm,
    gap: 8,
  },
  searchChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    alignSelf: "flex-start",
    gap: 6,
  },
  searchChipText: {
    ...FONTS.captionBold,
    color: "#fff",
  },
});

export default AICopilot;
