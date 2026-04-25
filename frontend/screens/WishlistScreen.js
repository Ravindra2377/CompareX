import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, Linking, Alert, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../config/api";
import { buildPlatformSearchUrl } from "../config/utils";
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";
import { AppButton } from "../components/SharedUI";

const MOCK_ITEMS = [];

const WishlistScreen = ({ navigation }) => {
  const { user } = React.useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/wishlist?user_id=${user?.id}`);
      setItems(response.data || []);
    } catch (error) {
      console.error("[Wishlist] Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchWishlist();
    }, [user?.id])
  );

  const removeItem = async (id) => {
    try {
      await axios.delete(`${API_URL}/wishlist/${id}`);
      setItems(items.filter((i) => i.id !== id));
    } catch (error) {
      console.error("[Wishlist] Delete error:", error);
    }
  };

  const handleItemPress = (item) => {
    const url = item.product_url || buildPlatformSearchUrl(item.platform, item.product_name);
    
    if (!url) {
      Alert.alert("Link unavailable", "This product doesn't have a direct link saved and couldn't generate a search link.");
      return;
    }

    navigation.navigate("InAppBrowser", {
      url,
      title: item.product_name,
      platform: item.platform,
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.item}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.itemImage} />
      ) : (
        <View style={[styles.itemImage, styles.placeholderImage]}>
          <Ionicons name="image-outline" size={20} color={COLORS.textTertiary} />
        </View>
      )}
      
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.product_name}
        </Text>
        <Text style={styles.itemMeta}>
          ₹{item.best_price} · {item.platform}
        </Text>
      </View>

      <View style={styles.itemActions}>
        <TouchableOpacity
          onPress={() => removeItem(item.id)}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={FONTS.h1}>Wishlist</Text>
        <Text style={styles.count}>{items.length} saved products</Text>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          loading && (
            <ActivityIndicator
              color={COLORS.primary}
              style={{ marginVertical: SPACING.xl }}
            />
          )
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No saved items</Text>
            <Text style={styles.emptySubtitle}>
              Heart products to track prices
            </Text>
            <AppButton
              label="Start Searching"
              variant="secondary"
              style={styles.emptyCta}
              onPress={() => navigation.navigate("Search")}
            />
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 64,       // Normalized
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  count: {
    ...FONTS.caption,
    marginTop: SPACING.xs,
  },
  list: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 100,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...FONTS.bodyBold,
    marginBottom: 2,
  },
  itemMeta: {
    ...FONTS.caption,
  },
  alertBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    ...FONTS.h3,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    ...FONTS.body,
    textAlign: "center",
  },
  emptyCta: {
    marginTop: SPACING.lg,
  },
});

export default WishlistScreen;
