import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '../components/SearchBar';
import ProductCard from '../components/ProductCard';
import { COLORS, SPACING, RADIUS, FONTS } from '../config/theme';
import api from '../config/api';

const SUGGESTIONS = ['Eggs', 'Milk', 'Rice', 'Chicken', 'Bread', 'Atta', 'Paneer', 'Oil'];

const SearchScreen = ({ navigation, route }) => {
  const [query, setQuery] = useState(route?.params?.query || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    const timer = setTimeout(() => searchProducts(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const searchProducts = async (q) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const tokens = await AsyncStorage.getItem('userTokens');
      const headers = tokens ? { 'X-User-Tokens': tokens } : {};
      
      const res = await api.get(`/compare?q=${encodeURIComponent(q)}&lat=12.9716&lng=77.5946`, { headers });
      const products = (res.data.products || []).map((p, i) => {
        const listings = p.listings || [];
        const available = listings.filter(l => l.price > 0 && l.in_stock !== false);
        const prices = available.map(l => l.price);
        const best = prices.length > 0 ? Math.min(...prices) : 0;
        const worst = prices.length > 0 ? Math.max(...prices) : 0;
        const first = available[0] || listings[0] || {};

        return {
          id: i,
          name: p.name || first.product_name || 'Product',
          brand: first.brand || '',
          price: best,
          originalPrice: worst > best ? worst : undefined,
          platformCount: available.length,
          totalPlatforms: listings.length,
          discount: worst > best ? Math.round(((worst - best) / worst) * 100) : 0,
          listings,
          bestPlatform: available.length > 0
            ? available.reduce((a, b) => a.price < b.price ? a : b).platform
            : '',
        };
      });
      setResults(products);
    } catch (e) {
      console.log('Search error:', e);
      setResults([]);
    }
    setLoading(false);
  };

  const handleProduct = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const renderEmpty = () => {
    if (loading) return null;
    if (!hasSearched) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyTitle}>Search for a product</Text>
          <Text style={styles.emptySubtitle}>Compare prices across 6 platforms</Text>

          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <Text key={s} style={styles.suggestionChip} onPress={() => setQuery(s)}>
                {s}
              </Text>
            ))}
          </View>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.border} />
        <Text style={styles.emptyTitle}>No results</Text>
        <Text style={styles.emptySubtitle}>Try a different search term</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={FONTS.h1}>Search</Text>
        <View style={{ marginTop: SPACING.lg }}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search eggs, milk, bread..."
            onClear={() => setQuery('')}
          />
        </View>
        {results.length > 0 && (
          <Text style={styles.resultCount}>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.textTertiary} />
          <Text style={styles.loadingText}>Comparing prices...</Text>
        </View>
      )}

      <FlatList
        data={results}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => handleProduct(item)} onCompare={() => handleProduct(item)} />
        )}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
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
    borderBottomColor: COLORS.divider,
  },
  resultCount: {
    ...FONTS.caption,
    marginTop: SPACING.md,
  },
  list: {
    padding: SPACING.xl,
    paddingBottom: 100,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  loadingText: {
    ...FONTS.caption,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    ...FONTS.h3,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    ...FONTS.body,
    marginBottom: SPACING.xxl,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  suggestionChip: {
    ...FONTS.captionBold,
    color: COLORS.textAccent,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
});

export default SearchScreen;
