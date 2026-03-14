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
