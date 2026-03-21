import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";
import { AppButton } from "../components/SharedUI";

const MOCK_ITEMS = [];

const WishlistScreen = ({ navigation }) => {
  const [items, setItems] = useState(MOCK_ITEMS);

  const toggleAlert = (id) => {
    setItems(items.map((i) => (i.id === id ? { ...i, alert: !i.alert } : i)));
  };

  const removeItem = (id) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.itemMeta}>
          ₹{item.price} · {item.platform}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.alertBtn}
        onPress={() => toggleAlert(item.id)}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      >
        <Ionicons
          name={item.alert ? "notifications" : "notifications-outline"}
          size={18}
          color={item.alert ? COLORS.textAccent : COLORS.textTertiary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => removeItem(item.id)}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      >
        <Ionicons name="close" size={18} color={COLORS.textTertiary} />
      </TouchableOpacity>
    </View>
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
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: "#FFFFFF",
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
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    gap: SPACING.lg,
    ...SHADOWS.sm,
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
