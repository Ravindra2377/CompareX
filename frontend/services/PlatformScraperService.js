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
              
              const url = 'https://blinkit.com/v6/search/products?start=0&size=20&q=${encodeURIComponent(
                query
              )}&lat=${lat}&lon=${lng}';
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
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', message: '[Zepto] ' + msg}));
              } catch(e) {}
            };
            
            try {
              log('Starting search for: ${query}');
              
              const response = await fetch('https://api.zepto.co.in/api/v1/search', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'accept': 'application/json',
                  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                  'origin': 'https://www.zeptonow.com',
                  'referer': 'https://www.zeptonow.com/',
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
              
              log('Response status: ' + response.status);
              
              if (!response.ok) {
                const errorText = await response.text();
                log('Error response: ' + errorText.substring(0, 200));
                throw new Error('API returned ' + response.status);
              }
              
              const data = await response.json();
              log('Got data, results count: ' + (data.results?.length || 0));
              
              const products = (data.results || []).map(p => ({
                product_name: p.name,
                brand: p.brand || '',
                price: p.price || 0,
                mrp: p.original_price || p.price || 0,
                image_url: p.image || '',
                product_url: '',
                in_stock: p.in_stock !== false,
                weight: p.weight || '',
                platform: 'Zepto'
              }));
              
              log('Parsed products: ' + products.length);
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SEARCH_RESULTS',
                platform: 'Zepto',
                products: products,
                success: true
              }));
            } catch (error) {
              log('Error: ' + error.message);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SEARCH_RESULTS',
                platform: 'Zepto',
                error: error.message,
                success: false,
                products: []
              }));
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
              
              const url = \`https://www.bigbasket.com/listing-svc/v2/products?type=pc&iss=false&page=1&tab_type=["all"]&sorted_on=relevance&q=\${encodeURIComponent("${query}")}\`;
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
        searchScript: (query, lat, lng) => `
          (async function() {
            const log = (msg) => {
              try {
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', message: '[Instamart] ' + msg}));
              } catch(e) {}
            };
            
            try {
              log('Starting search for: ${query}');
              
              const url = \`https://www.swiggy.com/dapi/instamart/search?lat=\${${lat}}&lng=\${${lng}}&str=\${encodeURIComponent("${query}")}&submitAction=ENTER\`;
              log('URL: ' + url);
              
              const response = await fetch(url, {
                headers: {
                  'accept': 'application/json',
                  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                  'referer': 'https://www.swiggy.com/instamart',
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
              
              const widgets = data.data?.widgets || [];
              log('Got data, widgets count: ' + widgets.length);
              
              let allProducts = [];
              for (const widget of widgets) {
                const nodes = widget.data?.nodes || [];
                if (nodes.length > 0) {
                  log('Found widget with ' + nodes.length + ' nodes');
                  
                  for (const node of nodes) {
                    const itemData = node.data || node;
                    if (itemData.name || itemData.display_name) {
                      allProducts.push({
                        product_name: itemData.display_name || itemData.name,
                        brand: itemData.brand_name || '',
                        price: itemData.price || 0,
                        mrp: itemData.mrp || itemData.price || 0,
                        image_url: itemData.image_id ? \`https://media-assets.swiggy.com/swiggy/image/upload/\${itemData.image_id}\` : '',
                        product_url: '',
                        in_stock: itemData.in_stock !== false,
                        weight: itemData.unit || '',
                        platform: 'Instamart'
                      });
                    }
                  }
                }
              }
              
              log('Parsed products: ' + allProducts.length);
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SEARCH_RESULTS',
                platform: 'Instamart',
                products: allProducts,
                success: true
              }));
            } catch (error) {
              log('Error: ' + error.message);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SEARCH_RESULTS',
                platform: 'Instamart',
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
