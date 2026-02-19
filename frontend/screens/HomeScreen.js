import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good evening 👋</Text>
            <Text style={styles.title}>CompareX</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={logout}>
            <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search-outline" size={20} color={COLORS.textTertiary} />
          <Text style={styles.searchPlaceholder}>Search eggs, milk, bread...</Text>
        </TouchableOpacity>

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
        <View style={styles.section}>
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
        </View>

        {/* Trending */}
        <View style={styles.section}>
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
        </View>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  greeting: {
    ...FONTS.caption,
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.8,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchPlaceholder: {
    ...FONTS.body,
    color: COLORS.textTertiary,
  },
  // Info Row
  infoRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.divider,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoValue: {
    ...FONTS.h2,
    marginBottom: 2,
  },
  infoLabel: {
    ...FONTS.caption,
  },
  infoDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
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
  },
  categoryItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  categoryName: {
    ...FONTS.caption,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  // Trending
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: SPACING.md,
  },
  trendingName: {
    ...FONTS.bodyBold,
    marginBottom: 2,
  },
  trendingMeta: {
    ...FONTS.caption,
  },
  trendingPrice: {
    ...FONTS.priceSmall,
    color: COLORS.savings,
  },
});

export default HomeScreen;
