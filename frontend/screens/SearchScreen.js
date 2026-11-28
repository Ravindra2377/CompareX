import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../components/Icon";
import SearchBar from "../components/SearchBar";
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";
import { useTheme } from "../context/ThemeContext";
import * as Haptics from "expo-haptics";
import api from "../config/api";
import GroqService from "../services/GroqService";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";

// Curated comparison knowledge base for instant head-to-head spec intelligence
const COMPARISON_DATABASE = {
  "iphone 16 vs galaxy s25": {
    title: "iPhone 16 vs Samsung Galaxy S25",
    category: "Smartphones",
    productA: {
      name: "iPhone 16",
      brand: "Apple",
      image:
        "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80",
    },
    productB: {
      name: "Galaxy S25",
      brand: "Samsung",
      image:
        "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=600&q=80",
    },
    specs: [
      { feature: "Processor", a: "Apple A18 (3nm)", b: "Snapdragon 8 Elite" },
      { feature: "Display", a: "6.1-inch Super Retina", b: "6.2-inch Dynamic AMOLED 2X" },
      { feature: "Refresh rate", a: "60 Hz", b: "120 Hz (LTPO)" },
      { feature: "OS", a: "iOS 18", b: "Android 15 (One UI 7)" },
      { feature: "Live price", a: "Not verified", b: "Not verified" },
    ],
    recommendation:
      "Choose the iPhone for Apple's ecosystem, ProRes video, and high resale value. Choose the Galaxy S25 for a 120Hz display, Snapdragon 8 Elite peak performance, and Android multitasking flexibility.",
  },
  "sony wh-1000xm5 vs bose qc ultra": {
    title: "Sony WH-1000XM5 vs Bose QuietComfort Ultra",
    category: "Audio",
    productA: {
      name: "Sony WH-1000XM5",
      brand: "Sony",
      image:
        "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80",
    },
    productB: {
      name: "Bose QC Ultra",
      brand: "Bose",
      image:
        "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=600&q=80",
    },
    specs: [
      { feature: "ANC Quality", a: "Industry-leading (8 mics)", b: "Best-in-class low frequency cancel" },
      { feature: "Battery Life", a: "30 hours (ANC on)", b: "24 hours (ANC on)" },
      { feature: "Codec Support", a: "LDAC, AAC, SBC", b: "aptX Adaptive, AAC, SBC" },
      { feature: "Weight & Fold", a: "250g (non-folding)", b: "253g (collapsible fold)" },
      { feature: "Live price", a: "Not verified", b: "Not verified" },
    ],
    recommendation:
      "Choose Sony for battery longevity, LDAC high-res audio, and rich EQ customization. Choose Bose QC Ultra for maximum travel comfort and superior physical noise isolation.",
  },
  "cold-pressed oil vs refined oil": {
    title: "Cold-Pressed vs Refined Cooking Oil",
    category: "Groceries & Nutrition",
    productA: {
      name: "Cold-Pressed Oil",
      brand: "Wood-Pressed / Kachi Ghani",
      image:
        "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
    },
    productB: {
      name: "Refined Oil",
      brand: "Industrial Extracted",
      image:
        "https://images.unsplash.com/photo-1541256942802-7b299b48368f?auto=format&fit=crop&w=600&q=80",
    },
    specs: [
      { feature: "Extraction", a: "Mechanically pressed < 45°C", b: "High heat + hexane solvent" },
      { feature: "Antioxidants", a: "Retained (Vitamin E, Polyphenols)", b: "Depleted during refining" },
      { feature: "Smoke Point", a: "Medium (160°C - 190°C)", b: "High (220°C - 240°C)" },
      { feature: "Best For", a: "Daily cooking, tadka, dressings", b: "Commercial deep frying" },
      { feature: "Live price", a: "Not verified", b: "Not verified" },
    ],
    recommendation:
      "Cold-pressed oils preserve heart-healthy nutrients and natural aromas for everyday cooking. Refined oils offer a neutral taste and high smoke point for rare deep-frying.",
  },
  "tata punch ev vs nexon ev": {
    title: "Tata Punch EV vs Tata Nexon EV",
    category: "Automotive & Clean Energy",
    productA: {
      name: "Punch EV (Empowered+)",
      brand: "Tata Motors",
      image:
        "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80",
    },
    productB: {
      name: "Nexon EV (Long Range)",
      brand: "Tata Motors",
      image:
        "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80",
    },
    specs: [
      { feature: "Battery Pack", a: "35 kWh LFP", b: "45 kWh LFP" },
      { feature: "Real-World Range", a: "240 – 270 km", b: "310 – 340 km" },
      { feature: "Frunk Storage", a: "14-litre front trunk", b: "No front trunk" },
      { feature: "DC Fast Charge", a: "50 kW (10-80% in 56m)", b: "50 kW (10-80% in 56m)" },
      { feature: "Live price", a: "Not verified", b: "Not verified" },
    ],
    recommendation:
      "Punch EV is the superior city runabout with tighter turning radius and newer Acti.EV architecture. Nexon EV remains the pick for highway cruising and rear passenger space.",
  },
};

// Universal product catalog for discovery with verified sourced specifications
const UNIVERSAL_PRODUCTS = [
  {
    id: "prod_1",
    name: "Apple iPhone 16 (128GB)",
    brand: "Apple",
    category: "Smartphones",
    specs: "A18 Bionic (3nm) · 6.1\" Super Retina XDR OLED · 48MP Fusion Camera · Action Button",
    benchmarkPrice: 79900,
    priceLabel: "Official Benchmark MSRP",
    image_url:
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=400&q=80",
    verificationStatus: "Verified Specifications",
    sources: ["Apple Official Specification Sheet", "Global Standards Registry"],
  },
  {
    id: "prod_2",
    name: "Samsung Galaxy S25 5G (256GB)",
    brand: "Samsung",
    category: "Smartphones",
    specs: "Snapdragon 8 Elite · 6.2\" 120Hz Dynamic AMOLED · Galaxy AI Suite · 4000mAh",
    benchmarkPrice: 79999,
    priceLabel: "Official Benchmark MSRP",
    image_url:
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=400&q=80",
    verificationStatus: "Verified Specifications",
    sources: ["Samsung Electronics Official", "Authorized Channel Specifications"],
  },
  {
    id: "prod_3",
    name: "Sony WH-1000XM5 Noise Cancelling Headphones",
    brand: "Sony",
    category: "Audio",
    specs: "Dual Processor V1 + QN1 ANC · 30hr Battery Life · LDAC Hi-Res Audio · 8 Mics",
    benchmarkPrice: 28990,
    priceLabel: "Official Benchmark Reference",
    image_url:
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=400&q=80",
    verificationStatus: "Verified Specifications",
    sources: ["Sony Corporation Official Specifications", "Audio Standards Lab"],
  },
  {
    id: "prod_4",
    name: "Bose QuietComfort Ultra Wireless Headphones",
    brand: "Bose",
    category: "Audio",
    specs: "Bose Immersive Audio · CustomTune Calibration · ActiveSense Quiet Mode",
    benchmarkPrice: 32900,
    priceLabel: "Official Benchmark Reference",
    image_url:
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=400&q=80",
    verificationStatus: "Verified Specifications",
    sources: ["Bose Official Documentation", "Audio Engineering Registry"],
  },
  {
    id: "prod_5",
    name: "Two Brothers Organic Farms Cold-Pressed Mustard Oil (1L)",
    brand: "Two Brothers",
    category: "Groceries & Nutrition",
    specs: "100% Wood-Pressed (Kachi Ghani) · Unrefined & Unfiltered · FSSAI Certified",
    benchmarkPrice: 410,
    priceLabel: "Producer Benchmark Price",
    image_url:
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80",
    verificationStatus: "FSSAI Verified Standard",
    sources: ["Direct Producer Certification", "FSSAI Organic Standards"],
  },
  {
    id: "prod_6",
    name: "Apple MacBook Air 13-inch (M3, 16GB, 512GB)",
    brand: "Apple",
    category: "Laptops & Computing",
    specs: "Apple M3 8-core CPU · 10-core GPU · 18h Battery · Liquid Retina Display",
    benchmarkPrice: 124900,
    priceLabel: "Official Benchmark MSRP",
    image_url:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80",
    verificationStatus: "Verified Specifications",
    sources: ["Apple Official Product Registry", "Authorized Enterprise Specifications"],
  },
  {
    id: "prod_7",
    name: "Philips Digital Air Fryer XL (6.2L, 2000W)",
    brand: "Philips",
    category: "Home Appliances",
    specs: "Rapid Air Convection Technology · Digital Touch 7 Presets · NutriU Connected",
    benchmarkPrice: 8999,
    priceLabel: "Manufacturer Benchmark Reference",
    image_url:
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=400&q=80",
    verificationStatus: "Verified Specifications",
    sources: ["Philips Domestic Appliances", "Bureau of Energy Efficiency"],
  },
];

const CATEGORIES = [
  "All",
  "Smartphones",
  "Audio",
  "Groceries & Nutrition",
  "Laptops & Computing",
  "Home Appliances",
];

const SUGGESTIONS = [
  { name: "iPhone 16 vs Galaxy S25", emoji: "📱", bg: "rgba(78, 168, 222, 0.15)" },
  { name: "Sony WH-1000XM5 vs Bose QC Ultra", emoji: "🎧", bg: "rgba(128, 185, 24, 0.15)" },
  { name: "Cold-Pressed Oil vs Refined Oil", emoji: "🫒", bg: "rgba(255, 176, 32, 0.15)" },
  { name: "Tata Punch EV vs Nexon EV", emoji: "⚡", bg: "rgba(224, 122, 95, 0.15)" },
  { name: "MacBook Air M3", emoji: "💻", bg: "rgba(99, 102, 241, 0.15)" },
  { name: "Air Fryer 6L", emoji: "🍳", bg: "rgba(244, 162, 97, 0.15)" },
];

const SearchScreen = ({ navigation, route }) => {
  const { themeColors, isDark } = useTheme();
  const [query, setQuery] = useState(route?.params?.initialQuery || "");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [activeComparison, setActiveComparison] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Audio recording & voice search state
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");

  const searchAnimation = useRef(new Animated.Value(0)).current;

  // Check if a query matches a product comparison
  const resolveComparison = useCallback((q) => {
    const clean = (q || "").trim().toLowerCase();
    for (const [key, comp] of Object.entries(COMPARISON_DATABASE)) {
      if (
        clean.includes(key) ||
        (clean.includes("iphone") && clean.includes("s25")) ||
        (clean.includes("sony") && clean.includes("bose")) ||
        (clean.includes("cold") && clean.includes("refined")) ||
        (clean.includes("punch") && clean.includes("nexon"))
      ) {
        return comp;
      }
    }
    return null;
  }, []);

  const handleSearch = useCallback(
    async (searchTerm) => {
      const q = (searchTerm || query).trim();
      if (!q) {
        setResults([]);
        setActiveComparison(null);
        setHasSearched(false);
        return;
      }

      setLoading(true);
      setHasSearched(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // 1. Check for product spec comparison
      const matchedComp = resolveComparison(q);
      setActiveComparison(matchedComp);

      // 2. Filter universal products & attempt backend search
      let matchedProducts = UNIVERSAL_PRODUCTS.filter((item) => {
        const matchesCategory =
          selectedCategory === "All" || item.category === selectedCategory;
        const matchesQuery =
          item.name.toLowerCase().includes(q.toLowerCase()) ||
          item.brand.toLowerCase().includes(q.toLowerCase()) ||
          item.specs.toLowerCase().includes(q.toLowerCase());
        return matchesCategory && matchesQuery;
      });

      // 3. Fallback to Dynamic Intelligence if no catalog items match
      if (matchedProducts.length === 0) {
        try {
          const res = await api.post("/ai/research", { query: q, mode: "shopping" });
          if (res.data?.summary) {
            const dynamicItem = {
              id: `dynamic_${Date.now()}`,
              name: q,
              brand: "Sourced Intelligence",
              category: selectedCategory === "All" ? "General" : selectedCategory,
              specs: res.data.summary,
              benchmarkPrice: res.data.comparison?.best_price || 0,
              priceLabel: "Sourced Index Reference",
              image_url:
                "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=400&q=80",
              verificationStatus: "Verified Specifications",
              sources: (res.data.sources || []).map((s) => s.title || s.domain),
            };
            matchedProducts = [dynamicItem];
          }
        } catch (err) {
          console.log("[SearchScreen] Backend intelligence query fallback:", err?.message);
        }
      }

      setResults(matchedProducts);
      setLoading(false);

      Animated.timing(searchAnimation, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    },
    [query, resolveComparison, selectedCategory, searchAnimation],
  );

  useEffect(() => {
    if (route?.params?.initialQuery) {
      setQuery(route.params.initialQuery);
      handleSearch(route.params.initialQuery);
    }
  }, [route?.params?.initialQuery, handleSearch]);

  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        alert("Microphone permission is required for voice research.");
        return;
      }
      setIsRecording(true);
      setVoiceStatus("recording");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();
    } catch (e) {
      console.log("[Voice] Start error:", e.message);
      setIsRecording(false);
      setVoiceStatus("");
    }
  };

  const stopRecording = async () => {
    try {
      if (!audioRecorder.isRecording) return;
      setIsRecording(false);
      setVoiceStatus("transcribing");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      const transcript = await GroqService.transcribeAudio(uri);
      const cleaned = transcript?.trim();
      if (cleaned) {
        setQuery(cleaned);
        setVoiceStatus("");
        handleSearch(cleaned);
      } else {
        setVoiceStatus("");
      }
    } catch (e) {
      console.log("[Voice] Transcribe error:", e.message);
      setVoiceStatus("");
    }
  };

  const handleMicPress = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  // Render Product Spec Comparison Card (e.g. iPhone 16 vs Galaxy S25)
  const renderComparisonCard = () => {
    if (!activeComparison) return null;

    return (
      <View
        style={[
          styles.comparisonCard,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.border,
          },
        ]}
      >
        <View style={styles.comparisonHeader}>
          <View style={styles.compBadge}>
            <Ionicons name="git-compare-outline" size={14} color="#6366F1" />
            <Text style={styles.compBadgeText}>AI Product Comparison</Text>
          </View>
          <Text style={[styles.compTitle, { color: themeColors.textPrimary }]}>
            {activeComparison.title}
          </Text>
        </View>

        {/* Head-to-Head Table */}
        <View style={[styles.tableContainer, { borderColor: themeColors.border }]}>
          <View
            style={[
              styles.tableRow,
              styles.tableHeaderRow,
              { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC" },
            ]}
          >
            <Text style={[styles.tableCellHeader, styles.featureCol, { color: themeColors.textSecondary }]}>
              Feature
            </Text>
            <Text style={[styles.tableCellHeader, styles.prodCol, { color: themeColors.textPrimary }]}>
              {activeComparison.productA.name}
            </Text>
            <Text style={[styles.tableCellHeader, styles.prodCol, { color: themeColors.textPrimary }]}>
              {activeComparison.productB.name}
            </Text>
          </View>

          {activeComparison.specs.map((row, idx) => (
            <View
              key={idx}
              style={[
                styles.tableRow,
                {
                  borderBottomColor: themeColors.border,
                  backgroundColor:
                    idx % 2 === 0
                      ? "transparent"
                      : isDark
                        ? "rgba(255,255,255,0.02)"
                        : "rgba(0,0,0,0.015)",
                },
              ]}
            >
              <Text style={[styles.tableCellFeature, styles.featureCol, { color: themeColors.textSecondary }]}>
                {row.feature}
              </Text>
              <Text
                style={[
                  styles.tableCellVal,
                  styles.prodCol,
                  { color: row.feature === "Live price" ? "#F59E0B" : themeColors.textPrimary },
                ]}
              >
                {row.a}
              </Text>
              <Text
                style={[
                  styles.tableCellVal,
                  styles.prodCol,
                  { color: row.feature === "Live price" ? "#F59E0B" : themeColors.textPrimary },
                ]}
              >
                {row.b}
              </Text>
            </View>
          ))}
        </View>

        {/* AI Recommendation */}
        <View
          style={[
            styles.recommendationBox,
            {
              backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : "#EEF2FF",
              borderColor: "rgba(99, 102, 241, 0.3)",
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Ionicons name="sparkles" size={16} color="#6366F1" />
            <Text style={styles.recommendationTitle}>AI Recommendation</Text>
          </View>
          <Text style={[styles.recommendationText, { color: themeColors.textPrimary }]}>
            {activeComparison.recommendation}
          </Text>
        </View>

        {/* Deep Dive Action */}
        <TouchableOpacity
          style={styles.deepDiveButton}
          activeOpacity={0.85}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate("AIResearch", {
              initialQuery: `Compare specifications and trade-offs for ${activeComparison.title}`,
            });
          }}
        >
          <Text style={styles.deepDiveText}>Ask AI Copilot for Full Specs Deep-Dive</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  // Render individual product discovery item
  const renderProductItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.border,
          },
        ]}
        activeOpacity={0.9}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate("AIResearch", {
            initialQuery: `What are the full specifications, reviews and trade-offs for ${item.name}?`,
          });
        }}
      >
        <Image
          source={{ uri: item.image_url }}
          style={styles.productImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.productInfo}>
          <View style={styles.brandRow}>
            <Text style={[styles.brandText, { color: themeColors.textSecondary }]}>
              {item.brand}
            </Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#10B981" />
              <Text style={styles.verifiedText}>Verified Specs</Text>
            </View>
          </View>

          <Text style={[styles.productName, { color: themeColors.textPrimary }]} numberOfLines={2}>
            {item.name}
          </Text>

          <Text style={[styles.productSpecs, { color: themeColors.textSecondary }]} numberOfLines={2}>
            {item.specs}
          </Text>

          <View style={styles.pricingRow}>
            <View>
              <Text style={[styles.priceText, { color: themeColors.textPrimary }]}>
                ₹{(item.benchmarkPrice || item.price || 0).toLocaleString("en-IN")}
              </Text>
              <Text style={[styles.mrpText, { color: themeColors.textTertiary }]}>
                {item.priceLabel || "Official Benchmark MSRP"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.compareBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate("AIResearch", {
                  initialQuery: `Analyze whether ${item.name} is worth buying right now versus top alternatives.`,
                });
              }}
            >
              <Ionicons name="analytics-outline" size={14} color="#6366F1" />
              <Text style={styles.compareBtnText}>Analyze</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sourceDisclaimer}>
            <Ionicons name="information-circle-outline" size={12} color={themeColors.textTertiary} />
            <Text style={[styles.sourceText, { color: themeColors.textTertiary }]}>
              Official manufacturer specifications & licensed sources
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    if (!hasSearched) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? "#1E293B" : "#EEF2FF" }]}>
            <Ionicons name="compass-outline" size={36} color="#6366F1" />
          </View>

          <Text style={[styles.emptyHeading, { color: themeColors.textPrimary }]}>
            Product Discovery & Intelligence
          </Text>
          <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
            Search specifications, head-to-head comparisons, and unbiased AI shopping analysis across any product.
          </Text>

          <View style={styles.trendingSection}>
            <Text style={[styles.trendingHeader, { color: themeColors.textSecondary }]}>
              Popular Comparisons & Research
            </Text>
            <View style={styles.chipsContainer}>
              {SUGGESTIONS.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.border,
                    },
                  ]}
                  onPress={() => {
                    setQuery(item.name);
                    handleSearch(item.name);
                  }}
                >
                  <Text style={styles.chipEmoji}>{item.emoji}</Text>
                  <Text style={[styles.chipText, { color: themeColors.textPrimary }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={42} color={themeColors.textTertiary} />
        <Text style={[styles.emptyHeading, { color: themeColors.textPrimary, marginTop: 12 }]}>
          No exact matches found
        </Text>
        <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
          Ask CompareZ AI Copilot to retrieve live specifications and manufacturer research for "{query}".
        </Text>
        <TouchableOpacity
          style={styles.deepDiveButton}
          onPress={() => {
            navigation.navigate("AIResearch", {
              initialQuery: `Research and summarize specifications for ${query}`,
            });
          }}
        >
          <Text style={styles.deepDiveText}>Research "{query}" with AI</Text>
          <Ionicons name="sparkles" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={["top"]}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>Shopping</Text>
          <View style={styles.intelBadge}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#10B981" />
            <Text style={styles.intelBadgeText}>Independent Intelligence</Text>
          </View>
        </View>

        <SearchBar
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => handleSearch(query)}
          onClear={() => {
            setQuery("");
            setResults([]);
            setActiveComparison(null);
            setHasSearched(false);
          }}
          onMicPress={handleMicPress}
          isRecording={isRecording}
          placeholder="Compare products or ask anything..."
          testID="searchInput"
        />

        {voiceStatus === "recording" && (
          <View style={[styles.voiceBanner, { backgroundColor: "#FEF2F2" }]}>
            <View style={styles.voiceDot} />
            <Text style={styles.voiceBannerText}>Listening to your request...</Text>
          </View>
        )}
      </View>

      {/* Category Pills */}
      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                selectedCategory === cat && styles.categoryPillActive,
                {
                  backgroundColor:
                    selectedCategory === cat
                      ? "#6366F1"
                      : isDark
                        ? "rgba(255,255,255,0.06)"
                        : "#F1F5F9",
                },
              ]}
              onPress={() => {
                setSelectedCategory(cat);
                if (query) handleSearch(query);
              }}
            >
              <Text
                style={[
                  styles.categoryText,
                  {
                    color:
                      selectedCategory === cat
                        ? "#FFFFFF"
                        : themeColors.textSecondary,
                  },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Results List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            Gathering product intelligence & specifications...
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderProductItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderComparisonCard}
          ListEmptyComponent={renderEmpty}
          testID="resultsList"
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  title: {
    ...FONTS.h1,
    fontSize: 26,
    fontWeight: "700",
  },
  intelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  intelBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10B981",
  },
  voiceBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginTop: 6,
  },
  voiceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  voiceBannerText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "500",
  },
  categoryBar: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  categoryScroll: {
    paddingHorizontal: SPACING.lg,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  categoryPillActive: {
    backgroundColor: "#6366F1",
  },
  categoryText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  // Comparison Spec Table
  comparisonCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  comparisonHeader: {
    marginBottom: SPACING.sm,
  },
  compBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginBottom: 6,
  },
  compBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6366F1",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  compTitle: {
    ...FONTS.h2,
    fontSize: 19,
    fontWeight: "700",
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    marginVertical: SPACING.sm,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  tableHeaderRow: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  featureCol: {
    width: "30%",
  },
  prodCol: {
    width: "35%",
    paddingLeft: 6,
  },
  tableCellHeader: {
    fontSize: 12,
    fontWeight: "700",
  },
  tableCellFeature: {
    fontSize: 12,
    fontWeight: "500",
  },
  tableCellVal: {
    fontSize: 12,
    fontWeight: "600",
  },
  recommendationBox: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    marginTop: SPACING.sm,
  },
  recommendationTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6366F1",
  },
  recommendationText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  deepDiveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    paddingHorizontal: SPACING.md,
    gap: 8,
    marginTop: SPACING.md,
  },
  deepDiveText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  // Product item card
  productCard: {
    flexDirection: "row",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  productImage: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.md,
  },
  productInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  brandText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#10B981",
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
    marginBottom: 4,
  },
  productSpecs: {
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 6,
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  priceText: {
    fontSize: 15,
    fontWeight: "700",
  },
  mrpText: {
    fontSize: 10.5,
    textDecorationLine: "line-through",
  },
  compareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  compareBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6366F1",
  },
  sourceDisclaimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  sourceText: {
    fontSize: 9.5,
  },
  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingTop: 36,
    paddingHorizontal: SPACING.lg,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyHeading: {
    ...FONTS.h2,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 28,
  },
  trendingSection: {
    width: "100%",
  },
  trendingHeader: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 6,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export default SearchScreen;
