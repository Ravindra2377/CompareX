import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '../config/theme';

const CATEGORIES = [
  { id: '1', name: 'Eggs', icon: 'egg-outline', query: 'eggs' },
  { id: '2', name: 'Milk', icon: 'water-outline', query: 'milk' },
  { id: '3', name: 'Bread', icon: 'pizza-outline', query: 'bread' },
  { id: '4', name: 'Rice', icon: 'leaf-outline', query: 'rice' },
  { id: '5', name: 'Chicken', icon: 'restaurant-outline', query: 'chicken' },
  { id: '6', name: 'Atta', icon: 'bag-outline', query: 'atta' },
  { id: '7', name: 'Oil', icon: 'flask-outline', query: 'oil' },
  { id: '8', name: 'Snacks', icon: 'fast-food-outline', query: 'chips' },
];

const TRENDING = [
  { id: '1', name: 'White Eggs (10 pcs)', best: '₹79', platform: 'Zepto', saving: '₹16' },
  { id: '2', name: 'Amul Butter 500g', best: '₹265', platform: 'Zepto', saving: '₹15' },
  { id: '3', name: 'Aashirvaad Atta 5kg', best: '₹275', platform: 'BigBasket', saving: '₹24' },
  { id: '4', name: 'Tata Tea Gold 500g', best: '₹275', platform: 'Blinkit', saving: '₹20' },
];

const HomeScreen = ({ navigation }) => {
  const { logout } = useContext(AuthContext);

  const fadeAnimHeader = React.useRef(new Animated.Value(0)).current;
  const fadeAnimCats = React.useRef(new Animated.Value(0)).current;
  const fadeAnimTrend = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(fadeAnimHeader, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(fadeAnimCats, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(fadeAnimTrend, { toValue: 1, duration: 500, useNativeDriver: true })
    ]).start();
  }, [fadeAnimHeader, fadeAnimCats, fadeAnimTrend]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Gradient Background */}
        <Animated.View style={{ opacity: fadeAnimHeader, transform: [{ translateY: fadeAnimHeader.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }}>
          <LinearGradient
            colors={COLORS.gradientCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>Good evening 👋</Text>
                <Text style={styles.title}>CompareX</Text>
              </View>
              <TouchableOpacity style={styles.avatarBtn} onPress={logout}>
                <Ionicons name="person-outline" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Bar - Lifted into the header area */}
            <TouchableOpacity
              style={styles.searchBar}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Search')}
            >
              <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.searchPlaceholder}>Search eggs, milk, bread...</Text>
              <View style={styles.searchIconBg}>
                <Ionicons name="options-outline" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Quick Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>6</Text>
            <Text style={styles.infoLabel}>Platforms</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>200+</Text>
            <Text style={styles.infoLabel}>Products</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Text style={[styles.infoValue, { color: COLORS.savings }]}>30%</Text>
            <Text style={styles.infoLabel}>Max savings</Text>
          </View>
        </View>

        {/* Categories */}
        <Animated.View style={[styles.section, { opacity: fadeAnimCats, transform: [{ translateY: fadeAnimCats.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryItem}
                activeOpacity={0.6}
                onPress={() => navigation.navigate('Search', { query: cat.query })}
              >
                <View style={styles.categoryIcon}>
                  <Ionicons name={cat.icon} size={22} color={COLORS.textSecondary} />
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Trending */}
        <Animated.View style={[styles.section, { opacity: fadeAnimTrend, transform: [{ translateY: fadeAnimTrend.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          <Text style={styles.sectionTitle}>Trending Price Drops</Text>
          {TRENDING.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.trendingItem}
              activeOpacity={0.6}
              onPress={() => navigation.navigate('Search', { query: item.name.split(' (')[0] })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.trendingName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.trendingMeta}>Best on {item.platform} · Save {item.saving}</Text>
              </View>
              <Text style={styles.trendingPrice}>{item.best}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>
          ))}
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  greeting: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    ...FONTS.h1,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  searchPlaceholder: {
    ...FONTS.body,
    flex: 1,
  },
  searchIconBg: {
    backgroundColor: COLORS.accent,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Info Row
  infoRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoValue: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  infoLabel: {
    ...FONTS.caption,
  },
  infoDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },
  // Sections
  section: {
    marginBottom: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  sectionTitle: {
    ...FONTS.h3,
    marginBottom: SPACING.lg,
  },
  // Categories
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '22%',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryName: {
    ...FONTS.caption,
    textAlign: 'center',
  },
  // Trending
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  trendingName: {
    ...FONTS.bodyBold,
    marginBottom: 4,
  },
  trendingMeta: {
    ...FONTS.caption,
  },
  trendingPrice: {
    ...FONTS.priceSmall,
    color: COLORS.savings,
    marginRight: SPACING.xs,
  },
});

export default HomeScreen;
