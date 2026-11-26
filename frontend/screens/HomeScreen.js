import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import LiquidGlass from "../components/LiquidGlass";
import BrandHeader from "../components/BrandHeader";
import { Ionicons } from "../components/Icon";
import LocationPickerModal from "../components/LocationPickerModal";
import { AuthContext } from "../context/AuthContext";
import { WishlistContext } from "../context/WishlistContext";
import { useTheme } from "../context/ThemeContext";
import { FONTS, SHADOWS, SPACING } from "../config/theme";
import GroqService from "../services/GroqService";
import LocationService from "../services/LocationService";

const PLATFORM_MENTIONS = [
  { name: "Blinkit", pattern: /\bblinkit\b/i },
  { name: "Zepto", pattern: /\bzepto\b/i },
  { name: "BigBasket", pattern: /\b(?:big\s*basket|bigbasket)\b/i },
  { name: "Amazon", pattern: /\bamazon\b/i },
  { name: "Flipkart", pattern: /\bflipkart\b/i },
];

const getMentionedPlatforms = (text = "") =>
  PLATFORM_MENTIONS.filter(({ pattern }) => pattern.test(text)).map(
    ({ name }) => name,
  );

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const INSPIRATION_CARDS = [
  {
    id: "1",
    tag: "PRICE COMPARE",
    tagColor: "#059669",
    icon: "pricetags-outline",
    title: "Amul vs Nandini Milk",
    subtitle: "Compare Blinkit 10m vs Zepto vs BigBasket",
    query: "Compare Amul Gold Milk and Nandini GoodLife prices across platforms",
    mode: "compare",
  },
  {
    id: "2",
    tag: "HEALTH EVIDENCE",
    tagColor: "#D97706",
    icon: "globe-outline",
    title: "Cold-Pressed Mustard Oil",
    subtitle: "Health benefits, purity checks & verified sources",
    query: "Is cold-pressed mustard oil healthier? Evidence and fssai norms",
    mode: "research",
  },
  {
    id: "3",
    tag: "NUTRITION PLAN",
    tagColor: "#16845B",
    icon: "flame-outline",
    title: "Protein Basket under ₹250",
    subtitle: "Cheapest vegetarian protein combos in India",
    query: "High protein vegetarian Indian grocery basket plan under 250 rupees per day",
    mode: "shopping",
  },
  {
    id: "4",
    tag: "TECH COMPARISON",
    tagColor: "#3B82F6",
    icon: "speedometer-outline",
    title: "iPhone 16 Delivery Check",
    subtitle: "Blinkit 10-min instant vs Amazon next-day price",
    query: "iPhone 16 128gb price compare blinkit amazon",
    mode: "compare",
  },
];

const HomeScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { wishlist } = useContext(WishlistContext);
  const { themeColors } = useTheme();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [currentCity, setCurrentCity] = useState("");
  const [currentPincode, setCurrentPincode] = useState("");
  const historyRef = useRef([]);
  const scrollRef = useRef(null);
  const greetingEntrance = useRef(new Animated.Value(0)).current;
  const searchEntrance = useRef(new Animated.Value(0)).current;
  const radarEntrance = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const homePaper = themeColors.paper;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener?.(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription?.remove?.();
  }, []);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("comparex_search_history")
        .then((stored) => {
          try {
            setRecentSearches((JSON.parse(stored) || []).slice(0, 3));
          } catch {
            setRecentSearches([]);
          }
        })
        .catch(() => setRecentSearches([]));

      LocationService.init().then((location) => {
        if (!location) return;
        setCurrentCity(location.city || "");
        setCurrentPincode(location.pincode || "");
      });

      greetingEntrance.setValue(reduceMotion ? 1 : 0);
      searchEntrance.setValue(reduceMotion ? 1 : 0);
      radarEntrance.setValue(reduceMotion ? 1 : 0);

      if (reduceMotion) return undefined;

      const entrance = Animated.parallel([
        Animated.timing(greetingEntrance, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(searchEntrance, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(radarEntrance, {
          toValue: 1,
          tension: 105,
          friction: 12,
          useNativeDriver: true,
        }),
      ]);
      entrance.start();

      return () => entrance.stop();
    }, [
      greetingEntrance,
      radarEntrance,
      reduceMotion,
      searchEntrance,
    ]),
  );

  const confirmClearSearchHistory = () => {
    Alert.alert(
      "Clear search history?",
      "This removes your recent product searches from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("comparex_search_history");
            setRecentSearches([]);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
          },
        },
      ],
    );
  };

  const sendPrompt = (value, targetMode = "all") => {
    const text = (typeof value === "string" ? value : prompt).trim();
    if (!text) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrompt("");
    navigation.navigate("AIResearch", {
      initialQuery: text,
      mode: targetMode,
    });
  };

  const firstName =
    user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const latestSearch = recentSearches[0];
  const savingsRadar = latestSearch
    ? {
        eyebrow: "READY TO RECHECK",
        icon: "time-outline",
        title: latestSearch,
        description:
          "Prices can change between stores. Run a fresh comparison before you buy.",
        actionLabel: "Compare again",
        meta: "",
        onPress: () =>
          navigation.navigate("Search", { query: latestSearch }),
      }
    : wishlist.length > 0
      ? {
          eyebrow: "SAVED FOR LATER",
          icon: "comparez-wishlist",
          title: `${wishlist.length} saved product${wishlist.length === 1 ? "" : "s"}`,
          description:
            "Review your saved products and compare their current store prices.",
          actionLabel: "Review wishlist",
          meta: "Ready to compare",
          onPress: () => navigation.navigate("Likes"),
        }
      : {
          eyebrow: "START YOUR RADAR",
          icon: "comparez-search",
          title: "Make your first comparison",
          description:
            "Search for a product once and your next useful price check will appear here.",
          actionLabel: "Find a product",
          meta: "Start here",
          onPress: () => navigation.navigate("Search"),
        };

  const openSavingsRadar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    savingsRadar.onPress();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: homePaper }]}>
      <View style={[styles.container, { backgroundColor: homePaper }]}>
        <BrandHeader
          city={currentCity}
          pincode={currentPincode}
          onLocationPress={() => setLocationModalVisible(true)}
          editorial
          backgroundColor={homePaper}
        />

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            messages.length === 0 && styles.scrollContentIdle,
          ]}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              scrollRef.current?.scrollToEnd({ animated: true });
            }
          }}
        >
          <View style={messages.length === 0 && styles.idleContent}>
            <Animated.Text
              style={[
                styles.greeting,
                {
                  color: themeColors.primary,
                  opacity: greetingEntrance,
                  transform: [
                    {
                      translateY: greetingEntrance.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {getGreeting()}, {firstName}
            </Animated.Text>

            <Text
              style={[
                FONTS.editorialBold,
                {
                  fontSize: 26,
                  color: themeColors.ink,
                  marginTop: 4,
                  marginBottom: 14,
                  lineHeight: 32,
                },
              ]}
            >
              What would you like to explore or compare today?
            </Text>

            <Animated.View
              style={{
                opacity: searchEntrance,
                transform: [
                  {
                    scaleX: searchEntrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1],
                    }),
                  },
                  {
                    translateY: searchEntrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              }}
            >
              <LiquidGlass
                neutral
                radius={29}
                intensity={72}
                style={[
                  styles.composer,
                  {
                    borderColor: themeColors.line,
                  },
                ]}
                contentStyle={styles.composerContent}
              >
                <Ionicons
                  name="sparkles"
                  size={18}
                  color={themeColors.primary}
                  style={{ marginLeft: 6, marginRight: 2 }}
                />
                <TextInput
                  style={[styles.composerInput, { color: themeColors.ink }]}
                  placeholder="Ask anything, research web, or compare prices..."
                  placeholderTextColor={themeColors.inkFaint}
                  value={prompt}
                  onChangeText={setPrompt}
                  maxLength={500}
                  returnKeyType="send"
                  blurOnSubmit
                  onSubmitEditing={() => sendPrompt()}
                />
                <TouchableOpacity
                  style={[
                    styles.composerSend,
                    {
                      backgroundColor: prompt.trim()
                        ? themeColors.primary
                        : "rgba(255,255,255,0.34)",
                      borderColor: "rgba(255,255,255,0.78)",
                    },
                  ]}
                  onPress={() => sendPrompt()}
                  disabled={!prompt.trim()}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={prompt.trim() ? "#FFFFFF" : themeColors.inkFaint}
                  />
                </TouchableOpacity>
              </LiquidGlass>
            </Animated.View>

            {/* Inspiration Research & Comparison Cards */}
            <View style={{ marginTop: 18, marginBottom: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={[
                    FONTS.monoBold,
                    {
                      fontSize: 11,
                      color: themeColors.inkSoft,
                      letterSpacing: 0.5,
                    },
                  ]}
                >
                  DISCOVER & RESEARCH
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Discover")}
                >
                  <Text
                    style={[
                      FONTS.uiBodyBold,
                      { fontSize: 12, color: themeColors.primary },
                    ]}
                  >
                    Explore all →
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -4 }}
              >
                {INSPIRATION_CARDS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={{
                      width: 220,
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.line,
                      marginHorizontal: 4,
                      ...SHADOWS.sm,
                    }}
                    onPress={() => sendPrompt(item.query, item.mode)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: `${item.tagColor}18`,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name={item.icon}
                          size={12}
                          color={item.tagColor}
                        />
                      </View>
                      <Text
                        style={[
                          FONTS.monoBold,
                          {
                            fontSize: 9,
                            color: item.tagColor,
                            marginLeft: 6,
                            letterSpacing: 0.5,
                          },
                        ]}
                      >
                        {item.tag}
                      </Text>
                    </View>
                    <Text
                      style={[
                        FONTS.uiBodyBold,
                        { fontSize: 14, color: themeColors.ink, marginTop: 8 },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        FONTS.uiBody,
                        {
                          fontSize: 11,
                          color: themeColors.inkSoft,
                          marginTop: 4,
                          lineHeight: 16,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {item.subtitle}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {messages.length === 0 ? (
              <>
                <Animated.View
                  style={[
                    styles.radarSection,
                    {
                      opacity: radarEntrance,
                      transform: [
                        {
                          translateY: radarEntrance.interpolate({
                            inputRange: [0, 1],
                            outputRange: [28, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.radarSectionHeader}>
                    <Text
                      style={[
                        styles.sectionLabel,
                        styles.radarSectionLabel,
                        { color: themeColors.inkSoft },
                      ]}
                    >
                      Recent search
                    </Text>
                    {recentSearches.length > 0 ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Clear search history"
                        onPress={confirmClearSearchHistory}
                        hitSlop={8}
                      >
                        <Text
                          style={[
                            styles.clearHistory,
                            { color: themeColors.primary },
                          ]}
                        >
                          Clear history
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`${savingsRadar.actionLabel}: ${savingsRadar.title}`}
                    style={[
                      styles.radarCard,
                      { backgroundColor: themeColors.aubergineDeep },
                    ]}
                    onPress={openSavingsRadar}
                    activeOpacity={0.88}
                  >
                    <View style={styles.radarGlowLarge} />
                    <View style={styles.radarGlowSmall} />
                    <View style={styles.radarTopRow}>
                      <View style={styles.radarMark}>
                        <Ionicons
                          name={savingsRadar.icon}
                          size={19}
                          color="#FFFFFF"
                        />
                      </View>
                      <Text style={styles.radarEyebrow}>
                        {savingsRadar.eyebrow}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={2}
                      style={styles.radarTitle}
                    >
                      {savingsRadar.title}
                    </Text>
                    <Text style={styles.radarDescription}>
                      {savingsRadar.description}
                    </Text>
                    <View style={styles.radarFooter}>
                      <View style={styles.radarAction}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.radarActionText,
                            { color: themeColors.aubergineDeep },
                          ]}
                        >
                          {savingsRadar.actionLabel}
                        </Text>
                        <Ionicons
                          name="arrow-forward"
                          size={15}
                          color={themeColors.aubergineDeep}
                        />
                      </View>
                      {savingsRadar.meta ? (
                        <Text style={styles.radarMeta}>
                          {savingsRadar.meta}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </>
            ) : (
              <View style={styles.workspace}>
                <View style={styles.workspaceHeader}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      styles.workspaceLabel,
                      { color: themeColors.inkSoft },
                    ]}
                  >
                    YOUR SHOPPING WORKSPACE
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setMessages([]);
                      historyRef.current = [];
                    }}
                  >
                    <Text
                      style={[
                        styles.newBrief,
                        { color: themeColors.primary },
                      ]}
                    >
                      New brief
                    </Text>
                  </TouchableOpacity>
                </View>
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return isUser ? (
                    <View
                      key={message.id}
                      style={styles.requestBlock}
                    >
                      <Text
                        style={[
                          styles.requestLabel,
                          { color: themeColors.inkFaint },
                        ]}
                      >
                        YOUR REQUEST
                      </Text>
                      <View style={styles.requestTextRow}>
                        <Ionicons
                          name="arrow-forward"
                          size={15}
                          color={themeColors.primary}
                        />
                        <Text
                          style={[
                            styles.requestText,
                            { color: themeColors.ink },
                          ]}
                        >
                          {message.text}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View
                      key={message.id}
                      style={[
                        styles.briefCard,
                        {
                          backgroundColor: themeColors.card,
                          borderColor: themeColors.line,
                        },
                      ]}
                    >
                      <View style={styles.briefHeader}>
                        <View
                          style={[
                            styles.briefMark,
                            { backgroundColor: themeColors.aubergineSoft },
                          ]}
                        >
                          <Ionicons
                            name="beans-ai"
                            size={18}
                            color={themeColors.primary}
                          />
                        </View>
                        <View style={styles.briefHeadingCopy}>
                          <Text
                            style={[
                              styles.briefTitle,
                              { color: themeColors.ink },
                            ]}
                          >
                            Beans brief
                          </Text>
                          <Text
                            style={[
                              styles.briefMeta,
                              { color: themeColors.inkSoft },
                            ]}
                          >
                            Shopping analysis
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.briefRule,
                          { backgroundColor: themeColors.line },
                        ]}
                      />
                      <Text
                        style={[
                          styles.briefText,
                          { color: themeColors.ink },
                        ]}
                      >
                        {message.text}
                      </Text>
                      {message.searches?.length > 0 ? (
                        <View style={styles.briefActions}>
                          {message.searches.map((query) => (
                            <TouchableOpacity
                              key={query}
                              style={[
                                styles.briefAction,
                                {
                                  backgroundColor:
                                    themeColors.aubergineSoft,
                                },
                              ]}
                              onPress={() =>
                                navigation.navigate("Search", {
                                  query,
                                  platforms:
                                    message.requestedPlatforms?.length > 0
                                      ? message.requestedPlatforms
                                      : undefined,
                                })
                              }
                            >
                              <Text
                                style={[
                                  styles.briefActionText,
                                  { color: themeColors.primary },
                                ]}
                              >
                                {message.usesRequestAsSearch
                                  ? message.requestedPlatforms?.length > 0
                                    ? `Compare on ${message.requestedPlatforms.join(" + ")}`
                                    : "Start comparing"
                                  : `Compare ${query}`}
                              </Text>
                              <Ionicons
                                name="arrow-forward"
                                size={13}
                                color={themeColors.primary}
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
                {thinking ? (
                  <View
                    style={[
                      styles.analysisCard,
                      {
                        backgroundColor: themeColors.card,
                        borderColor: themeColors.line,
                      },
                    ]}
                  >
                    <ActivityIndicator
                      size="small"
                      color={themeColors.primary}
                    />
                    <View>
                      <Text
                        style={[
                          styles.analysisTitle,
                          { color: themeColors.ink },
                        ]}
                      >
                        Building your brief
                      </Text>
                      <Text
                        style={[
                          styles.analysisSubtitle,
                          { color: themeColors.inkSoft },
                        ]}
                      >
                        Beans is reviewing your shopping context
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            )}
          </View>
          <View
            style={[
              styles.bottomSpace,
              messages.length === 0 && styles.bottomSpaceIdle,
            ]}
          />
        </ScrollView>
      </View>

      <LocationPickerModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onSave={({ city, pincode }) => {
          setCurrentCity(city);
          setCurrentPincode(pincode);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: 24,
  },
  scrollContentIdle: {
    flexGrow: 1,
    paddingTop: 0,
  },
  idleContent: {
    flex: 1,
    justifyContent: "center",
  },
  greeting: {
    ...FONTS.editorial,
    fontSize: 20,
    lineHeight: 27,
    letterSpacing: -0.2,
  },
  composer: {
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    marginTop: 12,
    ...SHADOWS.sm,
  },
  composerContent: {
    paddingLeft: 19,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  composerInput: {
    ...FONTS.uiBody,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    paddingRight: 12,
    paddingVertical: 0,
  },
  composerSend: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    ...FONTS.uiBodyBold,
    fontSize: 9,
    letterSpacing: 1.35,
    marginTop: 30,
    marginBottom: 11,
  },
  radarSection: {
    marginTop: 30,
  },
  radarSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  radarSectionLabel: {
    fontFamily: "InterBold",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1.05,
    marginTop: 0,
    marginBottom: 0,
  },
  radarCard: {
    minHeight: 220,
    borderRadius: 26,
    padding: 20,
    overflow: "hidden",
    ...SHADOWS.md,
  },
  radarGlowLarge: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -72,
    top: -82,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  radarGlowSmall: {
    position: "absolute",
    width: 82,
    height: 82,
    borderRadius: 41,
    right: 46,
    bottom: -50,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  radarTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  radarMark: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  radarEyebrow: {
    ...FONTS.uiBodyBold,
    marginLeft: 10,
    fontSize: 9,
    letterSpacing: 1.3,
    color: "rgba(255,255,255,0.68)",
  },
  radarTitle: {
    ...FONTS.editorialBold,
    marginTop: 18,
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: -0.35,
    color: "#FFFFFF",
    textTransform: "capitalize",
  },
  radarDescription: {
    ...FONTS.uiBody,
    maxWidth: "90%",
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    color: "rgba(255,255,255,0.72)",
  },
  radarFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 19,
  },
  radarAction: {
    minHeight: 36,
    maxWidth: "62%",
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  radarActionText: {
    ...FONTS.uiBodyBold,
    flexShrink: 1,
    fontSize: 10.5,
  },
  radarMeta: {
    ...FONTS.uiBodyMedium,
    maxWidth: "34%",
    fontSize: 9.5,
    lineHeight: 13,
    textAlign: "right",
    color: "rgba(255,255,255,0.62)",
  },
  clearHistory: {
    ...FONTS.uiBodyBold,
    fontSize: 10,
  },
  workspace: {
    marginTop: 24,
  },
  workspaceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  workspaceLabel: {
    marginTop: 0,
    marginBottom: 0,
  },
  newBrief: {
    ...FONTS.uiBodyBold,
    fontSize: 10.5,
  },
  requestBlock: {
    marginBottom: 13,
    paddingHorizontal: 3,
  },
  requestLabel: {
    ...FONTS.uiBodyBold,
    fontSize: 8,
    letterSpacing: 1.05,
  },
  requestTextRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
  },
  requestText: {
    ...FONTS.editorial,
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    marginLeft: 8,
  },
  briefCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 17,
    marginBottom: 19,
    ...SHADOWS.sm,
  },
  briefHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  briefMark: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  briefHeadingCopy: {
    marginLeft: 10,
  },
  briefTitle: {
    ...FONTS.editorial,
    fontSize: 16,
    lineHeight: 20,
  },
  briefMeta: {
    ...FONTS.uiBody,
    fontSize: 9.5,
    marginTop: 1,
  },
  briefRule: {
    height: 1,
    marginVertical: 14,
  },
  briefText: {
    ...FONTS.uiBody,
    fontSize: 12.5,
    lineHeight: 20,
  },
  briefActions: {
    marginTop: 14,
    gap: 8,
  },
  briefAction: {
    minHeight: 42,
    borderRadius: 13,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  briefActionText: {
    ...FONTS.uiBodyBold,
    fontSize: 11,
  },
  analysisCard: {
    minHeight: 68,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  analysisTitle: {
    ...FONTS.editorial,
    fontSize: 14,
  },
  analysisSubtitle: {
    ...FONTS.uiBody,
    fontSize: 9.5,
    marginTop: 2,
  },
  bottomSpace: {
    height: 130,
  },
  bottomSpaceIdle: {
    height: 84,
  },
});

export default HomeScreen;
