import React, {
  useState,
  useEffect,
  useRef,
  useReducer,
  useCallback,
  useContext,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  TouchableOpacity,
  Animated,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import SearchBar from "../components/SearchBar";
import ProductCard from "../components/ProductCard";
import PerformanceDebugPanel from "../components/PerformanceDebugPanel";
import { getGlobalMonitor } from "../services/PerformanceMonitor";
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from "../config/theme";
import * as Haptics from "expo-haptics";
import PlatformScraperService from "../services/PlatformScraperService";
import PlatformDOMScraperService from "../services/PlatformDOMScraperService";
import api from "../config/api";
import { AuthContext } from "../context/AuthContext";

const SUGGESTIONS = [
  "Eggs",
  "Milk",
  "Rice",
  "Chicken",
  "Bread",
  "Atta",
  "Paneer",
  "Oil",
];

const PLATFORMS = ["Blinkit", "Zepto", "BigBasket", "Amazon", "Flipkart"];
const ENABLE_BACKEND_FALLBACK = true;
const ENABLE_BACKEND_COLLECTION = true;
const DEFAULT_PLATFORM_TIMEOUT_MS = 15000;
const OVERALL_SEARCH_TIMEOUT_MS = 25000;
const PLATFORM_TIMEOUTS = {
  Blinkit: 12000,
  Zepto: 12000,
  BigBasket: 12000,
  Amazon: 15000,
  Flipkart: 15000,
};
const SEARCH_DEBOUNCE_MS = 400;
const PARTIAL_AGGREGATION_DELAY_MS = 30;    // ⬇ was 60ms — surface partial results faster

// Resource-blocking helper: allow only navigation, API/JSON, and WebSocket traffic.
// Blocks images, fonts, analytics, and stylesheets to cut WebView load time by 1.5-3s.
const BLOCKED_RESOURCE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.eot',
  '.css',
  '.mp4', '.webm',
];
const BLOCKED_TRACKER_DOMAINS = [
  'google-analytics.com', 'googletagmanager.com', 'facebook.net',
  'doubleclick.net', 'hotjar.com', 'segment.com', 'mixpanel.com',
  'amplitude.com', 'sentry.io', 'newrelic.com', 'datadog-browser-agent',
  'clevertap.com', 'moengage.com', 'webengage.com', 'appsflyer.com',
];

const shouldBlockWebViewRequest = (request) => {
  try {
    const url = (request.url || '').toLowerCase();
    if (!url.startsWith('http')) return false; // allow blob://, about:blank etc.
    // Block by file extension
    for (const ext of BLOCKED_RESOURCE_EXTENSIONS) {
      const urlWithoutQuery = url.split('?')[0];
      if (urlWithoutQuery.endsWith(ext)) return true;
    }
    // Block tracker domains
    for (const domain of BLOCKED_TRACKER_DOMAINS) {
      if (url.includes(domain)) return true;
    }
    return false;
  } catch {
    return false;
  }
};
const RESULT_CARD_HEIGHT = 184;
const SEARCH_CACHE_VERSION = 2;

const NON_PRICE_TOKEN_REGEX =
  /%|\b(off|mins?|min|ml|ltr|litre|litres|kg|g|gm|grams?|pcs?|piece|pack|combo)\b/i;

const sanitizeProductName = (rawName) => {
  const name = String(rawName || "").trim();
  if (!name) return "";

  let cleaned = name
    .replace(/\u00a0/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/\b\d+\s*mins?\b/gi, " ")
    .replace(/₹\s*[0-9]+(?:\.[0-9]+)?/gi, " ")
    .replace(/\b(add|buy\s*now|qty|view\s*more|off)\b/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*[kK]?\s*Ratings?.*$/i, "")
    .replace(/\bRatings?.*$/i, "")
    .replace(/\bReviews?.*$/i, "")
    .replace(/[|]+/g, " ")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s*\(\s*/g, " (")
    .replace(/\s*\)\s*/g, ") ")
    .replace(/\s+/g, " ")
    .trim();

  // Repair common fragmented tokens from DOM text merges, e.g. "Go d rej" -> "Godrej".
  for (let i = 0; i < 3; i += 1) {
    cleaned = cleaned.replace(
      /\b([A-Za-z]{2,})\s([A-Za-z])\s([A-Za-z]{2,})\b/g,
      "$1$2$3",
    );
  }

  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Remove duplicated trailing quantities like "... 1 kg ... 1 kg" from merged platform titles.
  const qtyPattern = /(\d+(?:\.\d+)?\s*(?:kg|g|gm|l|ml|pcs?|pack))$/i;
  const trailingQty = cleaned.match(qtyPattern)?.[1] || "";
  if (trailingQty) {
    const head = cleaned.slice(0, -trailingQty.length).trim();
    const escapedQty = trailingQty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const qtyRegex = new RegExp(`\\b${escapedQty}\\b`, "ig");
    const count = (cleaned.match(qtyRegex) || []).length;
    if (count > 1) {
      const collapsedHead = head
        .replace(qtyRegex, " ")
        .replace(/\s+/g, " ")
        .trim();
      cleaned = `${collapsedHead} ${trailingQty}`.replace(/\s+/g, " ").trim();
    }
  }

  return cleaned;
};

const normalizeUnits = (str) => {
  return str
    .replace(/\b0\.5\s*l\b/gi, "500ml")
    .replace(/\b1\s*l\b/gi, "1000ml")
    .replace(/\b0\.25\s*l\b/gi, "250ml")
    .replace(/\blitres?\b/gi, "l")
    .replace(/\b1\s*kg\b/gi, "1000g")
    .replace(/\b0\.5\s*kg\b/gi, "500g")
    .replace(/\b0\.25\s*kg\b/gi, "250g")
    .replace(/\bgrams?\b/gi, "g")
    .replace(/\bgm\b/gi, "g");
};

const getProductMatchKey = (name) => {
  let clean = sanitizeProductName(name).toLowerCase();
  if (!clean) return "";

  // Normalize units before stripping punctuation
  clean = normalizeUnits(clean);

  // Strip punctuation and unnecessary words
  const stopWords = new Set([
    "fresh", "new", "original", "pack", "pouch", "bottle", "net",
    "quantity", "medium", "large", "small", "pc", "pcs", "the", "a", "an", "of"
  ]);

  let baseWords = clean
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9.\s]/g, " ")
    .split(/\s+/)
    .map(t => t.trim())
    .filter(Boolean)
    .filter(t => !stopWords.has(t));

  let normalized = baseWords.join(" ");

  // Standardize spaces between numbers and units
  normalized = normalized
    .replace(/(\d+)\s+(ml|g|kg|l)\b/g, "$1$2")
    .replace(/(ml|g|kg|l)\b/g, " $1")
    .replace(/\s+/g, " ")
    .trim();

  // Extract primary quantity to append at the end
  let qtyMatch = normalized.match(/\b\d+(?:\.\d+)?\s?(ml|g|kg|l)\b/);
  let qty = qtyMatch ? qtyMatch[0].replace(/\s+/g, "") : "";

  // If quantity was extracted, remove it from the main string
  if (qty) {
    normalized = normalized.replace(new RegExp(qtyMatch[0], "g"), "").replace(/\s+/g, " ").trim();
  }

  // Remove completely isolated numbers (often model numbers or garbage without units if a qty exists)
  normalized = normalized.split(/\s+/).filter(t => !/^\d+(\.\d+)?$/.test(t)).join(" ");

  let finalWords = normalized.split(/\s+/).slice(0, 4);
  
  // Plural deduplication for matching words
  finalWords = finalWords.map(t => (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t));

  const key = (finalWords.join(" ") + (qty ? " " + qty : "")).trim();
  
  if (!key) return clean.slice(0, 30);
  return key;
};

const selectBestDisplayName = (listings = [], fallback = "") => {
  const candidates = listings
    .map((l) => sanitizeProductName(l?.product_name || ""))
    .filter((name) => name.length >= 4);

  if (!candidates.length) {
    return sanitizeProductName(fallback || "Product");
  }

  const scoreName = (name) => {
    const parenCount = (name.match(/[()]/g) || []).length;
    const qtyCount = (
      name.match(/\b\d+(?:\.\d+)?\s*(?:kg|g|gm|l|ml|pcs?|pack)\b/gi) || []
    ).length;
    const pipeCount = (name.match(/\|/g) || []).length;
    return (
      name.length +
      parenCount * 10 +
      Math.max(0, qtyCount - 1) * 14 +
      pipeCount * 2
    );
  };

  return candidates.sort((a, b) => scoreName(a) - scoreName(b))[0];
};

const CACHE_TTL_MS = 5 * 60 * 1000;

const areStringArraysEqual = (a = [], b = []) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const extractNumericPrice = (raw) => {
  if (raw === null || raw === undefined) return 0;

  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.round(raw * 100) / 100;
  }

  if (typeof raw !== "string") return 0;
  const text = raw.trim();
  if (!text) return 0;

  if (NON_PRICE_TOKEN_REGEX.test(text) && !/(₹|rs\.?|inr)/i.test(text)) {
    return 0;
  }

  const currencyMatch = text.match(/(?:₹|rs\.?|inr)\s*([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]+)?)/i);
  if (currencyMatch?.[1]) {
    const parsed = parseFloat(currencyMatch[1].replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 100) / 100;
  }

  const genericMatch = text.match(/([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]+)?)/);
  if (!genericMatch?.[1]) return 0;
  const parsed = parseFloat(genericMatch[1].replace(/,/g, ''));
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 100) / 100;
};

const extractLabeledPriceHints = (rawText) => {
  const compact = String(rawText || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!compact) {
    return { price: 0, mrp: 0 };
  }

  const priceMatch = compact.match(
    /\bprice\b\s*:?\s*₹\s*([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]+)?)/i,
  );
  const mrpMatch = compact.match(/\bmrp\b\s*:?\s*₹\s*([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]+)?)/i);

  return {
    price: priceMatch?.[1] ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0,
    mrp: mrpMatch?.[1] ? parseFloat(mrpMatch[1].replace(/,/g, '')) : 0,
  };
};

const normalizeIncomingPrice = (product) => {
  const sellingCandidates = [
    product?.price,
    product?.discountPrice,
    product?.discount_price,
    product?.offerPrice,
    product?.offer_price,
    product?.sellingPrice,
    product?.selling_price,
    product?.finalPrice,
    product?.final_price,
  ];

  const mrpCandidates = [
    product?.mrp,
    product?.originalPrice,
    product?.original_price,
    product?.listPrice,
    product?.list_price,
    product?.strikePrice,
    product?.strike_price,
  ];

  let price = 0;
  for (const candidate of sellingCandidates) {
    const parsed = extractNumericPrice(candidate);
    if (parsed > 0) {
      price = parsed;
      break;
    }
  }

  let mrp = 0;
  for (const candidate of mrpCandidates) {
    const parsed = extractNumericPrice(candidate);
    if (parsed > 0) {
      mrp = parsed;
      break;
    }
  }

  const labeledHints = extractLabeledPriceHints(
    product?.raw_text || product?.rawText || "",
  );

  if (labeledHints.price > 0) {
    price = labeledHints.price;
  }

  if (labeledHints.mrp > 0) {
    mrp = labeledHints.mrp;
  }

  if (!price && mrp) price = mrp;
  if (!mrp && price) mrp = price;

  const discountValue = extractNumericPrice(
    product?.discount_value ?? product?.discountValue,
  );
  const discountPercent = Number(
    product?.discount_percent ?? product?.discountPercent ?? 0,
  );

  // Guardrail: some DOM snippets expose "₹21 OFF" and parsers may mistake 21 as selling price.
  // If that happens and MRP/discount metadata exists, reconstruct selling price.
  if (mrp > 0 && discountValue > 0) {
    const derivedFromValue = Math.round((mrp - discountValue) * 100) / 100;
    if (derivedFromValue > 0 && Math.abs(price - discountValue) < 0.51) {
      price = derivedFromValue;
    }
  }

  if (mrp > 0 && discountPercent > 0 && discountPercent < 100) {
    const derivedFromPercent =
      Math.round(mrp * (1 - discountPercent / 100) * 100) / 100;
    const discountAmountFromPercent =
      Math.round(mrp * (discountPercent / 100) * 100) / 100;
    if (
      derivedFromPercent > 0 &&
      Math.abs(price - discountAmountFromPercent) < 0.75
    ) {
      price = derivedFromPercent;
    }
  }

  if (price && mrp && price > mrp) {
    price = mrp;
  }

  // Validation: reject extreme outliers (discount > 75%)
  // Such prices are likely parsing errors or unsustainable flash sales
  // Use MRP as more reliable fallback
  if (price > 0 && mrp > 0) {
    const discountRatio = ((mrp - price) / mrp) * 100;
    if (discountRatio > 75) {
      price = mrp; // Use MRP instead of extreme discount price
    }
  }

  return {
    price: price > 0 ? price : 0,
    mrp: mrp > 0 ? mrp : price > 0 ? price : 0,
  };
};

const reducer = (state, action) => {
  switch (action.type) {
    case "setConnected":
      return {
        ...state,
        connectedPlatforms: action.payload,
        forceUpdate: state.forceUpdate + 1,
      };
    default:
      return state;
  }
};

const SearchScreen = ({ navigation, route }) => {
  const [query, setQuery] = useState(route?.params?.query || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [platformResults, setPlatformResults] = useState({});
  const [searchUrls, setSearchUrls] = useState({});
  const [currentSearchQuery, setCurrentSearchQuery] = useState("");
  const [tipIndex, setTipIndex] = useState(0);
  const [captchaPlatform, setCaptchaPlatform] = useState(null); // Platform currently showing CAPTCHA
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef(null);
  const { user } = useContext(AuthContext);

  const [state, dispatch] = useReducer(reducer, {
    connectedPlatforms: [],
    forceUpdate: 0,
  });

  const connectedPlatformsRef = useRef([]);
  const connectedPlatformTokensRef = useRef({});
  // Pulse animation while platforms are still loading
  const SAVING_TIPS = [
    "Compare price per unit; same name can have different pack sizes.",
    "Zepto and Blinkit flash deals can change every hour.",
    "Bulk packs often save 15-30 percent versus single units.",
    "Check quantity carefully: 500 g vs 1 kg changes real value.",
    "Biggest savings are often on dairy and everyday staples.",
  ];

  useEffect(() => {
    if (loading) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoopRef.current.start();
    } else {
      if (pulseLoopRef.current) pulseLoopRef.current.stop();
      pulseAnim.setValue(1);
    }
  }, [loading]);

  useEffect(() => {
    if (!loading) return;
    setTipIndex(0);
    const id = setInterval(
      () => setTipIndex((i) => (i + 1) % SAVING_TIPS.length),
      3500,
    );
    return () => clearInterval(id);
  }, [loading]);

  const storedTokensRef = useRef({});
  const activeSearchPlatformsRef = useRef([]);
  const resultsCacheRef = useRef({});
  const lastSearchKeyRef = useRef("");

  const webViewRefs = useRef({});
  const searchTimeoutRef = useRef(null);
  const aggregateTimerRef = useRef(null);
  const searchSessionIdRef = useRef(0);
  const platformResultsRef = useRef({});
  const aggregatedSessionIdRef = useRef(null);
  const currentSearchQueryRef = useRef("");
  const injectedPlatformsRef = useRef({});
  const platformTimeoutsRef = useRef({}); // Track per-platform timeouts
  const fallbackAttemptedRef = useRef(new Set()); // Prevent infinite backend fallback retries
  const currentWebViewUrlsRef = useRef({}); // Track current URL of each WebView

  const armPlatformTimeout = (platform, sessionId) => {
    if (platformTimeoutsRef.current[platform]) {
      clearTimeout(platformTimeoutsRef.current[platform]);
    }

    const timeoutMs = PLATFORM_TIMEOUTS[platform] || DEFAULT_PLATFORM_TIMEOUT_MS;

    platformTimeoutsRef.current[platform] = setTimeout(() => {
      if (Number(sessionId) !== Number(searchSessionIdRef.current)) {
        return;
      }
      if (!platformResultsRef.current[platform]) {
        console.log(`[Search] ${platform} timed out, marking as failed`);
        handleWebViewMessage(platform, {
          nativeEvent: {
            data: JSON.stringify({
              type: "SEARCH_RESULTS",
              platform,
              sessionId,
              error: "WebView timeout",
              success: false,
              products: [],
            }),
          },
        });
      }
    }, timeoutMs);
  };

  function clearScheduledAggregation() {
    if (aggregateTimerRef.current) {
      clearTimeout(aggregateTimerRef.current);
      aggregateTimerRef.current = null;
    }
  }

  function scheduleAggregateResults(
    sessionId,
    delayMs = PARTIAL_AGGREGATION_DELAY_MS,
  ) {
    if (Number(sessionId) !== Number(searchSessionIdRef.current)) {
      return;
    }

    clearScheduledAggregation();
    aggregateTimerRef.current = setTimeout(() => {
      aggregateTimerRef.current = null;
      aggregateResults(sessionId);
    }, delayMs);
  }

  const canInjectForPlatform = useCallback(
    (platform, currentUrl, searchUrl) => {
      const current = String(currentUrl || "").toLowerCase();
      const target = String(searchUrl || "").toLowerCase();

      if (!current) return false;

      if (target && current.includes(target.split("?")[0])) {
        return true;
      }

      if (platform === "Zepto") {
        return (
          current.includes("zepto.com") &&
          (current.includes("/search") || current.includes("query="))
        );
      }

      if (platform === "BigBasket") {
        return (
          current.includes("bigbasket.com") &&
          (current.includes("/ps/") || current.includes("q="))
        );
      }

      if (platform === "Blinkit") {
        return (
          current.includes("blinkit.com") &&
          (current.includes("/s/") || current.includes("q="))
        );
      }

      if (platform === "Amazon") {
        return (
          current.includes("amazon.in") &&
          (current.includes("/s?") || current.includes("/s/") || current.includes("k=") || current.includes("captcha"))
        );
      }

      if (platform === "Flipkart") {
        return (
          current.includes("flipkart.com") &&
          (current.includes("/search") || current.includes("q="))
        );
      }

      return false;
    },
    [],
  );

  const injectDomParser = (platform, reason) => {
    const currentUrl = (currentWebViewUrlsRef.current[platform] || "").split(
      "#",
    )[0];
    const sessionForKey = searchSessionIdRef.current;
    const reasonKey = "";
    const injectKey = `${sessionForKey}:${currentUrl || "no-url"}${reasonKey}`;

    // Don't inject on about:blank or invalid URLs — no cookie access
    if (!currentUrl || currentUrl === "about:blank" || !currentUrl.startsWith("http")) {
      console.log(`[Search] Skipping injection on invalid URL: ${currentUrl}`);
      return;
    }

    // Prevent duplicate injection for the same platform+URL in this session.
    if (injectedPlatformsRef.current[platform] === injectKey) {
      return;
    }
    injectedPlatformsRef.current[platform] = injectKey;

    const platformToken = connectedPlatformTokensRef.current[platform] || null;
    let parseScript = PlatformDOMScraperService.getParseScript(platform, platformToken);
    const apiScript = null;

    if (!parseScript && !apiScript) {
      console.log(`[Search] No parser available for ${platform}`);
      return;
    }

    const sessionId = searchSessionIdRef.current;
    const sessionPreamble = `window.__CompareZ_SESSION_ID__ = ${JSON.stringify(
      sessionId,
    )}; true;`;

    console.log(`[Search] EXECUTING injectDomParser for ${platform} (${reason}) - script length: ${parseScript ? parseScript.length : 0}`);

    try {
      console.log(
        `[Search] Injecting DOM parser for ${platform}${reason ? ` (${reason})` : ""} @ ${currentUrl || "unknown-url"}`,
      );

      // Probe: verify injectJavaScript actually executes for this WebView.
      const probe = `
        (function(){
          try {
            window.__rnMsg = window.__rnMsg || (window.ReactNativeWebView && window.ReactNativeWebView.postMessage.bind(window.ReactNativeWebView));
            var sendMsg = window.__rnMsg || (window.ReactNativeWebView && window.ReactNativeWebView.postMessage);
            var hasBridge = !!sendMsg;
            var msg = '[InjectProbe] platform=${platform} reason=${reason || ""} hasBridge=' + hasBridge +
              ' url=' + (window.location && window.location.href) +
              ' title=' + (document && document.title) +
              ' ready=' + (document && document.readyState);
            if (sendMsg) {
              sendMsg(JSON.stringify({type:'LOG', message: msg}));
            }
          } catch(e) {}
        })();
        true;
      `;

      webViewRefs.current[platform]?.injectJavaScript(
        sessionPreamble + probe + (apiScript || "") + (parseScript || ""),
      );
    } catch (err) {
      console.error(`[Search] Failed to inject parser for ${platform}:`, err);
    }
  };

  useEffect(() => {
    checkConnectedPlatforms();
  }, [checkConnectedPlatforms]);

  useEffect(() => {
    let cancelled = false;

    const hydrateStoredTokens = async () => {
      try {
        const tokensRaw = await AsyncStorage.getItem("userTokens");
        if (cancelled) {
          return;
        }

        const parsed = tokensRaw ? JSON.parse(tokensRaw) : {};
        storedTokensRef.current = parsed;

        const tokenMap = {};
        PLATFORMS.forEach((platform) => {
          if (parsed?.[platform] && Object.keys(parsed[platform]).length > 0) {
            tokenMap[platform] = parsed[platform];
          }
        });
        connectedPlatformTokensRef.current = tokenMap;
      } catch (err) {
        if (!cancelled) {
          console.error("[Search] Error hydrating tokens:", err);
        }
      }
    };

    hydrateStoredTokens();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    connectedPlatformsRef.current = state.connectedPlatforms;
  }, [state.connectedPlatforms]);

  useFocusEffect(
    useCallback(() => {
      checkConnectedPlatforms();
    }, [checkConnectedPlatforms]),
  );

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      lastSearchKeyRef.current = "";
      setSearchUrls({});
      return;
    }
    if (connectedPlatformsRef.current.length === 0) {
      return;
    }

    const normalizedQuery = query.trim().toLowerCase();
    const platformSignature = [...connectedPlatformsRef.current]
      .sort()
      .join("|");
    const searchKey = `${SEARCH_CACHE_VERSION}::${normalizedQuery}::${platformSignature}`;
    if (lastSearchKeyRef.current === searchKey) {
      return;
    }

    const timer = setTimeout(() => searchProducts(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, state.connectedPlatforms]);

  const getConnectedPlatformsSnapshot = useCallback(async () => {
    try {
      const supportedPlatforms = ["Blinkit", "BigBasket", "Zepto", "Amazon", "Flipkart"];
      const parsed = storedTokensRef.current || {};

      const tokenMap = {};
      supportedPlatforms.forEach((plat) => {
        if (parsed?.[plat] && Object.keys(parsed[plat]).length > 0) {
          tokenMap[plat] = parsed[plat];
        }
      });
      connectedPlatformTokensRef.current = tokenMap;

      // Search should remain functional without account linkage; tokens are optional.
      return supportedPlatforms.sort();
    } catch (e) {
      console.error("[Search] Error reading connections:", e);
      return ["BigBasket", "Blinkit", "Zepto", "Amazon", "Flipkart"];
    }
  }, []);

  const checkConnectedPlatforms = useCallback(() => {
    getConnectedPlatformsSnapshot()
      .then((connected) => {
        const current = connectedPlatformsRef.current || [];
        if (areStringArraysEqual(current, connected)) {
          return;
        }
        connectedPlatformsRef.current = connected;
        dispatch({ type: "setConnected", payload: connected });
      })
      .catch((err) =>
        console.error("[Search] Error in checkConnectedPlatforms:", err),
      );
  }, [getConnectedPlatformsSnapshot, dispatch]);

  const searchProducts = async (q) => {
    const monitor = getGlobalMonitor();
    monitor.mark("search-start");

    const normalizedQuery = q.trim().toLowerCase();
    const platformSignature = [...connectedPlatformsRef.current]
      .sort()
      .join("|");
    const searchKey = `${SEARCH_CACHE_VERSION}::${normalizedQuery}::${platformSignature}`;

    const cached = resultsCacheRef.current[searchKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      monitor.mark("search-cache-hit");
      const duration = monitor.measure(
        "search-from-cache",
        "search-start",
        "search-cache-hit",
      );
      console.log(`[Perf] Cache hit: ${duration.toFixed(2)}ms`);
      setResults(cached.results);
      setHasSearched(true);
      setLoading(false);
      currentSearchQueryRef.current = q;
      setCurrentSearchQuery(q);
      lastSearchKeyRef.current = searchKey;
      return;
    }

    // Clear previous search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    clearScheduledAggregation();
    // Clear any existing platform timeouts
    Object.values(platformTimeoutsRef.current).forEach(clearTimeout);
    platformTimeoutsRef.current = {};

    // Generate new session ID to reject old results
    const newSessionId = Date.now();
    searchSessionIdRef.current = newSessionId;
    aggregatedSessionIdRef.current = null;
    fallbackAttemptedRef.current.clear(); // Reset per-platform fallback guard for new search
    setLoading(true);
    setHasSearched(true);
    setPlatformResults({});
    platformResultsRef.current = {}; // Clear ref too
    lastSearchKeyRef.current = searchKey;
    setCurrentSearchQuery(q);
    currentSearchQueryRef.current = q;
    setCaptchaPlatform(null); // Reset CAPTCHA state on new search

    // Clear injected flags
    injectedPlatformsRef.current = {};

    // Snapshot connected platforms at the moment of search to avoid stale closures.
    const platformsSnapshot = connectedPlatformsRef.current;
    connectedPlatformsRef.current = platformsSnapshot;
    activeSearchPlatformsRef.current = platformsSnapshot;
    if (platformsSnapshot.length === 0) {
      console.log(
        `[Search] Starting new search session ${newSessionId} for "${q}" on 0 platforms (none connected)`,
      );
      setSearchUrls({});
      setLoading(false);
      return;
    }

    // Generate search URLs for each platform
    const urls = {};
    platformsSnapshot.forEach((platform) => {
      const url = PlatformDOMScraperService.getSearchUrl(platform, q);
      if (url) {
        urls[platform] = url;
      }
    });

    setSearchUrls(urls);

    // Attempt concurrent injection immediately (and shortly after) so all platforms
    // can start parsing at nearly the same time without waiting only on onLoadEnd.
    const tryParallelInject = (reason) => {
      platformsSnapshot.forEach((platform) => {
        const searchUrl = urls[platform];
        const currentUrl = currentWebViewUrlsRef.current[platform] || "";
        if (canInjectForPlatform(platform, currentUrl, searchUrl)) {
          injectDomParser(platform, reason);
        }
      });
    };

    setTimeout(() => tryParallelInject("searchStartParallel-150ms"), 150);
    setTimeout(() => tryParallelInject("searchStartParallel-700ms"), 700);

    // Clear any existing platform timeouts
    Object.values(platformTimeoutsRef.current).forEach(clearTimeout);
    platformTimeoutsRef.current = {};

    // Set per-platform timeout to prevent hanging on unresponsive WebViews
    platformsSnapshot.forEach((platform) => {
      armPlatformTimeout(platform, newSessionId);
    });

    // Set timeout for search completion
    const overallTimeoutMs = OVERALL_SEARCH_TIMEOUT_MS;
    searchTimeoutRef.current = setTimeout(() => {
      console.log(
        `[Search] Timeout reached for session ${newSessionId}, aggregating results...`,
      );
      // Clear any remaining platform timeouts
      Object.values(platformTimeoutsRef.current).forEach(clearTimeout);
      platformTimeoutsRef.current = {};
      scheduleAggregateResults(newSessionId, 0);
    }, overallTimeoutMs);
  };

  const handleWebViewMessage = (platform, event) => {
    try {
      const monitor = getGlobalMonitor();
      const rawData = JSON.parse(event.nativeEvent.data);

      const normalizeIncomingProduct = (product, fallbackPlatform) => {
        const rawName = String(
          product?.raw_product_name ||
            product?.product_name ||
            product?.name ||
            "",
        ).trim();
        const normalizedPrice = normalizeIncomingPrice(product);
        return {
          product_name: sanitizeProductName(rawName),
          raw_product_name: rawName,
          brand: product?.brand || "",
          price: normalizedPrice.price,
          mrp: normalizedPrice.mrp,
          image_url: product?.image_url || "",
          product_url: product?.product_url || product?.deepLink || "",
          in_stock:
            product?.in_stock !== undefined
              ? !!product.in_stock
              : product?.inStock !== undefined
                ? !!product.inStock
                : true,
          weight: product?.weight || product?.quantity || "",
          quantity: product?.quantity || product?.weight || "",
          rating: Number(product?.rating || 0),
          rating_count: Number(
            product?.rating_count || product?.reviewCount || 0,
          ),
          discount_percent: Number(
            product?.discount_percent || product?.discountPercent || 0,
          ),
          discount_value: Number(
            product?.discount_value || product?.discountValue || 0,
          ),
          raw_text: product?.raw_text || "",
          platform: product?.platform || fallbackPlatform,
        };
      };

      const data =
        rawData && rawData.type === "PRODUCTS"
          ? {
              type: "SEARCH_RESULTS",
              platform: rawData.platform || platform,
              sessionId: rawData.sessionId || searchSessionIdRef.current,
              success:
                Array.isArray(rawData.products) && rawData.products.length > 0,
              error:
                Array.isArray(rawData.products) && rawData.products.length > 0
                  ? null
                  : "Parser returned 0 products",
              products: (rawData.products || []).map((product) =>
                normalizeIncomingProduct(product, platform),
              ),
            }
          : rawData;

      if (data.type === "TOKENS_SYNC" || data.type === "SYNC_TOKENS") {
        persistPlatformTokens(platform, data.payload || {});
        return;
      }

      if (data.type === "SEARCH_RESULTS") {
        if (Array.isArray(data.products)) {
          data.products = data.products.map((product) =>
            normalizeIncomingProduct(product, platform),
          );
          
          if (platform === 'Amazon' && data.products.length > 0) {
            const sample = data.products[0];
            console.log(`[Debug-Amazon] Incoming product after normalize: name="${(sample.product_name || '').substring(0, 40)}", image_url="${(sample.image_url || 'EMPTY').substring(0, 80)}", platform=${sample.platform}`);
          }
        }

        // Reject late messages from older searches when sessionId is provided
        if (data.sessionId && Number(data.sessionId) !== Number(searchSessionIdRef.current)) {
          console.log(
            `[Search] Ignoring ${platform} results for old session ${data.sessionId} (current: ${searchSessionIdRef.current})`,
          );
          return;
        }

        // Clear the platform timeout since we received a response
        if (platformTimeoutsRef.current[platform]) {
          clearTimeout(platformTimeoutsRef.current[platform]);
          delete platformTimeoutsRef.current[platform];
        }

        console.log(
          `[Search] Received ${
            data.products?.length || 0
          } products from ${platform} (session: ${searchSessionIdRef.current})`,
        );

        if (platform === "BigBasket" && Array.isArray(data.products)) {
          const sample = data.products.slice(0, 3).map((p) => ({
            name: p.product_name,
            price: p.price,
            mrp: p.mrp,
            rawText: String(p.raw_text || "").slice(0, 160),
          }));
          console.log(
            `[Debug-BigBasket] Incoming sample: ${JSON.stringify(sample)}`,
          );
        }

        const monitor = getGlobalMonitor();
        monitor.mark(`platform-${platform}-result`);
        monitor.measure(
          `time-to-${platform}-result`,
          "search-start",
          `platform-${platform}-result`,
        );
        if (
          data.error ||
          !data.success ||
          (data.products && data.products.length === 0)
        ) {
          console.log(
            `[Search] ${platform} error/empty: ${data.error || "0 products"}`,
          );

          // Optional backend fallback (disabled by default to keep scraping fully client-side)
          if (ENABLE_BACKEND_FALLBACK) {
            const fallbackKey = `${platform}:${searchSessionIdRef.current}`;
            if (!fallbackAttemptedRef.current.has(fallbackKey)) {
              fallbackAttemptedRef.current.add(fallbackKey);
              fallbackToBackend(
                platform,
                currentSearchQueryRef.current,
                searchSessionIdRef.current,
              );
              return; // Let fallback handle the state update
            }
          }
          // Fallback already tried — fall through and store the empty result
        }

        setPlatformResults((prev) => {
          const prevEntry = prev[platform];
          const incomingProductsCount = data.products?.length || 0;
          const prevProductsCount = prevEntry?.products?.length || 0;

          // Avoid overwriting a successful/non-empty result with a later empty/error result
          if (
            prevEntry &&
            prevEntry.success &&
            prevProductsCount > 0 &&
            (!data.success || incomingProductsCount === 0)
          ) {
            return prev;
          }

          const updated = {
            ...prev,
            [platform]: {
              products: data.products || [],
              success: data.success,
              error: data.error,
              sessionId: searchSessionIdRef.current, // Mark with current session
            },
          };

          // Update ref synchronously
          platformResultsRef.current = updated;

          // Check if all platforms have responded
          const respondedCount = Object.keys(updated).length;
          const expectedCount =
            activeSearchPlatformsRef.current.length ||
            connectedPlatformsRef.current.length ||
            state.connectedPlatforms.length;
          const hasUsableProducts = data.success && incomingProductsCount > 0;
          if (respondedCount === expectedCount) {
            console.log(
              `[Search] All platforms responded for session ${searchSessionIdRef.current}, aggregating now...`,
            );
            if (searchTimeoutRef.current) {
              clearTimeout(searchTimeoutRef.current);
            }
            scheduleAggregateResults(searchSessionIdRef.current, 0);
          } else if (hasUsableProducts) {
            scheduleAggregateResults(searchSessionIdRef.current);
          }

          return updated;
        });
      } else if (data.type === "LOG") {
        // Capture console.log from WebView
        console.log(`[WebView-${platform}] ${data.message}`);
      }
    } catch (e) {
      console.error(`[Search] Error parsing ${platform} results:`, e);
    }
  };

  const persistPlatformTokens = useCallback(async (platform, payload) => {
    try {
      if (!platform || !payload || typeof payload !== "object") return;

      const existingTokens = connectedPlatformTokensRef.current[platform] || {};
      const mergedPayload = {
        ...existingTokens,
        ...payload,
        _searchCapturedAt: new Date().toISOString(),
      };

      connectedPlatformTokensRef.current = {
        ...connectedPlatformTokensRef.current,
        [platform]: mergedPayload,
      };

      const stored = { ...(storedTokensRef.current || {}) };
      stored[platform] = {
        ...(stored[platform] || {}),
        ...mergedPayload,
      };
      storedTokensRef.current = stored;
      await AsyncStorage.setItem("userTokens", JSON.stringify(stored));
    } catch (err) {
      console.warn(`[Search] Failed to persist ${platform} tokens:`, err);
    }
  }, []);

  // to avoid re-triggering the fallback check.
  const writePlatformResult = React.useCallback(
    (platform, products, success, errorMsg, sessionId) => {
      if (Number(sessionId) !== Number(searchSessionIdRef.current)) return; // stale session, ignore
      setPlatformResults((prev) => {
        const prevEntry = prev[platform];
        // Don't overwrite a good prior result with an empty one
        if (
          prevEntry &&
          prevEntry.success &&
          prevEntry.products?.length > 0 &&
          !success
        ) {
          return prev;
        }
        const updated = {
          ...prev,
          [platform]: { products, success, error: errorMsg },
        };
        platformResultsRef.current = updated;
        const respondedCount = Object.keys(updated).length;
        const expectedCount =
          activeSearchPlatformsRef.current.length ||
          connectedPlatformsRef.current.length ||
          state.connectedPlatforms.length;
        if (respondedCount >= expectedCount) {
          if (errorMsg && errorMsg.includes("CAPTCHA")) {
            setCaptchaPlatform(platform);
          }
          if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
          scheduleAggregateResults(sessionId, 0);
        } else if (success && products?.length > 0) {
          scheduleAggregateResults(sessionId);
        }
        return updated;
      });
    },
    [state.connectedPlatforms.length],
  );

  const fallbackToBackend = async (platform, fallbackQuery, sessionId) => {
    try {
      console.log(
        `[Search] Falling back to backend API for ${platform} query: ${fallbackQuery}`,
      );
      const tokens = storedTokensRef.current || {};

      // Pass scoped token first, otherwise fall back to all tokens.
      const scopedTokens = {};
      const livePlatformTokens = connectedPlatformTokensRef.current[platform];
      if (tokens[platform] || livePlatformTokens) {
        scopedTokens[platform] = {
          ...(tokens[platform] || {}),
          ...(livePlatformTokens || {}),
        };
      }
      // If no scoped token exists, fall back to all tokens so backend can still resolve provider auth
      const tokensForHeader =
        Object.keys(scopedTokens).length > 0 ? scopedTokens : tokens;

      const response = await api.get("/compare", {
        headers: { "X-User-Tokens": JSON.stringify(tokensForHeader) },
        params: { 
          q: fallbackQuery, 
          lat: 12.9716, 
          lng: 77.5946,
          sessionId: sessionId 
        },
      });

      console.log(`[Search] Backend fallback response status: ${response.status}`);

      const platformMatches = (listingPlatform, expectedPlatform) => {
        const lp = String(listingPlatform || "")
          .trim()
          .toLowerCase();
        const ep = String(expectedPlatform || "")
          .trim()
          .toLowerCase();
        if (!lp || !ep) return false;
        return lp === ep;
      };

      const allListings = [];
      if (response.data?.products) {
        response.data.products.forEach((group) => {
          group.listings?.forEach((listing) => {
            if (
              platformMatches(listing.platform, platform) &&
              listing.price > 0
            ) {
              const normalizedPrice = normalizeIncomingPrice(listing);
              allListings.push({
                product_name: listing.product_name,
                brand: group.name,
                price: normalizedPrice.price,
                mrp: normalizedPrice.mrp,
                image_url: listing.image_url || listing.deep_link,
                product_url: listing.deep_link,
                in_stock: true,
                weight: "",
                platform,
              });
            }
          });
        });
      }

      console.log(
        `[Search] Backend fallback for ${platform} returned ${allListings.length} items`,
      );
      // Write DIRECTLY to state — do not call handleWebViewMessage (avoids re-triggering loop)
      writePlatformResult(
        platform,
        allListings,
        allListings.length > 0,
        allListings.length === 0 ? "Backend returned 0 products" : null,
        sessionId,
      );
    } catch (e) {
      const status = e?.response?.status;
      const statusText = e?.response?.statusText;
      const errMsg = status
        ? `HTTP ${status} ${statusText || ""}`.trim()
        : e?.message || "Network error";
      console.warn(
        `[Search] Backend fallback for ${platform} failed: ${errMsg}`,
      );
      writePlatformResult(
        platform,
        [],
        false,
        `Backend fallback failed: ${errMsg}`,
        sessionId,
      );
    }
  };

  const aggregateResults = (sessionId) => {
    const monitor = getGlobalMonitor();
    monitor.mark("search-aggregate-start");
    // Verify this is for the current search session
    if (Number(sessionId) !== Number(searchSessionIdRef.current)) {
      console.log(
        `[Search] Ignoring aggregation for old session ${sessionId} (current: ${searchSessionIdRef.current})`,
      );
      return;
    }

    // Use ref for most up-to-date results
    const resultsToAggregate = platformResultsRef.current;
    const respondedCount = Object.keys(resultsToAggregate).length;
    const expectedCount =
      activeSearchPlatformsRef.current.length ||
      connectedPlatformsRef.current.length ||
      state.connectedPlatforms.length;
    const isComplete = respondedCount >= expectedCount;

    console.log(
      `[Search] Aggregating results for session ${sessionId} from:`,
      Object.keys(resultsToAggregate),
    );

    // Filter products by search relevance
    const stableQuery = (currentSearchQueryRef.current || "").trim();
    const searchTerm = stableQuery.toLowerCase();
    const searchWords = searchTerm.split(/\s+/).filter(Boolean);

    const normalizeToken = (token = "") => {
      const t = String(token || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();
      if (!t) return "";
      if (t.length > 3 && t.endsWith("es")) return t.slice(0, -2);
      if (t.length > 2 && t.endsWith("s")) return t.slice(0, -1);
      return t;
    };

    const normalizedSearchWords = searchWords
      .map((w) => normalizeToken(w))
      .filter(Boolean);

    const isRelevant = (productName) => {
      const rawName = String(productName || "").toLowerCase();
      const nameWords = rawName
        .split(/\s+/)
        .map((w) => normalizeToken(w))
        .filter(Boolean);

      return normalizedSearchWords.some(
        (word) =>
          rawName.includes(word) ||
          nameWords.some((nw) => nw.includes(word) || word.includes(nw)),
      );
    };

    // Count total products before filtering
    let totalProducts = 0;
    let relevantProducts = 0;
    Object.values(resultsToAggregate).forEach(({ products }) => {
      totalProducts += products?.length || 0;
    });

    // Group products by name similarity
    const productMap = {};

    Object.values(resultsToAggregate).forEach(({ products }) => {
      products?.forEach((product) => {
        // Skip products not relevant to search query
        if (!isRelevant(product.product_name)) {
          return;
        }
        relevantProducts++;

        const key = getProductMatchKey(product.product_name);

        if (!productMap[key]) {
          productMap[key] = {
            name: product.product_name,
            listings: [],
          };
        }

        productMap[key].listings.push({
          platform: product.platform,
          product_name: product.product_name,
          raw_product_name: product.raw_product_name || product.product_name,
          brand: product.brand,
          price: product.price,
          mrp: product.mrp,
          image_url: product.image_url,
          product_url: product.product_url,
          in_stock: product.in_stock,
          weight: product.weight,
          quantity: product.quantity || product.weight || "",
          rating: Number(product.rating || 0),
          rating_count: Number(product.rating_count || 0),
          discount_percent: Number(product.discount_percent || 0),
          discount_value: Number(product.discount_value || 0),
          raw_text: product.raw_text || "",
        });
      });
    });

    console.log(
      `[Search] Filtered ${relevantProducts}/${totalProducts} products matching "${stableQuery}"`,
    );

    // Convert to array format
    const aggregated = Object.values(productMap).map((group, idx) => {
      // Deduplicate listings by platform (keep the first one for each platform)
      const platformBestListings = new Map();

      group.listings.forEach((listing) => {
        const existing = platformBestListings.get(listing.platform);
        if (!existing) {
          platformBestListings.set(listing.platform, listing);
          return;
        }

        const listingPrice = Number(listing.price || 0);
        const existingPrice = Number(existing.price || 0);
        const listingHasLabeledPrice = /\bprice\b\s*:?\s*₹\s*[0-9]+/i.test(
          listing.raw_text || "",
        );
        const existingHasLabeledPrice = /\bprice\b\s*:?\s*₹\s*[0-9]+/i.test(
          existing.raw_text || "",
        );

        if (listingHasLabeledPrice && !existingHasLabeledPrice) {
          platformBestListings.set(listing.platform, listing);
          return;
        }

        if (
          listingHasLabeledPrice === existingHasLabeledPrice &&
          listingPrice > 0 &&
          (existingPrice <= 0 || listingPrice < existingPrice)
        ) {
          platformBestListings.set(listing.platform, listing);
        }
      });

      const uniqueListings = Array.from(platformBestListings.values());

      const bbListing = uniqueListings.find((l) => l.platform === "BigBasket");
      if (bbListing) {
        console.log(
          `[Debug-BigBasket] Aggregated listing for "${group.name}": price=${bbListing.price}, mrp=${bbListing.mrp}, raw="${String(
            bbListing.raw_text || "",
          ).slice(0, 180)}"`,
        );
      }

      const listings = uniqueListings.filter(
        (l) => l.price > 0 && l.in_stock !== false,
      );
      const prices = listings.map((l) => l.price);
      const best = prices.length > 0 ? Math.min(...prices) : 0;
      const worst = prices.length > 0 ? Math.max(...prices) : 0;
      const first = listings[0] || uniqueListings[0] || {};
      const displayName =
        uniqueListings.find((l) => l.raw_product_name)?.raw_product_name ||
        selectBestDisplayName(uniqueListings, group.name);

      return {
        id: idx,
        name: displayName,
        brand: first.brand || "",
        price: first.price || best,
        originalPrice: worst > (first.price || best) ? worst : undefined,
        platformCount: listings.length,
        totalPlatforms: uniqueListings.length,
        discount:
          worst > (first.price || best)
            ? Math.round(((worst - (first.price || best)) / worst) * 100)
            : 0,
        listings: uniqueListings,
        bestPlatform:
          listings.length > 0
            ? listings.reduce((a, b) => (a.price < b.price ? a : b)).platform
            : "",
        image_url:
          first.image_url ||
          uniqueListings.find((listing) => listing.image_url)?.image_url ||
          "",
      };
    });

    // Sort by number of available platforms
    aggregated.sort((a, b) => b.platformCount - a.platformCount);

    if (isComplete || aggregated.length > 0) {
      setLoading(false);
    }

    // Record aggregation timing
    monitor.mark("search-aggregate-end");
    const aggregateDuration = monitor.measure(
      "search-aggregate",
      "search-aggregate-start",
      "search-aggregate-end",
    );
    const totalDuration = monitor.measure(
      "search-total",
      "search-start",
      "search-aggregate-end",
    );
    console.log(
      `[Perf] Search update: aggregation=${aggregateDuration.toFixed(2)}ms, total=${totalDuration.toFixed(2)}ms, complete=${isComplete}`,
    );

    if (aggregated.length > 0) {
      setResults(aggregated);
      const normalizedQuery = (stableQuery || "").toLowerCase();
      const platformSignature = [...(connectedPlatformsRef.current || [])]
        .sort()
        .join("|");
      const searchKey = `${SEARCH_CACHE_VERSION}::${normalizedQuery}::${platformSignature}`;
      resultsCacheRef.current[searchKey] = {
        results: aggregated,
        timestamp: Date.now(),
      };

      // Send results to backend for analytics/caching (optional)
      if (ENABLE_BACKEND_COLLECTION) {
        collectResultsToBackend(stableQuery, resultsToAggregate);
      }
    } else if (isComplete) {
      // No products found
      setResults([]);
      console.log(
        `[Search] Session ${sessionId}: No products found from any platform`,
      );
    }
  };

  const collectResultsToBackend = async (query, platformResults) => {
    try {
      // Flatten the results to match backend expectation: map[string][]ProductListing
      const flattenedPlatforms = {};
      Object.keys(platformResults).forEach(platform => {
        flattenedPlatforms[platform] = platformResults[platform]?.products || [];
      });

      const payload = {
        query: query,
        platforms: flattenedPlatforms,
      };

      if (user && user.id) {
        payload.user_id = user.id;
      }

      await api.post("/search/collect", payload);
      console.log(`[Search] Sent results to backend for analytics`);
    } catch (err) {
      // Silently fail - backend collection is optional
      console.log(`[Search] Backend collection skipped:`, err?.message);
    }
  };

  // Removed auto-aggregate useEffect that was causing multiple re-aggregations
  // Aggregation now only happens once after search timeout in searchProducts

  const handleProduct = useCallback(
    (product) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate("ProductDetail", { product });
    },
    [navigation],
  );

  const renderProductItem = useCallback(
    ({ item }) => <ProductCard product={item} onPress={handleProduct} />,
    [handleProduct],
  );

  const getResultItemLayout = useCallback(
    (_, index) => ({
      length: RESULT_CARD_HEIGHT,
      offset: RESULT_CARD_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderEmpty = () => {
    if (loading) return null;
    if (!hasSearched) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name="search-outline"
                size={36}
                color={COLORS.textTertiary}
              />
            </View>
            <Text style={styles.emptyTitle}>Search for a product</Text>
            <Text style={styles.emptySubtitle}>
              Compare prices across {state.connectedPlatforms.length} connected
              platforms
            </Text>

            <View style={styles.platformBadge}>
              <Ionicons
                name="layers-outline"
                size={14}
                color={COLORS.textSecondary}
              />
              <Text style={styles.platformBadgeText}>
                {state.connectedPlatforms.length} live sources ready
              </Text>
            </View>

            {state.connectedPlatforms.length === 0 && (
              <View style={styles.warning}>
                <Ionicons
                  name="warning-outline"
                  size={24}
                  color={COLORS.warning}
                />
                <Text style={styles.warningText}>
                  No platforms connected. Go to Accounts tab to link your
                  accounts.
                </Text>
              </View>
            )}

            <View style={styles.suggestions}>
              <Text style={styles.suggestTitle}>Try searching for:</Text>
              <View style={styles.chips}>
                {SUGGESTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setQuery(s)}
                    activeOpacity={0.85}
                    style={styles.chipButton}
                    testID={`searchSuggestion_${s}`}
                  >
                    <Text style={styles.chip}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      );
    }
    if (results.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="sad-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>Try a different search term</Text>
        </View>
      );
    }
    return null;
  };

  const PLATFORM_META = {
    Blinkit: { color: "#FFCE00", icon: "flash", label: "Blinkit" },
    Zepto: { color: "#9747FF", icon: "rocket", label: "Zepto" },
    BigBasket: { color: "#84C225", icon: "basket", label: "BigBasket" },
    Amazon: { color: "#FF9900", icon: "cart", label: "Amazon" },
    Flipkart: { color: "#2874F0", icon: "bag", label: "Flipkart" },
  };

  const renderSearchProgress = () => {
    if (!loading) return null;

    const completedCount = Object.keys(platformResults).length;
    const totalCount = Math.max(1, state.connectedPlatforms.length);
    const progressRatio = Math.min(1, completedCount / totalCount);

    return (
      <View style={styles.loaderContainer}>
        {/* Title row */}
        <View style={styles.loaderTitleRow}>
          <Ionicons name="search" size={16} color={COLORS.textPrimary} />
          <Text style={styles.loaderStatusText}>Scanning Prices</Text>
        </View>
        <Text style={styles.loaderDetail}>
          {completedCount === 0
            ? "Opening platforms..."
            : completedCount < totalCount
              ? `${completedCount}/${totalCount} done — more coming`
              : "All platforms scanned"}
        </Text>

        {/* Per-platform status cards */}
        <View style={styles.platformStatusRow}>
          {state.connectedPlatforms.map((platform) => {
            const isDone = !!platformResults[platform];
            const meta = PLATFORM_META[platform] || {
              color: COLORS.textPrimary,
              icon: "search",
              label: platform,
            };
            const count = (platformResults[platform] || []).length;
            return (
              <Animated.View
                key={platform}
                style={[
                  styles.platformStatusCard,
                  isDone
                    ? {
                        borderColor: COLORS.textPrimary,
                        backgroundColor: COLORS.accentMuted,
                      }
                    : { opacity: pulseAnim },
                ]}
              >
                <Ionicons
                  name={isDone ? "checkmark-circle" : meta.icon}
                  size={18}
                  color={isDone ? COLORS.savings : COLORS.textTertiary}
                  style={styles.platformStatusIcon}
                />
                <Text
                  style={[
                    styles.platformStatusName,
                    isDone && { color: COLORS.textPrimary },
                  ]}
                >
                  {meta.label}
                </Text>
                <Text style={styles.platformStatusCount}>
                  {isDone ? `${count} items` : "Scanning..."}
                </Text>
              </Animated.View>
            );
          })}
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(progressRatio * 100, 8)}%` },
            ]}
          />
        </View>

        {/* Cycling tip */}
        <View style={styles.tipBox}>
          <Ionicons
            name="bulb"
            size={13}
            color={COLORS.accentGold}
            style={styles.tipIcon}
          />
          <Text style={styles.tipLabel}>Tip</Text>
          <Text style={styles.tipText}>{SAVING_TIPS[tipIndex]}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PerformanceDebugPanel enabled={false} />
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>CompareZ</Text>
            <Text style={styles.headerTitle}>Collection</Text>
          </View>
        </View>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onClear={() => {
            setQuery("");
            setResults([]);
            setHasSearched(false);
          }}
          autoFocus={!hasSearched && query === ""}
          testID="searchInput"
        />
      </View>

      {captchaPlatform && (
        <View style={styles.captchaOverlay}>
          <Text style={styles.captchaText}>
            Please solve the CAPTCHA for {captchaPlatform} to continue saving.
          </Text>
          <TouchableOpacity
            style={styles.captchaDismissBtn}
            onPress={() => setCaptchaPlatform(null)}
          >
            <Text style={styles.captchaDismissTxt}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={results}
        renderItem={renderProductItem}
        keyExtractor={(item) => String(item.id)}
        getItemLayout={results.length > 0 ? getResultItemLayout : undefined}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={results.length > 0}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderSearchProgress}
        ListEmptyComponent={renderEmpty}
        testID="resultsList"
        accessibilityLabel="resultsList"
      />

      {/* Hidden WebViews: always mounted to pre-warm platforms for faster parallel searches */}
      {state.connectedPlatforms.map((platform) => (
        <WebView
          key={platform}
          ref={(ref) => (webViewRefs.current[platform] = ref)}
          source={{ uri: searchUrls[platform] || getPlatformUrl(platform) }}
          style={captchaPlatform === platform ? styles.visibleWebView : styles.hiddenWebView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          cacheEnabled={true}
          cacheMode="LOAD_CACHE_ELSE_NETWORK"
          onMessage={(event) => handleWebViewMessage(platform, event)}
          // ── Optimization 1: Block images, fonts, and trackers ──────────
          onShouldStartLoadWithRequest={(request) => {
            if (shouldBlockWebViewRequest(request)) {
              return false; // silently drop — saves 1.5–3s per search
            }
            return true;
          }}
          // ── Optimization 2: Inject early — fires as soon as JS context is ready
          // before images/CSS have even been requested by the browser
          injectedJavaScriptBeforeContentLoaded={`
            // Patch fetch to auto-forward JSON API responses to RN bridge
            (function() {
              var _origFetch = window.fetch;
              window.__CX_INTERCEPT_PLATFORM__ = ${JSON.stringify(platform)};
              window.__CX_SEARCH_ACTIVE__ = false; // set true by injection
            })();
            true;
          `}
          onLoadStart={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            currentWebViewUrlsRef.current[platform] = nativeEvent.url;
            console.log(`[Search] ${platform} load start: ${nativeEvent.url}`);
            // Try inject immediately — the URL already contains the search query
            const searchUrl = searchUrls[platform];
            if (canInjectForPlatform(platform, nativeEvent.url, searchUrl)) {
              // Small delay to let the cookie jar settle
              setTimeout(() => injectDomParser(platform, 'onLoadStart-early'), 300);
            }
          }}
          onLoadEnd={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            const currentUrl = nativeEvent.url || currentWebViewUrlsRef.current[platform];
            console.log(`[Search] ${platform} onLoadEnd: ${currentUrl}`);
            const searchUrl = searchUrls[platform];
            if (canInjectForPlatform(platform, currentUrl, searchUrl)) {
              injectDomParser(platform, 'onLoadEnd');
            }
          }}
          onNavigationStateChange={(navState) => {
            currentWebViewUrlsRef.current[platform] = navState.url;
          }}
          userAgent={
            platform === "Amazon"
              ? "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
              : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
          incognito={false}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          geolocationEnabled={true}
          onError={(e) => console.log(`[Search] ${platform} WebView error:`, e.nativeEvent)}
          onHttpError={(e) => console.log(`[Search] ${platform} HTTP ${e.nativeEvent.statusCode}:`, e.nativeEvent.url)}
        />
      ))}
    </View>
  );
};

function getPlatformUrl(platform) {
  const urls = {
    Blinkit: "https://blinkit.com/",
    Zepto: "https://www.zepto.com/",
    BigBasket: "https://www.bigbasket.com/",
    Amazon: "https://www.amazon.in/",
    Flipkart: "https://www.flipkart.com/",
  };
  return urls[platform] || "about:blank";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: SPACING.lg,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
    zIndex: 10,
  },
  headerTopRow: {
    marginBottom: SPACING.md,
  },
  headerLabel: {
    ...FONTS.eyebrow,
    fontSize: 10,
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    ...FONTS.h1,
    fontSize: 32,
    lineHeight: 36,
  },
  visibleWebView: {
    flex: 1,
    height: 400,
    marginTop: 10,
    backgroundColor: '#fff',
  },
  captchaOverlay: {
    padding: SPACING.lg,
    backgroundColor: COLORS.warningLight,
    borderBottomWidth: 1,
    borderColor: "rgba(212, 168, 83, 0.2)",
    alignItems: "center",
  },
  captchaText: {
    ...FONTS.bodyBold,
    color: COLORS.warning,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  captchaDismissBtn: {
    backgroundColor: COLORS.textPrimary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  captchaDismissTxt: {
    ...FONTS.bodyBold,
    color: "#fff",
  },
  loaderContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  loaderStatusText: {
    ...FONTS.bodyBold,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  loaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  loaderDetail: {
    marginTop: SPACING.xs,
    ...FONTS.caption,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  platformStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  platformStatusCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardAlt,
  },
  platformStatusIcon: {
    marginBottom: SPACING.xs,
  },
  platformStatusName: {
    ...FONTS.caption,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  platformStatusCount: {
    ...FONTS.badge,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
    textAlign: "center",
    fontSize: 10,
  },
  progressTrack: {
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    overflow: "hidden",
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: "100%",
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.cardAlt,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.xs,
  },
  tipLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.accentGold,
    marginRight: 4,
    flexShrink: 0,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tipIcon: {
    marginRight: 4,
    marginTop: 1,
  },
  tipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  list: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  hiddenWebView: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    left: -9999,
    top: -9999,
  },
  emptyState: {
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  emptyCard: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.cardAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    ...FONTS.h2,
    marginTop: SPACING.lg,
    textAlign: "center",
  },
  emptySubtitle: {
    ...FONTS.body,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
  platformBadge: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.cardAlt,
  },
  platformBadgeText: {
    ...FONTS.captionBold,
    color: COLORS.textSecondary,
  },
  warning: {
    flexDirection: "row",
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: "rgba(212, 168, 83, 0.2)",
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.xl,
    alignItems: "center",
  },
  warningText: {
    flex: 1,
    marginLeft: SPACING.sm,
    color: COLORS.warning,
    fontSize: 14,
  },
  suggestions: {
    marginTop: SPACING.xl,
    width: "100%",
  },
  suggestTitle: {
    ...FONTS.bodyBold,
    marginBottom: SPACING.md,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    justifyContent: "center",
  },
  chipButton: {
    backgroundColor: COLORS.cardAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    minWidth: 84,
    alignItems: "center",
  },
  chip: {
    ...FONTS.caption,
    fontWeight: "600",
  },
  loaderHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
});

export default SearchScreen;
