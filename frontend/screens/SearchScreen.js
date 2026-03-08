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
const ENABLE_BACKEND_FALLBACK = false;
const ENABLE_BACKEND_COLLECTION = false;
const DEFAULT_PLATFORM_TIMEOUT_MS = 22000;
const INSTAMART_INITIAL_TIMEOUT_MS = 25000;
const INSTAMART_RETRY_TIMEOUT_MS = 15000;
const OVERALL_SEARCH_TIMEOUT_MS = 90000;

const instamartInterceptScript = `
  (function() {
    if (window.__cxImInstalled) {
      try {
        if (typeof window.__cxImRun === 'function') {
          window.__cxImRun('reinject');
        }
      } catch (e) {}
      true;
      return;
    }
    window.__cxImInstalled = true;

    var __sentProducts = false;

    function log(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', message: '[IM] ' + msg }));
    }

    function postProducts(products, source) {
      if (!Array.isArray(products) || products.length === 0) return false;
      if (__sentProducts) return true;
      __sentProducts = true;
      log((source || 'unknown') + ' parsed ' + products.length + ' products');
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'PRODUCTS',
        platform: 'Instamart',
        products: products
      }));
      return true;
    }

    function normalizePrice(raw) {
      if (raw === null || raw === undefined) return 0;
      var n = typeof raw === 'string' ? parseFloat(String(raw).replace(/[^0-9.]/g, '')) : Number(raw);
      if (!isFinite(n) || n <= 0) return 0;
      if (n > 500 && Math.round(n) === n) return Math.round((n / 100) * 100) / 100;
      return Math.round(n * 100) / 100;
    }

    function addProduct(products, seen, candidate) {
      if (!candidate) return;
      var name = (candidate.name || '').trim();
      var price = normalizePrice(candidate.price);
      var mrp = normalizePrice(candidate.mrp || candidate.price);
      if (!name || name.length < 3 || !price) return;
      if (!mrp) mrp = price;
      var key = name.toLowerCase() + '|' + price;
      if (seen[key]) return;
      seen[key] = 1;
      products.push({
        platform: 'Instamart',
        name: name,
        price: price,
        mrp: mrp,
        inStock: candidate.inStock !== false,
        deliveryTime: '10-15 mins',
        deepLink: candidate.deepLink || 'https://www.swiggy.com/instamart'
      });
    }

    function collectFromObjectTree(root, products, seen) {
      function walk(node, depth) {
        if (!node || depth > 10) return;
        if (Array.isArray(node)) {
          for (var i = 0; i < node.length; i++) walk(node[i], depth + 1);
          return;
        }
        if (typeof node !== 'object') return;

        var name = node.display_name || node.name || node.displayName || node.title || '';
        var priceObj = node.price && typeof node.price === 'object' ? node.price : null;
        var price = priceObj
          ? (priceObj.offer_price || priceObj.discounted_price || priceObj.selling_price || priceObj.price)
          : (node.offer_price || node.discounted_price || node.selling_price || node.sellingPrice || node.finalPrice || node.final_price || node.sp || node.price);
        var mrp = priceObj ? (priceObj.mrp || priceObj.originalPrice) : (node.mrp || node.originalPrice || node.original_price);
        var id = node.id || node.product_id || node.productId || '';

        addProduct(products, seen, {
          name: name,
          price: price,
          mrp: mrp,
          inStock: node.out_of_stock !== true && node.in_stock !== false,
          deepLink: id ? ('https://www.swiggy.com/instamart/item/' + encodeURIComponent(String(id))) : (node.deep_link || node.url || '')
        });

        var keys = Object.keys(node);
        for (var k = 0; k < keys.length; k++) {
          walk(node[keys[k]], depth + 1);
        }
      }
      walk(root, 0);
    }

    function collectFromDom(products, seen) {
      var nodes = Array.from(document.querySelectorAll(
        'a[href*="/instamart/item/"], [data-testid*="item"], [class*="ProductCard"], [class*="product-card"], [class*="ProductTile"], [class*="productTile"]'
      ));

      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text || text.length < 8) continue;

        var heading = node.querySelector('h1,h2,h3,h4,[class*="name"],[class*="title"]');
        var name = heading && heading.textContent ? heading.textContent.trim() : '';
        if (!name) {
          name = text
            .replace(/₹\s*\d+(?:\.\d+)?/g, ' ')
            .replace(/\bADD\b/gi, ' ')
            .replace(/\b\d+\s*mins?\b/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .slice(0, 10)
            .join(' ');
        }

        var priceMatches = text.match(/₹\s*([0-9]+(?:\.[0-9]+)?)/g) || [];
        if (priceMatches.length === 0) continue;
        var prices = priceMatches
          .map(function(entry) { return parseFloat(String(entry).replace(/[^0-9.]/g, '')); })
          .filter(function(v) { return isFinite(v) && v > 0 && v < 10000; })
          .sort(function(a, b) { return a - b; });
        if (prices.length === 0) continue;

        var link = node.href || (node.closest && node.closest('a') && node.closest('a').href) || '';
        addProduct(products, seen, {
          name: name,
          price: prices[0],
          mrp: prices[0],
          inStock: text.toLowerCase().indexOf('out of stock') === -1,
          deepLink: link
        });
      }
    }

    function collectFromHtmlRegex(html, products, seen) {
      if (!html || typeof html !== 'string') return;
      var regex = /"display_name"\s*:\s*"([^"\\]{3,160}(?:\\.[^"\\]{0,40})*)"[\s\S]{0,220}?"(?:offer_price|discounted_price|selling_price|price|mrp)"\s*:\s*([0-9]{1,7})/g;
      var match;
      while ((match = regex.exec(html)) !== null) {
        var name = String(match[1] || '').replace(/\\u[0-9a-fA-F]{4}/g, ' ').replace(/\\"/g, ' ').replace(/\s+/g, ' ').trim();
        var raw = parseInt(match[2], 10);
        if (!name || !raw) continue;
        var price = raw > 500 ? raw / 100 : raw;
        addProduct(products, seen, {
          name: name,
          price: price,
          mrp: price,
          inStock: true,
          deepLink: ''
        });
        if (products.length >= 120) break;
      }
    }
    
    function toPrice(p) {
      if (!p) return 0;
      if (typeof p === 'number') return p / 100;
      var str = String(p).replace(/[^0-9.]/g, '');
      return str ? parseFloat(str) / 100 : 0;
    }

    function syncTokens(reason) {
      try {
        var payload = {
          cookie: document.cookie || '',
          authHeaders: localStorage.swiggy_auth_headers || localStorage.auth_headers || '',
          swiggyUserInfo: localStorage.swiggy_user_info || localStorage.user_info || '',
          syncReason: reason,
          syncUrl: location.href
        };
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SYNC_TOKENS',
          platform: 'Instamart',
          payload: payload
        }));
      } catch(e) {}
    }

    function onData(source, data) {
      try {
        log(source + ' onData called');
        if (!data) { log('no data'); return; }
        if (!data.data) { log('no data.data, keys: ' + Object.keys(data).join(',')); return; }
        
        var dataOuter = data.data;
        var dataInner = dataOuter.data || dataOuter;
        if (!dataInner.cards || !Array.isArray(dataInner.cards)) { 
          log('no cards arrays. keys: ' + Object.keys(dataInner).join(',')); 
          return; 
        }
        
        var products = [];
        for (var i = 0; i < dataInner.cards.length; i++) {
          var wrapper = dataInner.cards[i] || {};
          var cardContainer = wrapper.card || wrapper;
          var card = (cardContainer && cardContainer.card) ? cardContainer.card : cardContainer;
          if (!card) { 
            log('card ' + i + ' has no .card, keys: ' + Object.keys(dataInner.cards[i]).join(','));
            continue; 
          }
          
          // Log card type for debugging
          log('card ' + i + ' @type: ' + (card['@type'] || 'unknown') + ', keys: ' + Object.keys(card).join(','));
          
          // Try different structures
          if (card.gridElements && card.gridElements.infoWithStyle) {
            // Original structure
            var items = card.gridElements.infoWithStyle.items;
            if (!Array.isArray(items)) {
              log('card ' + i + ' items not array, type: ' + typeof items);
              continue;
            }
            
            for (var j = 0; j < items.length; j++) {
              var info = items[j].info;
              if (!info) continue;
              
              var name = info.display_name || info.name || '';
              if (name.length < 3) continue;
              
              var price = 0, mrp = 0;
              if (info.price && typeof info.price === 'object') {
                price = toPrice(info.price.offer_price || info.price.discounted_price || info.price.price);
                mrp = toPrice(info.price.mrp);
              } else {
                price = toPrice(info.offer_price || info.price);
                mrp = toPrice(info.mrp);
              }
              if (!price) price = mrp;
              if (!mrp) mrp = price;
              if (!price) continue;
              
              var inStock = true;
              if (info.out_of_stock !== undefined) inStock = !info.out_of_stock;
              else if (info.in_stock !== undefined) inStock = !!info.in_stock;

              var itemId = info.id || '';
              var deepLink = itemId ? 'https://www.swiggy.com/instamart/item/' + encodeURIComponent(String(itemId)) : 'https://www.swiggy.com/instamart';

              products.push({
                platform: 'Instamart',
                name: name,
                price: price,
                mrp: mrp,
                inStock: inStock,
                deliveryTime: '10-15 mins',
                deepLink: deepLink
              });
            }
          } else if ((card['@type'] && String(card['@type']).toLowerCase().indexOf('product') !== -1) || card.type === 'product') {
            // New structure - direct product card
            log('card ' + i + ' is ProductCard, extracting product');
            var name = card.name || card.displayName || card.title || '';
            if (name.length < 3) continue;
            
            var price = 0, mrp = 0;
            if (card.price) {
              if (typeof card.price === 'object') {
                price = toPrice(card.price.offerPrice || card.price.finalPrice || card.price.price);
                mrp = toPrice(card.price.mrp || card.price.originalPrice);
              } else {
                price = toPrice(card.price);
              }
            }
            if (!price) price = mrp;
            if (!mrp) mrp = price;
            if (!price) continue;
            
            var inStock = true;
            if (card.outOfStock !== undefined) inStock = !card.outOfStock;
            else if (card.inStock !== undefined) inStock = !!card.inStock;
            else if (card.availability !== undefined) inStock = card.availability === 'IN_STOCK';

            var itemId = card.id || card.productId || '';
            var deepLink = itemId ? 'https://www.swiggy.com/instamart/item/' + encodeURIComponent(String(itemId)) : 'https://www.swiggy.com/instamart';

            products.push({
              platform: 'Instamart',
              name: name,
              price: price,
              mrp: mrp,
              inStock: inStock,
              deliveryTime: '10-15 mins',
              deepLink: deepLink
            });
          } else if (card.items && Array.isArray(card.items)) {
            // Alternative structure with direct items array
            log('card ' + i + ' has direct items array');
            for (var j = 0; j < card.items.length; j++) {
              var item = card.items[j];
              var name = item.name || item.displayName || item.title || '';
              if (name.length < 3) continue;
              
              var price = 0, mrp = 0;
              if (item.price) {
                if (typeof item.price === 'object') {
                  price = toPrice(item.price.offerPrice || item.price.finalPrice || item.price.price);
                  mrp = toPrice(item.price.mrp || item.price.originalPrice);
                } else {
                  price = toPrice(item.price);
                }
              }
              if (!price) price = mrp;
              if (!mrp) mrp = price;
              if (!price) continue;
              
              var inStock = true;
              if (item.outOfStock !== undefined) inStock = !item.outOfStock;
              else if (item.inStock !== undefined) inStock = !!item.inStock;
              else if (item.availability !== undefined) inStock = item.availability === 'IN_STOCK';

              var itemId = item.id || item.productId || '';
              var deepLink = itemId ? 'https://www.swiggy.com/instamart/item/' + encodeURIComponent(String(itemId)) : 'https://www.swiggy.com/instamart';

              products.push({
                platform: 'Instamart',
                name: name,
                price: price,
                mrp: mrp,
                inStock: inStock,
                deliveryTime: '10-15 mins',
                deepLink: deepLink
              });
            }
          }
        }
        
        if (!postProducts(products, source)) {
          log(source + ' parsed 0 products. Examined ' + dataInner.cards.length + ' cards');
        }
      } catch(e) {
        log('Parse error: ' + e.message);
      }
    }

    function parseDomProducts(source) {
      try {
        var nodes = Array.from(document.querySelectorAll(
          'a[href*="/instamart/item/"], [data-testid*="item"], [class*="ProductCard"], [class*="product-card"], [class*="ProductTile"], [class*="productTile"]'
        ));
        var products = [];
        var seen = {};

        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          var text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
          if (!text || text.length < 8) continue;

          var heading = node.querySelector('h1,h2,h3,h4,[class*="name"],[class*="title"]');
          var name = heading && heading.textContent ? heading.textContent.trim() : '';
          if (!name) {
            name = text
              .replace(/₹\s*\d+(?:\.\d+)?/g, ' ')
              .replace(/\bADD\b/gi, ' ')
              .replace(/\b\d+\s*mins?\b/gi, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .split(' ')
              .slice(0, 10)
              .join(' ');
          }
          if (!name || name.length < 3) continue;

          var priceMatches = text.match(/₹\s*([0-9]+(?:\.[0-9]+)?)/g) || [];
          var price = 0;
          if (priceMatches.length > 0) {
            var numbers = priceMatches
              .map(function(entry) { return parseFloat(String(entry).replace(/[^0-9.]/g, '')); })
              .filter(function(v) { return isFinite(v) && v > 0 && v < 10000; })
              .sort(function(a, b) { return a - b; });
            if (numbers.length > 0) price = numbers[0];
          }
          if (!price) continue;

          var href = node.href || (node.closest && node.closest('a') && node.closest('a').href) || '';
          var key = name.toLowerCase().trim() + '|' + price;
          if (seen[key]) continue;
          seen[key] = 1;

          products.push({
            platform: 'Instamart',
            name: name,
            price: price,
            mrp: price,
            inStock: text.toLowerCase().indexOf('out of stock') === -1,
            deliveryTime: '10-15 mins',
            deepLink: href || 'https://www.swiggy.com/instamart'
          });
        }

        if (!postProducts(products, source || 'dom')) {
          log((source || 'dom') + ' parsed 0 products from ' + nodes.length + ' nodes');
        }
      } catch (err) {
        log('DOM parse error: ' + err.message);
      }
    }

    function shouldInterceptUrl(rawUrl) {
      try {
        var str = String(rawUrl || '');
        var lower = str.toLowerCase();
        if (!lower) return false;
        if (lower.indexOf('google-analytics.com') !== -1) return false;
        if (lower.indexOf('googletagmanager.com') !== -1) return false;
        if (lower.indexOf('google.com/ccm/collect') !== -1) return false;
        if (lower.indexOf('bam.nr-data.net') !== -1) return false;
        if (lower.indexOf('/api/instamart/') !== -1) return true;
        if (lower.indexOf('/dapi/instamart/') !== -1) return true;
        if (lower.indexOf('/instamart/search') !== -1) return true;
        return false;
      } catch(e) {
        return false;
      }
    }

    var OrigFetch = window.fetch;
    window.fetch = async function() {
      var url = arguments[0];
      var response = await OrigFetch.apply(this, arguments);
      if (shouldInterceptUrl(url)) {
        log('fetch intercepting URL: ' + url);
        response.clone().text().then(text => {
          if (!text) { log('fetch skip: empty body for ' + url); return; }
          try {
            var data = JSON.parse(text);
            syncTokens('fetch');
            onData('fetch', data);
          } catch(e) { log('fetch JSON parse err: ' + e.message + ' | text: ' + text.substring(0, 100)); }
        }).catch(e => log('fetch text clone err: '+e.message));
      }
      return response;
    };
    log('fetch interceptor installed');
    
    var OrigXHR = window.XMLHttpRequest;
    function PatchedXHR() {
      var xhr = new OrigXHR();
      var _url = '';
      xhr.open = function(method, url) {
        _url = url;
        return OrigXHR.prototype.open.apply(this, arguments);
      };
      xhr.addEventListener('load', function() {
        if (shouldInterceptUrl(_url) && xhr.responseText) {
          log('xhr intercepting URL: ' + _url);
          try {
            syncTokens('xhr');
            onData('xhr', JSON.parse(xhr.responseText));
          } catch(e) { log('xhr JSON parse err: '+e.message); }
        }
      });
      return xhr;
    }
    PatchedXHR.prototype = OrigXHR.prototype;
    window.XMLHttpRequest = PatchedXHR;
    log('xhr interceptor installed');

    async function runWebsiteExtraction(reason) {
      if (__sentProducts) return;
      syncTokens(reason || 'run');
      var products = [];
      var seen = {};

      try {
        var nextDataEl = document.querySelector('script#__NEXT_DATA__');
        var nextDataText = nextDataEl ? nextDataEl.textContent : '';
        if (nextDataText && nextDataText.trim().charAt(0) === '{') {
          collectFromObjectTree(JSON.parse(nextDataText), products, seen);
        }
      } catch (e) {
        log('next-data parse error: ' + e.message);
      }

      if (products.length === 0) {
        try {
          collectFromDom(products, seen);
        } catch (e) {
          log('dom collect error: ' + e.message);
        }
      }

      if (products.length === 0) {
        try {
          collectFromHtmlRegex(document.documentElement ? document.documentElement.innerHTML : '', products, seen);
        } catch (e) {
          log('html regex error: ' + e.message);
        }
      }

      if (products.length === 0) {
        try {
          var resp = await fetch(location.href, { method: 'GET', credentials: 'include' });
          var html = await resp.text();
          collectFromHtmlRegex(html, products, seen);
        } catch (e) {
          log('html refetch failed: ' + e.message);
        }
      }

      if (!postProducts(products, reason || 'website')) {
        log((reason || 'website') + ' parsed 0 products from website content');
      }
    }

    window.__cxImRun = runWebsiteExtraction;
    runWebsiteExtraction('boot');

    var tries = 0;
    var domTimer = setInterval(function() {
      tries += 1;
      if (__sentProducts || tries > 8) {
        clearInterval(domTimer);
        return;
      }
      runWebsiteExtraction('dom-poll-' + tries);
    }, 2500);
  })();
  true;
`;

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
                ENABLE_BACKEND_FALLBACK
                  ? `[Search] ${platform} timed out after retry, trying backend fallback`
                  : `[Search] ${platform} timed out after retry in WebView-only mode`,
              );
              if (ENABLE_BACKEND_FALLBACK) {
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

  const getConnectedPlatformsSnapshot = useCallback(async () => {
    try {
      console.log("[Search] getConnectedPlatformsSnapshot called");
      const tokens = await AsyncStorage.getItem("userTokens");
      console.log("[Search] tokens from storage:", tokens ? "present" : "null");
      if (!tokens) return [];
      const parsed = JSON.parse(tokens);
      const supportedPlatforms = ["Blinkit", "BigBasket", "Zepto", "Instamart"];
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
          if (hasAuthHeaders && hasUserInfo) return true;
          return true; // We always allow Instamart through to the WebView so it can refresh tokens
        }

        return true;
      });

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
  }, []);

  const checkConnectedPlatforms = useCallback(() => {
    getConnectedPlatformsSnapshot()
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
      const rawData = JSON.parse(event.nativeEvent.data);
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
                  : "Instamart parser returned 0 products",
              products: (rawData.products || []).map((product) => ({
                product_name: product.product_name || product.name || "",
                brand: product.brand || "",
                price: Number(product.price) || 0,
                mrp: Number(product.mrp) || Number(product.price) || 0,
                image_url: product.image_url || "",
                product_url: product.product_url || product.deepLink || "",
                in_stock:
                  product.in_stock !== undefined
                    ? !!product.in_stock
                    : product.inStock !== undefined
                      ? !!product.inStock
                      : true,
                weight: product.weight || "",
                platform: product.platform || platform,
              })),
            }
          : rawData;

      if (data.type === "TOKENS_SYNC" || data.type === "SYNC_TOKENS") {
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
            injectedJavaScriptBeforeContentLoaded={undefined}
            injectedJavaScript={undefined}
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
