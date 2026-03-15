// Platform scraping service that uses authenticated WebViews
import { Platform } from "react-native";

class PlatformScraperService {
  constructor() {
    this.platforms = {
      Blinkit: {
        searchScript: (query, lat, lng) => `
          (async function() {
            const log = (msg) => {
              try {
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', message: '[Blinkit] ' + msg}));
              } catch(e) {}
            };
            
            try {
              log('Starting search for: ${query}');
              
              // Parse auth from localStorage (stored as JSON string)
              const authJSON = localStorage.getItem('auth');
              let accessToken = '';
              let authKey = '';
              
              if (authJSON) {
                try {
                  const authData = JSON.parse(authJSON);
                  accessToken = authData.access_token || authData.accessToken || '';
                  authKey = authData.auth_key || authData.authKey || '';
                  log('Parsed auth from localStorage');
                } catch(e) {
                  log('Failed to parse auth JSON: ' + e.message);
                }
              }
              
              // Fallback: try authKey from localStorage directly
              if (!authKey) {
                authKey = localStorage.getItem('authKey') || '';
              }
              
              log('Has accessToken: ' + !!accessToken);
              log('Has authKey: ' + !!authKey);
              
              const url = \`https://blinkit.com/v6/search/products?start=0&size=20&q=\${encodeURIComponent(
                query,
              )}&lat=\${lat}&lon=\${lng}\`;
              log('URL: ' + url);
              
              const response = await fetch(url, {
                headers: {
                  'accept': 'application/json, text/plain, */*',
                  'access_token': accessToken,
                  'auth_key': authKey,
                  'app_client': 'consumer_web',
                  'app_version': '52.9',
                  'origin': 'https://blinkit.com',
                  'referer': 'https://blinkit.com/',
                  'Cookie': document.cookie
                }
              });
              
              log('Response status: ' + response.status);
              
              if (!response.ok) {
                const errorText = await response.text();
                log('Error response: ' + errorText.substring(0, 200));
                throw new Error('API returned ' + response.status);
              }
              
              const data = await response.json();
              log('Got data, products count: ' + (data.products?.length || 0));
              
              const products = (data.products || []).map(p => ({
                product_name: p.name || p.product_name,
                brand: p.brand || '',
                price: p.price || 0,
                mrp: p.mrp || p.price || 0,
                image_url: p.image_url || '',
                product_url: 'https://blinkit.com' + (p.url || ''),
                in_stock: p.available !== false,
                weight: p.unit || '',
                platform: 'Blinkit'
              }));
              
              log('Parsed products: ' + products.length);
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SEARCH_RESULTS',
                platform: 'Blinkit',
                products: products,
                success: true
              }));
            } catch (error) {
              log('Error: ' + error.message);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SEARCH_RESULTS',
                platform: 'Blinkit',
                error: error.message,
                success: false,
                products: []
              }));
            }
          })();
        `,
      },

      Zepto: {
        searchScript: (query, lat, lng) => `
          (async function() {
            const log = (msg) => {
              try {
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', message: '[Zepto-API] ' + msg}));
              } catch(e) {}
            };

            try {
              log('Starting API search for: ${query}');

              // Controller to abort if API takes too long (fall through to DOM parser)
              const controller = new AbortController();
              const apiTimeout = setTimeout(() => controller.abort(), 3000);

              const response = await fetch('https://api.zepto.co.in/api/v1/search', {
                method: 'POST',
                signal: controller.signal,
                headers: {
                  'Content-Type': 'application/json',
                  'accept': 'application/json',
                  'origin': 'https://www.zepto.com',
                  'referer': 'https://www.zepto.com/',
                  'x-app-version': '12.0.0',
                  'x-channel': 'WEB',
                  'Cookie': document.cookie
                },
                body: JSON.stringify({
                  query: "${query}",
                  pageNumber: 0,
                  mode: "AUGMENTED",
                  searchSource: "PRIMARY_SEARCH_BAR",
                  intentId: "281d2279-058b-4b13-b541-69aa1c27806f"
                })
              });

              clearTimeout(apiTimeout);
              log('API status: ' + response.status);

              if (!response.ok) {
                throw new Error('API returned ' + response.status);
              }

              const data = await response.json();
              const rawItems = data.results || data.items || data.data || [];
              log('API returned ' + rawItems.length + ' items');

              if (rawItems.length === 0) {
                throw new Error('API returned 0 results');
              }

              // Zepto prices are in paise (÷100)
              const toRupees = (v) => {
                if (!v && v !== 0) return 0;
                const n = typeof v === 'string' ? parseFloat(v) : v;
                if (!Number.isFinite(n) || n <= 0) return 0;
                return n > 9999 ? Math.round(n / 100) : Math.round(n);
              };

              const products = rawItems.map(p => {
                const rawSelling = p.sellingPrice ?? p.discountedSellingPrice ?? p.price ?? 0;
                const rawDiscount = p.discountAmount ?? 0;
                const rawMrp = p.mrp ?? p.original_price ?? 0;
                const price = toRupees(rawSelling);
                let mrp = toRupees(rawMrp);
                if (mrp <= price && rawDiscount > 0) {
                  mrp = toRupees(rawSelling + rawDiscount);
                }
                return {
                  product_name: p.name || p.display_name || '',
                  brand: p.brand || '',
                  price,
                  mrp: mrp > price ? mrp : price,
                  image_url: p.image || p.imageUrl || '',
                  product_url: (p.slug && p.id)
                    ? \`https://www.zepto.com/pn/\${p.slug}/pvid/\${p.id}\`
                    : '',
                  in_stock: p.in_stock !== false,
                  weight: p.weight || p.quantity || '',
                  platform: 'Zepto'
                };
              }).filter(p => p.product_name && p.price > 0);

              log('Parsed ' + products.length + ' products via API');

              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SEARCH_RESULTS',
                platform: 'Zepto',
                products,
                success: true
              }));

            } catch (error) {
              // API failed or timed out — DOM parser will handle it via onLoadEnd/injection.
              log('API failed (' + error.message + '), DOM parser will take over');
              // Don't send a failure message — SearchScreen will wait for the DOM injection.
            }
          })();
        `,
      },


      BigBasket: {
        searchScript: (query) => `
          (async function() {
            const log = (msg) => {
              try {
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', message: '[BigBasket] ' + msg}));
              } catch(e) {}
            };
            
            try {
              log('Starting search for: ${query}');
              
              const url = \`https://www.bigbasket.com/listing-svc/v2/products?type=pc&iss=false&page=1&tab_type=["all"]&sorted_on=relevance&q=\${encodeURIComponent(\`${query}\`)}\`;
              log('URL: ' + url);
              
              const response = await fetch(url, {
                headers: {
                  'accept': 'application/json',
                  'x-channel': 'BB-WEB',
                  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                  'Cookie': document.cookie
                }
              });
              
              log('Response status: ' + response.status);
              
              if (!response.ok) {
                const errorText = await response.text();
                log('Error response: ' + errorText.substring(0, 200));
                throw new Error('API returned ' + response.status);
              }
              
              const data = await response.json();
              log('Got data, products count: ' + (data.products?.length || 0));
              
              const products = (data.products || []).map(p => ({
                product_name: p.p_name || p.name,
                brand: p.p_brand || '',
                price: p.pricing?.price || 0,
                mrp: p.pricing?.mrp || p.pricing?.price || 0,
                image_url: p.p_img_url || '',
                product_url: p.absolute_url || '',
                in_stock: p.is_available !== false,
                weight: p.w || '',
                platform: 'BigBasket'
              }));
              
              log('Parsed products: ' + products.length);
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SEARCH_RESULTS',
                platform: 'BigBasket',
                products: products,
                success: true
              }));
            } catch (error) {
              log('Error: ' + error.message);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SEARCH_RESULTS',
                platform: 'BigBasket',
                error: error.message,
                success: false
              }));
            }
          })();
        `,
      },

      Instamart: {
        searchScript: (query) => `
          (async function() {
            if (window.__instamartAPIParserRunning) return;
            window.__instamartAPIParserRunning = true;

            const log = (msg) => {
              try {
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', message: '[Instamart-API] ' + msg}));
              } catch(e) {}
            };

            try {
              log('Starting Swiggy Instamart API search for: ${query}');

              // Extract location from Swiggy's own page state
              let lat = '', lng = '';
              try {
                // Swiggy stores this in localStorage
                const userLocation = localStorage.getItem('userLocation') || localStorage.getItem('swiggy_location');
                if (userLocation) {
                  const loc = JSON.parse(userLocation);
                  lat = loc.lat || loc.latitude || '';
                  lng = loc.lng || loc.longitude || '';
                }
                
                // Fallback: check Redux state in window
                if (!lat && window.__REDUX_STATE__) {
                  const state = window.__REDUX_STATE__;
                  lat = state?.geoLocation?.lat || '';
                  lng = state?.geoLocation?.lng || '';
                }
              } catch(e) {
                log('Could not extract location: ' + e.message);
              }

              log('Using location: lat=' + lat + ' lng=' + lng);
              const url = \`https://www.swiggy.com/api/instamart/home?pageType=INSTAMART_SEARCH_PAGE&query=\${encodeURIComponent(${JSON.stringify(query)})}&lat=\${lat}&lng=\${lng}\`;

              // Diagnostic: Check for session mismatch
              try {
                const sid = document.cookie.match(/sid=([^;]+)/)?.[1];
                const loc = JSON.parse(localStorage.getItem('userLocation') || '{}');
                log('Session city vs location: sid=' + (sid ? sid.substring(0, 8) + '...' : 'none') + 
                    ', lat=' + loc.lat + ', lng=' + loc.lng + 
                    ', city=' + (loc.deliveryAddress?.city || loc.city || 'unknown'));
              } catch(e) {}

              // Read auth headers from localStorage
              let customHeaders = {};
              try {
                const stored = localStorage.getItem('auth_headers') || localStorage.getItem('swiggy_auth_headers');
                if (stored) {
                  customHeaders = JSON.parse(stored);
                  log('Found stored Swiggy auth headers');
                }
              } catch(e) {}
              const MAX_RETRIES = 8;
              const FIXED_DELAY_MS = 1500;

              for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                try {
                  if (attempt > 0) {
                    log('Retry ' + attempt + '/' + MAX_RETRIES + ' after ' + FIXED_DELAY_MS + 'ms wait...');
                    await new Promise(r => setTimeout(r, FIXED_DELAY_MS));
                  }

                  const headers = {
                    ...customHeaders,
                    'Cookie': document.cookie,
                    'accept': 'application/json, text/plain, */*',
                    'content-type': 'application/json',
                    'x-requested-with': 'XMLHttpRequest',
                    'x-build-version': '2.328.0'
                  };

                  log('Request URL: ' + url);
                  log('Headers being sent: ' + JSON.stringify(Object.keys(headers)));

                  const sidCookie = document.cookie.match(/\\bsid=([^;]+)/);
                  log('sid from cookie at fetch time: ' + (sidCookie ? sidCookie[1].substring(0, 20) + '...' : 'NOT FOUND'));

                  const response = await fetch(url, {
                    method: 'GET',
                    headers: headers
                  });

                  log('Attempt ' + attempt + ' status: ' + response.status);

                  // HTTP 429 = rate-limited, stop retrying
                  if (response.status === 429) {
                    log('Rate-limited (429), aborting retries');
                    break;
                  }

                  // HTTP 202/204 = server queued/no-content, retry with backoff
                  if (response.status === 202 || response.status === 204) {
                    log('Server returned ' + response.status + ' (queued/load-shedding)');
                    continue; // retry
                  }

                  // HTTP 4xx/5xx = server error
                  if (response.status >= 400) {
                    try {
                      const errText = await response.text();
                      const ct = response.headers.get('content-type') || 'unknown';
                      log('Server error: ' + response.status + ', content-type: ' + ct + ', body: ' + errText.substring(0, 200));
                    } catch(e) {
                      log('Server error: ' + response.status);
                    }
                    break;
                  }

                  // Status 200-201: try to parse
                  const responseText = await response.text();
                  if (!responseText || responseText.length < 10) {
                    log('Empty body on status ' + response.status + ', retrying...');
                    continue;
                  }

                  let data;
                  try {
                    data = JSON.parse(responseText);
                  } catch (parseErr) {
                    log('JSON parse error: ' + parseErr.message);
                    break;
                  }

                  // --- Diagnostic: log response structure ---
                  const topKeys = data ? Object.keys(data).join(', ') : 'null';
                  log('Response keys: ' + topKeys + ' (len=' + responseText.length + ')');
                  if (data && data.data) {
                    const dataKeys = Object.keys(data.data).join(', ');
                    log('data.data keys: ' + dataKeys);
                    if (data.data.widgets) log('widgets count: ' + data.data.widgets.length);
                    if (data.data.cards) log('cards count: ' + data.data.cards.length);
                  }

                  // Explicit tree walk based on known Swiggy structure
                  // Explicit tree walk based on known Swiggy structure
                  const products = [];
                  const seen = new Set();
                  const cards = data?.data?.cards || [];

                  for (const cardWrapper of cards) {
                    const widget = cardWrapper?.card?.card;
                    if (!widget) continue;

                    const type = widget['@type'] || '';
                    
                    // Skip non-product widgets
                    if (type.includes('FilterSort') || type.includes('Header') || type.includes('Banner')) {
                      continue;
                    }

                    // Try all known product paths
                    const itemCards =
                      widget?.gridElements?.infoWithStyle?.itemCards ||
                      widget?.itemCards ||
                      widget?.carousel?.itemCards ||
                      [];

                    for (const item of itemCards) {
                      const info = item?.card?.info;
                      if (!info || !info.name) continue;

                      const priceRaw = info.price || info.sp || info.store_price || info.offer_price || 0;
                      const mrpRaw = info.defaultPrice || info.mrp || info.marked_price || priceRaw || 0;
                      
                      const price = priceRaw / 100;
                      const mrp = mrpRaw / 100;

                      if (price <= 0) continue;

                      const name = info.name || info.product_name || info.displayName;
                      const key = name + '|' + price;
                      
                      if (!seen.has(key)) {
                        seen.add(key);
                        const imgId = info.imageId || info.cloudinaryImageId || info.image_id;
                        products.push({
                          product_name: name,
                          price: price,
                          mrp: mrp,
                          image_url: imgId ? 'https://instamart-media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_512/' + imgId : '',
                          product_url: window.location.href,
                          in_stock: info.inStock !== false && info.in_stock !== false && info.available !== false,
                          weight: info.quantity || info.weight || '',
                          platform: 'Instamart'
                        });
                      }
                    }
                  }

                  // Add a debug log so you can see which widget types exist
                  log('Widget types found: ' + cards.map(c => c?.card?.card?.['@type']?.split('.').pop()).join(', '));

                  log('API parsed ' + products.length + ' products on attempt ' + attempt);

                  // Always post the result on 200, even if empty — don't retry
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'SEARCH_RESULTS',
                    platform: 'Instamart',
                    sessionId: window.__COMPAREX_SESSION_ID__ || null,
                    products: products,
                    success: true
                  }));
                  return; // Exit process 

                } catch (fetchErr) {
                  log('Fetch error on attempt ' + attempt + ': ' + fetchErr.message);
                  // Allow to retry next loop iteration
                }
              }

              // All retries exhausted
              log('All API attempts exhausted, giving up');
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SEARCH_RESULTS',
                platform: 'Instamart',
                sessionId: window.__COMPAREX_SESSION_ID__ || null,
                products: [],
                success: false,
                error: 'timeout'
              }));
            } catch (err) {
              log('FATAL API Error: ' + err.message);
            }
          })();
        `,
      },

    };
  }

  getSearchScript(platform, query, lat = 12.9716, lng = 77.5946) {
    const platformConfig = this.platforms[platform];
    if (!platformConfig) {
      return null;
    }
    return platformConfig.searchScript(query, lat, lng);
  }
}

export default new PlatformScraperService();
