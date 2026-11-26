import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Share,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "../components/Icon";
import { useTheme } from "../context/ThemeContext";
import { WishlistContext } from "../context/WishlistContext";
import { FONTS, SPACING, RADIUS, SHADOWS } from "../config/theme";
import BrandHeader from "../components/BrandHeader";
import * as Haptics from "expo-haptics";

const LibraryScreen = ({ navigation }) => {
  const { themeColors, isDark } = useTheme();
  const { wishlist, toggleWishlist } = useContext(WishlistContext);

  const [activeTab, setActiveTab] = useState("answers"); // "answers" | "products" | "history"
  const [savedAnswers, setSavedAnswers] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);

  useEffect(() => {
    loadLibraryData();
  }, []);

  const loadLibraryData = async () => {
    try {
      const answersRaw = await AsyncStorage.getItem("comparez_saved_research");
      if (answersRaw) setSavedAnswers(JSON.parse(answersRaw));

      const historyRaw = await AsyncStorage.getItem("comparex_search_history");
      if (historyRaw) setSearchHistory(JSON.parse(historyRaw));
    } catch {}
  };

  const deleteAnswer = async (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = savedAnswers.filter((item) => item.id !== id);
    setSavedAnswers(updated);
    await AsyncStorage.setItem("comparez_saved_research", JSON.stringify(updated));
  };

  const deleteHistoryItem = async (queryToDelete) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = searchHistory.filter((q) => q !== queryToDelete);
    setSearchHistory(updated);
    await AsyncStorage.setItem("comparex_search_history", JSON.stringify(updated));
  };

  const clearAllHistory = () => {
    Alert.alert("Clear Search History?", "This removes all past search queries.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("comparex_search_history");
          setSearchHistory([]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleShareAnswer = async (item) => {
    try {
      await Share.share({
        message: `${item.query}\n\n${item.summary}\n\n— CompareZ AI Library`,
      });
    } catch {}
  };

  const renderSavedAnswer = ({ item }) => (
    <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.line }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardTag, { backgroundColor: `${themeColors.primary}18` }]}>
          <Ionicons name="sparkles" size={11} color={themeColors.primary} />
          <Text style={[FONTS.monoBold, { fontSize: 10, color: themeColors.primary, marginLeft: 4 }]}>
            AI RESEARCH
          </Text>
        </View>
        <Text style={[FONTS.uiBody, { fontSize: 11, color: themeColors.inkFaint, marginLeft: "auto" }]}>
          {new Date(item.savedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
        </Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => deleteAnswer(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color={themeColors.inkFaint} />
        </TouchableOpacity>
      </View>

      <Text style={[FONTS.uiBodyBold, { fontSize: 16, color: themeColors.ink, marginTop: 8 }]}>
        {item.query}
      </Text>

      <Text style={[FONTS.uiBody, { fontSize: 13, color: themeColors.inkSoft, marginTop: 6, lineHeight: 20 }]} numberOfLines={3}>
        {item.summary}
      </Text>

      {/* Sources badge */}
      {item.sources && item.sources.length > 0 && (
        <View style={styles.sourcesRow}>
          <Ionicons name="globe-outline" size={12} color={themeColors.inkFaint} />
          <Text style={[FONTS.mono, { fontSize: 11, color: themeColors.inkFaint, marginLeft: 5 }]}>
            {item.sources.length} cited source{item.sources.length > 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={[styles.cardFooter, { borderTopColor: themeColors.line }]}>
        <TouchableOpacity
          style={styles.actionLink}
          onPress={() => navigation.navigate("AIResearch", { initialQuery: item.query })}
        >
          <Text style={[FONTS.uiBodyBold, { fontSize: 12, color: themeColors.primary }]}>
            Continue Research →
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => handleShareAnswer(item)}
        >
          <Ionicons name="share-outline" size={16} color={themeColors.inkSoft} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderWishlistProduct = ({ item }) => {
    const price = item.price || item.bestPrice || (item.listings && item.listings[0]?.price) || 0;
    const name = item.name || item.title || "Product";
    const brand = item.brand || "Brand";

    return (
      <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.line }]}>
        <View style={styles.productRow}>
          {item.image_url || item.image ? (
            <Image
              source={{ uri: item.image_url || item.image }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.productImagePlaceholder, { backgroundColor: themeColors.paper }]}>
              <Ionicons name="basket-outline" size={24} color={themeColors.inkFaint} />
            </View>
          )}

          <View style={styles.productInfo}>
            <Text style={[FONTS.monoBold, { fontSize: 10, color: themeColors.primary, textTransform: "uppercase" }]}>
              {brand}
            </Text>
            <Text style={[FONTS.uiBodyBold, { fontSize: 14, color: themeColors.ink, marginTop: 2 }]} numberOfLines={2}>
              {name}
            </Text>
            <Text style={[FONTS.monoBold, { fontSize: 16, color: themeColors.coriander || "#059669", marginTop: 4 }]}>
              ₹{price}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleWishlist(item);
            }}
          >
            <Ionicons name="heart" size={22} color={themeColors.tomato || "#EF4444"} />
          </TouchableOpacity>
        </View>

        <View style={[styles.productActions, { borderTopColor: themeColors.line }]}>
          <TouchableOpacity
            style={[styles.compareBtn, { backgroundColor: themeColors.paper }]}
            onPress={() => navigation.navigate("Search", { query: name })}
          >
            <Ionicons name="pricetags-outline" size={13} color={themeColors.ink} />
            <Text style={[FONTS.uiBodyBold, { fontSize: 12, color: themeColors.ink, marginLeft: 5 }]}>
              Compare Live Prices
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHistoryItem = ({ item }) => (
    <View style={[styles.historyRow, { backgroundColor: themeColors.card, borderColor: themeColors.line }]}>
      <TouchableOpacity
        style={styles.historyTextWrap}
        onPress={() => navigation.navigate("AIResearch", { initialQuery: item })}
      >
        <Ionicons name="time-outline" size={16} color={themeColors.inkFaint} />
        <Text style={[FONTS.uiBody, { fontSize: 14, color: themeColors.ink, marginLeft: 10, flex: 1 }]}>
          {item}
        </Text>
      </TouchableOpacity>

      <View style={styles.historyRightActions}>
        <TouchableOpacity
          style={styles.miniCompareBtn}
          onPress={() => navigation.navigate("Search", { query: item })}
        >
          <Text style={[FONTS.uiBodyBold, { fontSize: 11, color: themeColors.primary }]}>
            Prices
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => deleteHistoryItem(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color={themeColors.inkFaint} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.paper }]}>
      <BrandHeader editorial title="Library" />

      {/* ── Tabs Segmented Bar ── */}
      <View style={[styles.tabsBar, { borderBottomColor: themeColors.line }]}>
        {[
          { id: "answers", label: `Saved Answers (${savedAnswers.length})`, icon: "sparkles" },
          { id: "products", label: `Wishlist (${wishlist.length})`, icon: "heart-outline" },
          { id: "history", label: `History (${searchHistory.length})`, icon: "time-outline" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabItem,
                isActive && [styles.activeTabItem, { borderBottomColor: themeColors.primary }],
              ]}
              onPress={() => {
                setActiveTab(tab.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={isActive ? themeColors.primary : themeColors.inkSoft}
              />
              <Text
                style={[
                  FONTS.uiBodyBold,
                  {
                    fontSize: 12,
                    marginLeft: 5,
                    color: isActive ? themeColors.primary : themeColors.inkSoft,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Content List ── */}
      {activeTab === "answers" && (
        <FlatList
          data={savedAnswers}
          keyExtractor={(item) => item.id}
          renderItem={renderSavedAnswer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconCircle, { backgroundColor: `${themeColors.primary}15` }]}>
                <Ionicons name="bookmark-outline" size={30} color={themeColors.primary} />
              </View>
              <Text style={[FONTS.editorialBold, { fontSize: 18, color: themeColors.ink, marginTop: 12 }]}>
                No saved research yet
              </Text>
              <Text style={[FONTS.uiBody, { fontSize: 13, color: themeColors.inkSoft, textAlign: "center", marginTop: 4, paddingHorizontal: 32 }]}>
                When researching topics or comparing products, tap the bookmark icon to save answers here.
              </Text>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: themeColors.primary }]}
                onPress={() => navigation.navigate("AIResearch")}
              >
                <Text style={[FONTS.uiBodyBold, { fontSize: 13, color: "#FFFFFF" }]}>
                  Start AI Research
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {activeTab === "products" && (
        <FlatList
          data={wishlist}
          keyExtractor={(item, index) => item.id || String(index)}
          renderItem={renderWishlistProduct}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconCircle, { backgroundColor: `${themeColors.primary}15` }]}>
                <Ionicons name="heart-outline" size={30} color={themeColors.primary} />
              </View>
              <Text style={[FONTS.editorialBold, { fontSize: 18, color: themeColors.ink, marginTop: 12 }]}>
                Your wishlist is empty
              </Text>
              <Text style={[FONTS.uiBody, { fontSize: 13, color: themeColors.inkSoft, textAlign: "center", marginTop: 4, paddingHorizontal: 32 }]}>
                Tap the heart on any product in Search or Research to track prices and receive alerts.
              </Text>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: themeColors.primary }]}
                onPress={() => navigation.navigate("Search")}
              >
                <Text style={[FONTS.uiBodyBold, { fontSize: 13, color: "#FFFFFF" }]}>
                  Browse Products
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {activeTab === "history" && (
        <FlatList
          data={searchHistory}
          keyExtractor={(item, idx) => `${item}-${idx}`}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            searchHistory.length > 0 ? (
              <View style={styles.historyHeader}>
                <Text style={[FONTS.monoBold, { fontSize: 11, color: themeColors.inkFaint }]}>
                  RECENT QUERIES
                </Text>
                <TouchableOpacity onPress={clearAllHistory}>
                  <Text style={[FONTS.uiBodyBold, { fontSize: 12, color: themeColors.tomato || "#EF4444" }]}>
                    Clear all
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconCircle, { backgroundColor: `${themeColors.primary}15` }]}>
                <Ionicons name="time-outline" size={30} color={themeColors.primary} />
              </View>
              <Text style={[FONTS.editorialBold, { fontSize: 18, color: themeColors.ink, marginTop: 12 }]}>
                No search history
              </Text>
              <Text style={[FONTS.uiBody, { fontSize: 13, color: themeColors.inkSoft, textAlign: "center", marginTop: 4, paddingHorizontal: 32 }]}>
                Your recent searches and price comparisons will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabItem: {
    borderBottomWidth: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  iconBtn: {
    padding: 4,
  },
  sourcesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionLink: {
    paddingVertical: 4,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  heartBtn: {
    padding: 8,
  },
  productActions: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  compareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyTextWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  historyRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  miniCompareBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(22, 132, 91, 0.08)",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 18,
  },
});

export default LibraryScreen;
