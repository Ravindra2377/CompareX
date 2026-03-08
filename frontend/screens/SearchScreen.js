import React, {
  useState,
  useEffect,
  useRef,
  useReducer,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  InteractionManager,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import SearchBar from "../components/SearchBar";
import ProductCard from "../components/ProductCard";
import { COLORS, SPACING, RADIUS, FONTS } from "../config/theme";
import PlatformScraperService from "../services/PlatformScraperService";
import PlatformDOMScraperService from "../services/PlatformDOMScraperService";
import api from "../config/api";

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

const PLATFORMS = ["Blinkit", "Zepto", "BigBasket", "Instamart"];
const ENABLE_BACKEND_FALLBACK = true; // Use Go backend API when WebView fails
const ENABLE_BACKEND_COLLECTION = false;
const DEFAULT_PLATFORM_TIMEOUT_MS = 22000;
const INSTAMART_INITIAL_TIMEOUT_MS = 25000; // Fall through to backend quickly
const INSTAMART_RETRY_TIMEOUT_MS = 15000;
const OVERALL_SEARCH_TIMEOUT_MS = 120000;

const reducer = (state, action) => {
  console.log(
    "[Reducer] action:",
    action.type,
    "payload length:",
    action.payload ? action.payload.length : "none",
  );
  switch (action.type) {
    case "setConnected":
      const newState = {
        ...state,
        connectedPlatforms: action.payload,
        forceUpdate: state.forceUpdate + 1,
      };
      console.log(
        "[Reducer] new state connectedPlatforms:",
        newState.connectedPlatforms.length,
        "forceUpdate:",
        newState.forceUpdate,
      );
      return newState;
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

  const [state, dispatch] = useReducer(reducer, {
    connectedPlatforms: [],
    forceUpdate: 0,
  });

  const connectedPlatformsRef = useRef([]);
  const connectedPlatformTokensRef = useRef({});
  const activeSearchPlatformsRef = useRef([]);

  console.log(
    "[Search] Component render, connectedPlatforms:",
    state.connectedPlatforms.length,
    "forceUpdate:",
    state.forceUpdate,
  );

  const webViewRefs = useRef({});
  const searchTimeoutRef = useRef(null);
  const searchSessionIdRef = useRef(0);
  const platformResultsRef = useRef({});
  const aggregatedSessionIdRef = useRef(null);
  const currentSearchQueryRef = useRef("");
  const lastInjectedUrlRef = useRef({});
  const injectedPlatformsRef = useRef({});
  const platformTimeoutsRef = useRef({}); // Track per-platform timeouts
  const instamartTimeoutRetriedRef = useRef({}); // Track one retry per session
  const fallbackAttemptedRef = useRef(new Set()); // Prevent infinite backend fallback retries
  const currentWebViewUrlsRef = useRef({}); // Track current URL of each WebView

  const armPlatformTimeout = (platform, sessionId) => {
    if (platformTimeoutsRef.current[platform]) {
      clearTimeout(platformTimeoutsRef.current[platform]);
    }

    const timeoutMs =
      platform === "Instamart"
        ? INSTAMART_INITIAL_TIMEOUT_MS
        : DEFAULT_PLATFORM_TIMEOUT_MS;

    platformTimeoutsRef.current[platform] = setTimeout(() => {
      if (sessionId !== searchSessionIdRef.current) {
        return;
      }
      if (!platformResultsRef.current[platform]) {
        if (
          platform === "Instamart" &&
          !instamartTimeoutRetriedRef.current[sessionId]
        ) {
          instamartTimeoutRetriedRef.current[sessionId] = true;
          console.log(
            `[Search] Instamart timeout hit, forcing re-injection and extending timeout for session ${sessionId}`,
          );
          injectedPlatformsRef.current[platform] = false;
          injectDomParser(platform, "timeoutRetry");
          platformTimeoutsRef.current[platform] = setTimeout(() => {
            if (sessionId !== searchSessionIdRef.current) {
              return;
            }
            if (!platformResultsRef.current[platform]) {
              console.log(
                `[Search] ${platform} timed out after retry, trying backend fallback`,
              );
              const fallbackKey = `${platform}:${sessionId}`;
              if (!fallbackAttemptedRef.current.has(fallbackKey)) {
                fallbackAttemptedRef.current.add(fallbackKey);
                fallbackToBackend(
                  platform,
                  currentSearchQueryRef.current,
                  sessionId,
                );
                return;
              }
              writePlatformResult(
                platform,
                [],
                false,
                "WebView timeout after retry",
                sessionId,
              );
            }
          }, INSTAMART_RETRY_TIMEOUT_MS);
          return;
        }

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

  const injectDomParser = (platform, reason) => {
    const currentUrl = (currentWebViewUrlsRef.current[platform] || "").split(
      "#",
    )[0];
    const sessionForKey = searchSessionIdRef.current;
    const reasonKey = platform === "Instamart" ? `:${reason || ""}` : "";
    const injectKey = `${sessionForKey}:${currentUrl || "no-url"}${reasonKey}`;

    // Prevent duplicate injection for the same platform+URL in this session,
    // but allow reinjection when SPA navigation changes URL (critical for Instamart).
    if (injectedPlatformsRef.current[platform] === injectKey) {
      return;
    }
    injectedPlatformsRef.current[platform] = injectKey;

    const platformToken = connectedPlatformTokensRef.current[platform] || null;
    if (platform === "Instamart") {
      console.log(
        `[Search] DEBUG Instamart token pass: HasCookie=${!!platformToken?.cookie}, CookieLen=${platformToken?.cookie?.length || 0}`,
      );
    }
    const parseScript = PlatformDOMScraperService.getParseScript(
      platform,
      platformToken,
    );
    if (!parseScript) {
      console.log(`[Search] No parser available for ${platform}`);
      return;
    }

    const sessionId = searchSessionIdRef.current;
    const sessionPreamble = `window.__COMPAREX_SESSION_ID__ = ${JSON.stringify(
      sessionId,
    )}; true;`;

    try {
      console.log(
        `[Search] Injecting DOM parser for ${platform}${reason ? ` (${reason})` : ""} @ ${currentUrl || "unknown-url"}`,
      );

      // Probe: verify injectJavaScript actually executes for this WebView (especially Swiggy/Instamart)
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
        sessionPreamble + probe + parseScript,
      );
    } catch (err) {
      console.error(`[Search] Failed to inject parser for ${platform}:`, err);
    }
  };

  useEffect(() => {
    checkConnectedPlatforms();
  }, [checkConnectedPlatforms]);

  useEffect(() => {
    console.log(
      "[Search] connectedPlatforms changed:",
      state.connectedPlatforms.length,
    );
    connectedPlatformsRef.current = state.connectedPlatforms;
  }, [state.connectedPlatforms]);

  useFocusEffect(
    useCallback(() => {
      checkConnectedPlatforms();
    }, [checkConnectedPlatforms]),
  );

  useEffect(() => {
    console.log(
      "[Search] useEffect for query triggered, query:",
      query,
      "connectedPlatforms:",
      connectedPlatformsRef.current.length,
    );
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    if (connectedPlatformsRef.current.length === 0) {
      console.log("[Search] Skipping search because no connected platforms");
      return;
    }
    const timer = setTimeout(() => searchProducts(query), 0);
    return () => clearTimeout(timer);
  }, [query, state.connectedPlatforms]);

  const getConnectedPlatformsSnapshot = useCallback(
    async ({ logInstamartLimited = false } = {}) => {
      try {
        console.log("[Search] getConnectedPlatformsSnapshot called");
        const tokens = await AsyncStorage.getItem("userTokens");
        console.log(
          "[Search] tokens from storage:",
          tokens ? "present" : "null",
        );
        if (!tokens) return [];
        const parsed = JSON.parse(tokens);
        console.log("[Search] parsed tokens keys:", Object.keys(parsed));
        const supportedPlatforms = [
          "Blinkit",
          "BigBasket",
          "Instamart",
          "Zepto",
        ];
        const connected = Object.keys(parsed).filter((platform) => {
          if (!supportedPlatforms.includes(platform)) return false;
          const t = parsed[platform];
          if (!t || Object.keys(t).length === 0) return false;

          if (platform === "Instamart") {
            const verified =
              t.verifiedInstamartApi === "true" ||
              t.verifiedInstamartApi === true;
            if (verified) return true;

            const hasAuthHeaders =
              typeof t.authHeaders === "string" && t.authHeaders.length > 20;
            const hasUserInfo =
              typeof t.swiggyUserInfo === "string" &&
              t.swiggyUserInfo.length > 10;
            if (hasAuthHeaders && hasUserInfo) {
              if (logInstamartLimited) {
                console.log(
                  "[Search] Instamart connected in limited mode (API not verified)",
                );
              }
              return true;
            }
            return true;
          }

          return true;
        });

        // Save the actual token objects
        const tokenMap = {};
        connected.forEach((plat) => {
          if (plat === "Instamart") {
            tokenMap[plat] = {
              ...(parsed[plat] || {}),
              ...(parsed.Swiggy || {}),
              ...(parsed.swiggy || {}),
            };
          } else {
            tokenMap[plat] = parsed[plat];
          }
        });
        connectedPlatformTokensRef.current = tokenMap;

        console.log("[Search] connected platforms:", connected);
        return connected;
      } catch (e) {
        console.error("[Search] Error reading connections:", e);
        return [];
      }
    },
    [],
  );

  const checkConnectedPlatforms = useCallback(() => {
    getConnectedPlatformsSnapshot({ logInstamartLimited: true })
      .then((connected) => {
        console.log("[Search] In then, connected length:", connected.length);
        connectedPlatformsRef.current = connected;
        console.log("[Search] About to dispatch");
        dispatch({ type: "setConnected", payload: connected });
        console.log("[Search] Dispatched");
      })
      .catch((err) =>
        console.error("[Search] Error in checkConnectedPlatforms:", err),
      );
  }, [getConnectedPlatformsSnapshot, dispatch]);

  const searchProducts = async (q) => {
    console.log(
      "[Search] searchProducts V_TIMESTAMP_99 called with query:",
      q,
      "connectedPlatforms:",
      connectedPlatformsRef.current.length,
    );
    // Clear previous search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    // Clear any existing platform timeouts
    Object.values(platformTimeoutsRef.current).forEach(clearTimeout);
    platformTimeoutsRef.current = {};

    // Generate new session ID to reject old results
    const newSessionId = Date.now();
    searchSessionIdRef.current = newSessionId;
    aggregatedSessionIdRef.current = null;
    fallbackAttemptedRef.current.clear(); // Reset per-platform fallback guard for new search
    instamartTimeoutRetriedRef.current = {}; // Reset Instamart timeout retry guard

    setLoading(true);
    setHasSearched(true);
    setPlatformResults({});
    platformResultsRef.current = {}; // Clear ref too
    setResults([]); // Clear old results
    setCurrentSearchQuery(q);
    currentSearchQueryRef.current = q;

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

    console.log(
      `[Search] Starting new search session ${newSessionId} for "${q}" on ${platformsSnapshot.length} platforms...`,
    );

    // Generate search URLs for each platform
    const urls = {};
    platformsSnapshot.forEach((platform) => {
      const url = PlatformDOMScraperService.getSearchUrl(platform, q);
      if (url) {
        // For Instamart: start at the Instamart homepage to warm up Swiggy session cookies.
        // Without cookies, Swiggy shows "Something went wrong" on the direct search URL.
        // After 3.5s the navigation state change handler will detect the homepage loaded and redirect.
        if (platform === "Instamart") {
          urls[platform] = "https://www.swiggy.com/instamart";
          console.log(
            `[Search] Navigating ${platform} to WARMUP: https://www.swiggy.com/instamart`,
          );
          // Schedule redirect to actual search URL after warmup
          setTimeout(() => {
            if (searchSessionIdRef.current === newSessionId) {
              console.log(
                `[Search] Instamart warmup complete — navigating to search: ${url}`,
              );
              setSearchUrls((prev) => ({ ...prev, [platform]: url }));
            }
          }, 3500);
        } else {
          urls[platform] = url;
          console.log(`[Search] Navigating ${platform} to: ${url}`);
        }
      }
    });

    setSearchUrls(urls);

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
      aggregateResults(newSessionId);
    }, overallTimeoutMs);
  };

  const handleWebViewMessage = (platform, event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "TOKENS_SYNC") {
        persistPlatformTokens(platform, data.payload || {});
        return;
      }

      if (data.type === "SEARCH_RESULTS") {
        // Reject late messages from older searches when sessionId is provided
        if (data.sessionId && data.sessionId !== searchSessionIdRef.current) {
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
          if (respondedCount === expectedCount) {
            console.log(
              `[Search] All platforms responded for session ${searchSessionIdRef.current}, aggregating now...`,
            );
            if (searchTimeoutRef.current) {
              clearTimeout(searchTimeoutRef.current);
            }
            // Aggregate after a short delay to ensure state is updated
            setTimeout(
              () => aggregateResults(searchSessionIdRef.current),
              1000,
            );
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

      const storedRaw = await AsyncStorage.getItem("userTokens");
      const stored = storedRaw ? JSON.parse(storedRaw) : {};
      stored[platform] = {
        ...(stored[platform] || {}),
        ...mergedPayload,
      };
      await AsyncStorage.setItem("userTokens", JSON.stringify(stored));

      if (platform === "Instamart") {
        console.log(
          `[Search] Synced Instamart tokens: cookieLen=${mergedPayload.cookie?.length || 0}, authHeadersLen=${mergedPayload.authHeaders?.length || 0}, userInfoLen=${mergedPayload.swiggyUserInfo?.length || 0}`,
        );
      }
    } catch (err) {
      console.warn(`[Search] Failed to persist ${platform} tokens:`, err);
    }
  }, []);

  // to avoid re-triggering the fallback check.
  const writePlatformResult = React.useCallback(
    (platform, products, success, errorMsg, sessionId) => {
      if (sessionId !== searchSessionIdRef.current) return; // stale session, ignore
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
          if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
          setTimeout(() => aggregateResults(sessionId), 500);
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
      const tokensRaw = await AsyncStorage.getItem("userTokens");
      const tokens = tokensRaw ? JSON.parse(tokensRaw) : {};

      // Pass scoped token first, but include allied aliases when needed (e.g., Swiggy for Instamart)
      const scopedTokens = {};
      const livePlatformTokens = connectedPlatformTokensRef.current[platform];
      if (tokens[platform] || livePlatformTokens) {
        scopedTokens[platform] = {
          ...(tokens[platform] || {}),
          ...(livePlatformTokens || {}),
        };
      }
      if (platform === "Instamart") {
        const swiggyAlias = {
          ...(tokens.Swiggy || {}),
          ...(tokens.swiggy || {}),
        };
        if (Object.keys(swiggyAlias).length > 0) {
          scopedTokens.Swiggy = swiggyAlias;
        }
      }
      // If no scoped token exists, fall back to all tokens so backend can still resolve provider auth
      const tokensForHeader =
        Object.keys(scopedTokens).length > 0 ? scopedTokens : tokens;

      const response = await api.get("/compare", {
        headers: { "X-User-Tokens": JSON.stringify(tokensForHeader) },
        params: { q: fallbackQuery, lat: 12.9716, lng: 77.5946 },
      });

      const platformMatches = (listingPlatform, expectedPlatform) => {
        const lp = String(listingPlatform || "")
          .trim()
          .toLowerCase();
        const ep = String(expectedPlatform || "")
          .trim()
          .toLowerCase();
        if (!lp || !ep) return false;
        if (lp === ep) return true;
        if (
          ep === "instamart" &&
          (lp.includes("instamart") || lp.includes("swiggy"))
        ) {
          return true;
        }
        return false;
      };

      const allListings = [];
      if (response.data?.products) {
        response.data.products.forEach((group) => {
          group.listings?.forEach((listing) => {
            if (
              platformMatches(listing.platform, platform) &&
              listing.price > 0
            ) {
              allListings.push({
                product_name: listing.product_name,
                brand: group.name,
                price: listing.price,
                mrp: listing.mrp || listing.price,
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
    // Verify this is for the current search session
    if (sessionId !== searchSessionIdRef.current) {
      console.log(
        `[Search] Ignoring aggregation for old session ${sessionId} (current: ${searchSessionIdRef.current})`,
      );
      return;
    }

    // Use ref for most up-to-date results
    const resultsToAggregate = platformResultsRef.current;

    console.log(
      `[Search] Aggregating results for session ${sessionId} from:`,
      Object.keys(resultsToAggregate),
    );

    // Filter products by search relevance
    const stableQuery = (currentSearchQueryRef.current || "").trim();
    const searchTerm = stableQuery.toLowerCase();
    const searchWords = searchTerm.split(/\s+/); // Split into words

    const isRelevant = (productName) => {
      const nameLower = productName.toLowerCase();
      // Product must contain at least one search word
      return searchWords.some((word) => nameLower.includes(word));
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

        const normalizedName = product.product_name.toLowerCase().trim();
        const key = normalizedName.slice(0, 30); // Use first 30 chars as key

        if (!productMap[key]) {
          productMap[key] = {
            name: product.product_name,
            listings: [],
          };
        }

        productMap[key].listings.push({
          platform: product.platform,
          product_name: product.product_name,
          brand: product.brand,
          price: product.price,
          mrp: product.mrp,
          image_url: product.image_url,
          product_url: product.product_url,
          in_stock: product.in_stock,
          weight: product.weight,
        });
      });
    });

    console.log(
      `[Search] Filtered ${relevantProducts}/${totalProducts} products matching "${stableQuery}"`,
    );

    // Convert to array format
    const aggregated = Object.values(productMap).map((group, idx) => {
      // Deduplicate listings by platform (keep the first one for each platform)
      const uniqueListings = [];
      const seenPlatforms = new Set();

      group.listings.forEach((listing) => {
        if (!seenPlatforms.has(listing.platform)) {
          seenPlatforms.add(listing.platform);
          uniqueListings.push(listing);
        }
      });

      const listings = uniqueListings.filter(
        (l) => l.price > 0 && l.in_stock !== false,
      );
      const prices = listings.map((l) => l.price);
      const best = prices.length > 0 ? Math.min(...prices) : 0;
      const worst = prices.length > 0 ? Math.max(...prices) : 0;
      const first = listings[0] || uniqueListings[0] || {};

      return {
        id: idx,
        name: group.name,
        brand: first.brand || "",
        price: best,
        originalPrice: worst > best ? worst : undefined,
        platformCount: listings.length,
        totalPlatforms: uniqueListings.length,
        discount: worst > best ? Math.round(((worst - best) / worst) * 100) : 0,
        listings: uniqueListings,
        bestPlatform:
          listings.length > 0
            ? listings.reduce((a, b) => (a.price < b.price ? a : b)).platform
            : "",
        image: first.image_url || "",
      };
    });

    // Sort by number of available platforms
    aggregated.sort((a, b) => b.platformCount - a.platformCount);

    // Always stop loading after aggregation timeout
    setLoading(false);

    if (aggregated.length > 0) {
      setResults(aggregated);
      console.log(
        `[Search] Session ${sessionId}: Aggregated ${aggregated.length} products`,
      );

      // Send results to backend for analytics/caching (optional)
      if (ENABLE_BACKEND_COLLECTION) {
        collectResultsToBackend(stableQuery, resultsToAggregate);
      }
    } else {
      // No products found
      setResults([]);
      console.log(
        `[Search] Session ${sessionId}: No products found from any platform`,
      );
    }
  };

  const collectResultsToBackend = async (query, platformResults) => {
    try {
      await api.post("/search/collect", {
        query: query,
        platforms: platformResults,
      });
      console.log(`[Search] Sent results to backend for analytics`);
    } catch (err) {
      // Silently fail - backend collection is optional
      console.log(`[Search] Backend collection skipped:`, err?.message);
    }
  };

  // Removed auto-aggregate useEffect that was causing multiple re-aggregations
  // Aggregation now only happens once after search timeout in searchProducts

  const handleProduct = (product) => {
    navigation.navigate("ProductDetail", { product });
  };

  const renderEmpty = () => {
    console.log(
      "renderEmpty, hasSearched:",
      hasSearched,
      "connectedPlatforms:",
      state.connectedPlatforms.length,
      "results:",
      results.length,
      "loading:",
      loading,
    );
    if (loading) return null;
    if (!hasSearched) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyTitle}>Search for a product</Text>
          <Text style={styles.emptySubtitle}>
            Compare prices across {state.connectedPlatforms.length} platforms
          </Text>

          {state.connectedPlatforms.length === 0 && (
            <View style={styles.warning}>
              <Ionicons name="warning-outline" size={24} color={COLORS.error} />
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
                <Text key={s} style={styles.chip} onPress={() => setQuery(s)}>
                  {s}
                </Text>
              ))}
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

  const instamartInterceptScript = `
    (function() {
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.__rnMsg = window.ReactNativeWebView.postMessage.bind(window.ReactNativeWebView);
        }
      } catch (e) {}

      function send(message) {
        try {
          var fn = window.__rnMsg || (window.ReactNativeWebView && window.ReactNativeWebView.postMessage.bind(window.ReactNativeWebView));
          if (fn) fn(JSON.stringify(message));
        } catch (e) {}
      }

      function log(msg) {
        send({ type: 'LOG', message: '[Instamart-XHR] ' + msg });
      }

      function sync(reason) {
        try {
          var ls = window.localStorage || {};
          var payload = {
            cookie: document.cookie || '',
            authHeaders: (typeof ls.swiggy_auth_headers === 'string' ? ls.swiggy_auth_headers : '') || (typeof ls.auth_headers === 'string' ? ls.auth_headers : ''),
            swiggyUserInfo: (typeof ls.swiggy_user_info === 'string' ? ls.swiggy_user_info : '') || (typeof ls.user_info === 'string' ? ls.user_info : ''),
            verifiedInstamartApi: false,
            syncReason: reason || 'unknown',
            syncUrl: location.href,
          };
          send({ type: 'TOKENS_SYNC', platform: 'Instamart', payload: payload });
          log('token sync(' + (reason || 'unknown') + '): cookie=' + payload.cookie.length + ' auth=' + payload.authHeaders.length + ' user=' + payload.swiggyUserInfo.length);
        } catch (e) {
          log('token sync failed: ' + e.message);
        }
      }

      function toPrice(raw) {
        var n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
        if (!isFinite(n) || n <= 0) return 0;
        if (n > 500 && n === Math.round(n) && Math.round(n) % 100 === 0) return Math.round(n / 100);
        if (n > 9999 && n <= 999999) return Math.round(n / 100);
        if (n > 0 && n <= 9999) return Math.round(n);
        return 0;
      }

      function collectProducts(data) {
        var products = [];
        var seen = {};

        function tryAdd(obj) {
          if (!obj || typeof obj !== 'object') return;
          var name = obj.display_name || obj.name || obj.displayName || obj.product_name || obj.title || obj.item_name || '';
          if (typeof name !== 'string' || name.trim().length < 3) return;

          var keys = ['price','offer_price','display_price','final_price','sp','selling_price','mrp','offerPrice'];
          var price = 0;
          for (var i = 0; i < keys.length; i++) {
            price = toPrice(obj[keys[i]]);
            if (price > 0) break;
          }
          if (!price) return;

          var key = name.trim().toLowerCase() + '|' + price;
          if (seen[key]) return;
          seen[key] = 1;

          var image = obj.image_url || obj.img_url || obj.imageUrl || obj.image || '';
          if (!image && obj.image_id) image = 'https://media-assets.swiggy.com/swiggy/image/upload/' + obj.image_id;
          var url = obj.deep_link || obj.url || '';
          if (!url && obj.product_id) url = 'https://www.swiggy.com/instamart/item/' + obj.product_id;

          products.push({
            product_name: name.trim(),
            brand: obj.brand_name || obj.brand || '',
            price: price,
            mrp: toPrice(obj.mrp) || price,
            image_url: image,
            product_url: url,
            weight: obj.quantity || obj.unit || obj.weight || '',
            in_stock: !(obj.is_out_of_stock || obj.out_of_stock || obj.in_stock === false),
            platform: 'Instamart'
          });
        }

        function walk(node, depth) {
          if (!node || depth > 12) return;
          if (Array.isArray(node)) {
            for (var i = 0; i < node.length; i++) walk(node[i], depth + 1);
            return;
          }
          if (typeof node !== 'object') return;

          var hasName = ('display_name' in node) || ('name' in node) || ('item_name' in node) || ('displayName' in node);
          var hasPrice = ('price' in node) || ('offer_price' in node) || ('sp' in node) || ('mrp' in node);
          if (hasName && hasPrice) tryAdd(node);

          var keys = Object.keys(node);
          for (var j = 0; j < keys.length; j++) {
            var value = node[keys[j]];
            if (typeof value === 'string' && value.length > 50000) continue;
            walk(value, depth + 1);
          }
        }

        walk(data, 0);
        return products;
      }

      function handleData(source, data) {
        // Log structure when we get a response to understand the format
        try {
          var topKeys = Object.keys(data || {});
          log(source + ' response top keys: ' + JSON.stringify(topKeys.slice(0, 15)));
          if (data && data.data) {
            log(source + ' data keys: ' + JSON.stringify(Object.keys(data.data).slice(0, 15)));
          }
          if (data && data.statusCode !== undefined) {
            log(source + ' statusCode: ' + data.statusCode);
          }
        } catch(e) {}

        // Strategy A: Swiggy /api/instamart/search/v2 response structure
        // data.widgets[] -> each widget has data.nodes[] -> node has product fields
        try {
          var widgets = (data && data.data && data.data.widgets) || [];
          if (widgets.length > 0) {
            log(source + ' found ' + widgets.length + ' widgets, extracting...');
            var wProducts = [];
            widgets.forEach(function(w) {
              if (!w || !w.data || !w.data.nodes) return;
              w.data.nodes.forEach(function(node) {
                var d = (node && node.data) || node;
                if (!d) return;
                var name = d.display_name || d.name || '';
                if (!name || name.length < 3) return;
                var price = toPrice(d.price) || toPrice(d.offer_price) || toPrice(d.sp);
                if (!price) {
                  // Try nested price object or variations
                  if (d.variations && d.variations[0]) {
                    var v = d.variations[0];
                    price = toPrice(v.price) || toPrice((v.price_details || {}).offer_price);
                  }
                  if (!price && d.price && typeof d.price === 'object') {
                    price = toPrice(d.price.offer_price) || toPrice(d.price.mrp);
                  }
                }
                if (!price) return;
                var pid = d.product_id || '';
                var img = d.image_url || d.img_url || '';
                if (!img && d.image_id) img = 'https://media-assets.swiggy.com/swiggy/image/upload/' + d.image_id;
                wProducts.push({
                  product_name: name.trim(),
                  brand: d.brand_name || d.brand || '',
                  price: price,
                  mrp: toPrice(d.mrp) || price,
                  image_url: img,
                  product_url: d.deep_link || (pid ? 'https://www.swiggy.com/instamart/item/' + pid : ''),
                  weight: d.quantity || d.unit || d.weight || '',
                  in_stock: !(d.is_out_of_stock || d.out_of_stock || d.in_stock === false),
                  platform: 'Instamart'
                });
              });
            });
            if (wProducts.length > 0) {
              log(source + ' widgets strategy found ' + wProducts.length + ' products');
              send({ type:'SEARCH_RESULTS', platform:'Instamart', sessionId:window.__COMPAREX_SESSION_ID__||null, products:wProducts, success:true, error:null });
              return;
            }
          }
        } catch(e) { log(source + ' widgets strategy error: ' + e.message); }

        // Strategy B: Swiggy cards response — data.data.cards[i].card.card.gridElements/items
        // Debug confirmed: cards[0] = { card: { ... } }
        try {
          var cards = (data && data.data && data.data.cards) || [];
          if (cards.length > 0) {
            var cProducts = [];
            var seen2 = {};
            var card1Keys = cards[0] ? JSON.stringify(Object.keys(cards[0]).slice(0,5)) : 'none';
            var card2 = cards[0] && cards[0].card;
            var card2Keys = card2 ? JSON.stringify(Object.keys(card2).slice(0,8)) : 'none';
            var card3 = card2 && card2.card;
            var card3Keys = card3 ? JSON.stringify(Object.keys(card3).slice(0,8)) : 'none';
            log(source + ' card path debug: cards[0] keys=' + card1Keys + ' .card keys=' + card2Keys + ' .card.card keys=' + card3Keys);

            function tryAddProduct(info) {
              if (!info || typeof info !== 'object') return;
              var name = info.display_name || info.name || info.product_name || '';
              if (typeof name !== 'string' || name.trim().length < 3) return;
              // Swiggy prices are in paise (e.g. 2400 = ₹24)
              var rawPrice = info.price;
              var price = 0;
              if (rawPrice != null) {
                if (typeof rawPrice === 'object') {
                  // price is nested: { offer_price, mrp }
                  price = toPrice(rawPrice.offer_price || rawPrice.offerPrice || rawPrice.discounted_price) ||
                          toPrice(rawPrice.mrp);
                } else {
                  price = toPrice(rawPrice);
                }
              }
              if (!price) price = toPrice(info.offer_price || info.offerPrice || info.discounted_price || info.sp);
              if (!price) return;
              var key3 = name.trim().toLowerCase() + '|' + price;
              if (seen2[key3]) return;
              seen2[key3] = 1;
              var pid3 = info.product_id || info.id || '';
              var img3 = info.image_url || info.img_url || info.imageUrl || '';
              if (!img3 && info.image_id) img3 = 'https://media-assets.swiggy.com/swiggy/image/upload/' + info.image_id;
              cProducts.push({
                product_name: name.trim(),
                brand: info.brand_name || info.brand || '',
                price: price,
                mrp: toPrice(typeof info.mrp === 'object' ? (info.mrp.mrp || info.mrp.value) : info.mrp) || price,
                image_url: img3,
                product_url: info.deep_link || (pid3 ? 'https://www.swiggy.com/instamart/item/' + pid3 : ''),
                weight: info.quantity || info.unit || info.weight || info.pack_size || '',
                in_stock: !(info.is_out_of_stock || info.out_of_stock || info.in_stock === false),
                platform: 'Instamart'
              });
            }

            // Walk each card's nested structure following Swiggy's known layout
            cards.forEach(function(cardWrapper, ci) {
              if (!cardWrapper) return;
              // Swiggy wraps every card: { card: { card: { gridElements | items | inlineCard | ... } } }
              var outerCard = cardWrapper.card || cardWrapper;
              var innerCard = outerCard.card || outerCard;
              if (!innerCard) return;

              // Path 1: gridElements.infoWithStyle.items[].info  (main product grid)
              var ge = innerCard.gridElements;
              if (ge && ge.infoWithStyle && ge.infoWithStyle.items) {
                if (ci === 0) log(source + ' card[0] has gridElements.infoWithStyle.items len=' + ge.infoWithStyle.items.length);
                ge.infoWithStyle.items.forEach(function(item) {
                  tryAddProduct(item.info || item);
                });
              }

              // Path 2: items[] directly on card
              if (innerCard.items && Array.isArray(innerCard.items)) {
                if (ci === 0) log(source + ' card[0] has items len=' + innerCard.items.length);
                innerCard.items.forEach(function(item) {
                  tryAddProduct(item.info || item);
                });
              }

              // Path 3: inlineCard.shelfContent.inlineItems[].itemId -> product
              var inlineCard = innerCard.inlineCard;
              if (inlineCard && inlineCard.shelfContent && inlineCard.shelfContent.inlineItems) {
                inlineCard.shelfContent.inlineItems.forEach(function(item) {
                  tryAddProduct(item.itemId || item.info || item);
                });
              }

              // Path 4: band.cardSection.cards[].card -> another nested card level
              if (innerCard.band && innerCard.band.cardSection && innerCard.band.cardSection.cards) {
                innerCard.band.cardSection.cards.forEach(function(c2) {
                  var c2inner = (c2.card && c2.card.card) || c2.card || c2;
                  if (c2inner && c2inner.items) c2inner.items.forEach(function(i2){ tryAddProduct(i2.info||i2); });
                  var ge2 = c2inner && c2inner.gridElements;
                  if (ge2 && ge2.infoWithStyle && ge2.infoWithStyle.items) ge2.infoWithStyle.items.forEach(function(i2){ tryAddProduct(i2.info||i2); });
                });
              }
            });

            log(source + ' cards strategy found ' + cProducts.length + ' products');
            if (cProducts.length > 0) {
              send({ type:'SEARCH_RESULTS', platform:'Instamart', sessionId:window.__COMPAREX_SESSION_ID__||null, products:cProducts, success:true, error:null });
              return;
            }
          }
        } catch(e) { log(source + ' cards strategy error: ' + e.message); }

        // Strategy C: Generic tree walk (last resort)
        var products = collectProducts(data);
        log(source + ' generic walk extracted ' + products.length + ' products');

        if (products.length === 0) {
          // Deep path debug for next iteration
          try {
            var c0 = data && data.data && data.data.cards && data.data.cards[0];
            var c0c = c0 && c0.card;
            var c0cc = c0c && c0c.card;
            if (c0cc) {
              log(source + ' cards[0].card.card keys=' + JSON.stringify(Object.keys(c0cc).slice(0,10)));
              var ge3 = c0cc.gridElements;
              if (ge3) log(source + ' gridElements keys=' + JSON.stringify(Object.keys(ge3).slice(0,8)));
              if (ge3 && ge3.infoWithStyle) log(source + ' infoWithStyle keys=' + JSON.stringify(Object.keys(ge3.infoWithStyle).slice(0,8)));
              if (c0cc.items) log(source + ' items[0]=' + JSON.stringify(c0cc.items[0]).substring(0,300));
            }
          } catch(dbErr) {}
        }

        if (products.length > 0) {
          send({ type:'SEARCH_RESULTS', platform:'Instamart', sessionId:window.__COMPAREX_SESSION_ID__||null, products:products, success:true, error:null });
        }
      }

      if (!window.__comparexInstamartInterceptorsInstalled) {
        window.__comparexInstamartInterceptorsInstalled = true;

        try {
          var originalFetch = window.fetch;
          window.fetch = function(url) {
            var urlStr = typeof url === 'string' ? url : ((url && url.url) || '');
            var isSearch = urlStr.indexOf('/api/instamart/search') !== -1;
            var fetchPromise = originalFetch.apply(this, arguments);
            if (isSearch) {
              sync('fetch');
              fetchPromise.then(function(resp) {
                try {
                  resp.clone().json().then(function(data) {
                    handleData('fetch', data);
                  }).catch(function(err) {
                    log('fetch json parse failed: ' + err.message);
                  });
                } catch (e) {
                  log('fetch clone failed: ' + e.message);
                }
              }).catch(function(err) {
                log('fetch failed: ' + err.message);
              });
            }
            return fetchPromise;
          };
          log('fetch interceptor installed');
        } catch (e) {
          log('fetch intercept failed: ' + e.message);
        }

        try {
          var OriginalXHR = window.XMLHttpRequest;
          function PatchedXHR() {
            var xhr = new OriginalXHR();
            var openUrl = '';
            var originalOpen = xhr.open.bind(xhr);
            xhr.open = function(method, url) {
              openUrl = typeof url === 'string' ? url : '';
              return originalOpen.apply(xhr, arguments);
            };
            xhr.addEventListener('load', function() {
              try {
                if (openUrl.indexOf('/api/instamart/search') === -1 || !xhr.responseText) return;
                sync('xhr');
                handleData('xhr', JSON.parse(xhr.responseText));
              } catch (e) {
                log('xhr parse failed: ' + e.message);
              }
            });
            return xhr;
          }
          PatchedXHR.prototype = OriginalXHR.prototype;
          window.XMLHttpRequest = PatchedXHR;
          log('xhr interceptor installed');
        } catch (e) {
          log('xhr intercept failed: ' + e.message);
        }
      } else {
        log('interceptors already installed');
      }

      sync('initial');
      setTimeout(function() { sync('delayed-2s'); }, 2000);
      setTimeout(function() { sync('delayed-5s'); }, 5000);
      log('interceptor bootstrap complete');
    })();
    true;
  `;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CompareX</Text>
        <SearchBar value={query} onChangeText={setQuery} />
      </View>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>
            Searching {state.connectedPlatforms.length} platforms...
          </Text>
          <Text style={styles.loaderDetail}>
            {Object.keys(platformResults).length}/
            {state.connectedPlatforms.length} completed
          </Text>
        </View>
      )}

      <FlatList
        data={results}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => handleProduct(item)} />
        )}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
        key={state.forceUpdate}
      />

      {/* Hidden WebViews for authenticated platform scraping */}
      {query.trim() &&
        state.connectedPlatforms.map((platform) => (
          <WebView
            key={platform}
            ref={(ref) => (webViewRefs.current[platform] = ref)}
            source={{ uri: searchUrls[platform] || getPlatformUrl(platform) }}
            style={styles.hiddenWebView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={(event) => handleWebViewMessage(platform, event)}
            onLoadEnd={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              const eventUrl = nativeEvent.url;
              const currentUrl =
                eventUrl || currentWebViewUrlsRef.current[platform];

              console.log(
                `[Search] WebView onLoadEnd for ${platform}, currentUrl: ${currentUrl}`,
              );
              // Only inject if the WebView is actually on the search URL
              const searchUrl = searchUrls[platform];

              const isMatch =
                currentUrl &&
                searchUrl &&
                currentUrl.includes(searchUrl.split("?")[0]);
              const isInstamartAggressiveMatch =
                platform === "Instamart" &&
                currentUrl &&
                currentUrl.includes("swiggy.com/instamart/search");

              if (isMatch || isInstamartAggressiveMatch) {
                injectDomParser(platform, "onLoadEnd");
              } else {
                console.log(
                  `[Search] Skipping injection for ${platform}: URL mismatch (current: ${currentUrl}, search: ${searchUrl})`,
                );
              }
            }}
            userAgent={
              platform === "Instamart"
                ? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
                : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            incognito={false}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            geolocationEnabled={true}
            injectedJavaScriptBeforeContentLoaded={
              platform === "Instamart" ? instamartInterceptScript : undefined
            }
            injectedJavaScript={
              platform === "Instamart" ? instamartInterceptScript : undefined
            }
            onLoadStart={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              currentWebViewUrlsRef.current[platform] = nativeEvent.url;
              console.log(
                `[Search] ${platform} WebView load start: ${nativeEvent.url}`,
              );

              if (
                platform === "Instamart" &&
                searchSessionIdRef.current &&
                !platformResultsRef.current[platform]
              ) {
                console.log(
                  "[Search] Re-arming Instamart timeout on load start",
                );
                armPlatformTimeout(platform, searchSessionIdRef.current);
              }

              // Test injection for Instamart
              if (platform === "Instamart") {
                setTimeout(() => {
                  webViewRefs.current[platform]?.injectJavaScript(`
                  try {
                    window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', message: '[Instamart] Test injection successful'}));
                  } catch(e) {
                    console.log('Test injection failed:', e);
                  }
                `);
                }, 2000);
              }

              // Fallback: if onLoadEnd doesn't fire, inject after 10s anyway
              setTimeout(() => {
                const currentUrl = currentWebViewUrlsRef.current[platform];
                const searchUrl = searchUrls[platform];
                if (
                  currentUrl &&
                  searchUrl &&
                  currentUrl.includes(searchUrl.split("?")[0])
                ) {
                  injectDomParser(platform, "loadStartFallback");
                }
              }, 10000);
            }}
            onNavigationStateChange={(navState) => {
              currentWebViewUrlsRef.current[platform] = navState.url;
              if (platform === "Instamart") {
                console.log(
                  `[Search] Instamart navigation: ${navState.url}, loading: ${navState.loading}`,
                );

                // Swiggy often redirects to a custom_back URL without reliably triggering consistent load events.
                // Inject once while loading, and again when loading=false for the same URL to avoid script loss.
                const isSearchUrl =
                  typeof navState.url === "string" &&
                  navState.url.includes("/instamart/search");
                if (isSearchUrl) {
                  if (
                    navState.loading &&
                    searchSessionIdRef.current &&
                    !platformResultsRef.current[platform]
                  ) {
                    armPlatformTimeout(platform, searchSessionIdRef.current);
                  }
                  const phase = navState.loading ? "loading" : "ready";
                  const phaseKey = `${navState.url}|${phase}`;
                  const lastPhaseKey = lastInjectedUrlRef.current[platform];
                  if (
                    lastPhaseKey !== phaseKey &&
                    currentSearchQueryRef.current
                  ) {
                    lastInjectedUrlRef.current[platform] = phaseKey;
                    injectDomParser(
                      platform,
                      phase === "ready" ? "navReady" : "navFinishAggr",
                    );
                  }
                }
              }
            }}
            onError={(e) => {
              console.log(`[Search] ${platform} WebView error:`, e.nativeEvent);
            }}
            onHttpError={(e) => {
              console.log(
                `[Search] ${platform} HTTP error:`,
                e.nativeEvent.statusCode,
                e.nativeEvent.url,
              );
            }}
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
    Instamart: "https://www.swiggy.com/instamart",
  };
  return urls[platform] || "about:blank";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: SPACING.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  loader: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  loaderText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "500",
  },
  loaderDetail: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.textLight,
  },
  list: {
    padding: SPACING.md,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
  warning: {
    flexDirection: "row",
    backgroundColor: "#FFF3CD",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.xl,
    alignItems: "center",
  },
  warningText: {
    flex: 1,
    marginLeft: SPACING.sm,
    color: "#856404",
    fontSize: 14,
  },
  suggestions: {
    marginTop: SPACING.xl,
    width: "100%",
  },
  suggestTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  chip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    color: COLORS.primary,
    fontSize: 14,
  },
  hiddenWebView: {
    width: 300,
    height: 300,
    opacity: 0.5,
    position: "absolute",
    top: -400,
  },
});

export default SearchScreen;
