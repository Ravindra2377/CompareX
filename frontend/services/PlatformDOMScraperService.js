// Alternative scraper using DOM parsing instead of API calls
// This is more reliable as it uses the actual search pages users see

class PlatformDOMScraperService {
  constructor() {
    this.platforms = {
      Blinkit: {
        searchUrl: (query) =>
          `https://blinkit.com/s/?q=${encodeURIComponent(query)}`,
        parseScript: () => `
          (function() {
            const log = (msg) => {
              try {
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', message: '[Blinkit-DOM] ' + msg}));
              } catch(e) {}
            };
            
            try {
              log('Parsing search results page...');
              
              setTimeout(() => {


                log('Starting product extraction after 5s wait...');
                const products = [];
                
                // Try multiple selector strategies
                let productCards = document.querySelectorAll('[class*="Product"][class*="Card"], [class*="product-card"], div[class*="ProductCard"]');
                if (productCards.length === 0) {
                  productCards = document.querySelectorAll('a[href*="/p/"], a[href*="/pn/"], a[href*="/product/"]');
                }
                if (productCards.length === 0) {
                  // Blinkit specific: Look for divs with structured product info
                  log('DEBUG: Trying Blinkit-specific fallback selector...');
                  const allDivs = Array.from(document.querySelectorAll('div'));
                  log('DEBUG: Total divs in document: ' + allDivs.length);
                  
                  // Try progressively more lenient filters
                  productCards = allDivs.filter(div => {
                    const text = div.textContent || '';
                    const hasNumbers = /[0-9]+/.test(text);
                    const hasAddButton = /ADD/i.test(text);
                    const textLen = text.length;
                    const hasMins = /[0-9]+\s*mins/i.test(text);
                    const hasOff = /[0-9]+%\s*OFF/i.test(text);
                    const hasChildren = div.children.length >= 3;
                    // Needs: ADD button, time, discount pattern, size 40-200, multiple children
                    return hasNumbers && hasAddButton && hasMins && hasOff && textLen >= 40 && textLen <= 200 && hasChildren;
                  });
                  log('DEBUG: Blinkit fallback found ' + productCards.length + ' cards');
                  
                  // If still nothing, try even more lenient
                  if (productCards.length === 0) {
                    productCards = allDivs.filter(div => {
                      const text = div.textContent || '';
                      const hasAddButton = /ADD/i.test(text);
                      const textLen = text.length;
                      const hasMins = /mins/i.test(text);
                      const hasChildren = div.children.length >= 2;
                      // Just needs: ADD, "mins", reasonable size
                      return hasAddButton && hasMins && textLen >= 30 && textLen <= 250 && hasChildren;
                    });
                    log('DEBUG: Lenient Blinkit filter found ' + productCards.length + ' cards');
                  }
                }
                
                log('Found ' + productCards.length + ' product cards');
                
                // Debug: If no cards found, log page structure
                if (productCards.length === 0) {
                  log('DEBUG: No cards found. Page title: ' + document.title);
                  log('DEBUG: Body classes: ' + document.body.className.substring(0, 100));
                  const allDivsCount = document.querySelectorAll('div').length;
                  const allLinksCount = document.querySelectorAll('a').length;
                  log('DEBUG: Total divs: ' + allDivsCount + ', Total links: ' + allLinksCount);
                  const bodyText = document.body.textContent?.substring(0, 200);
                  log('DEBUG: Body text sample: ' + bodyText);
                }
                
                // Debug first card
                if (productCards.length > 0) {
                  const firstCard = productCards[0];
                  log('First card tag: ' + firstCard.tagName + ', classes: ' + firstCard.className.substring(0, 50));
                  const allText = firstCard.textContent;
                  log('First card FULL TEXT: ' + allText);
                  log('First card HTML structure: ' + firstCard.innerHTML.substring(0, 200));
                }
                
                productCards.forEach((card, index) => {
                  try {
                    // Try multiple selectors for name - be aggressive
                    let name = card.querySelector('div[class*="ProductTitle"], div[class*="Name"]')?.textContent?.trim();
                    if (!name) name = card.querySelector('h3, h4, h2, .text-base, [class*="title"]')?.textContent?.trim();
                    if (!name) name = card.getAttribute('title') || card.getAttribute('aria-label');
                    if (!name) {
                      // Try to extract product name from text nodes
                      // Filter out: discount badges, delivery time, buttons, numbers-only, prices
                      const textNodes = Array.from(card.querySelectorAll('*'))
                        .map(el => el.textContent?.trim())
                        .filter(t => {
                          if (!t || t.length < 5 || t.length > 150) return false;
                          if (/^\d+$/.test(t)) return false; // Skip numbers-only
                          // Skip if it's JUST the badge/time/button (not combined text)
                          if (/^[0-9]+%\s*OFF$/i.test(t)) return false; 
                          if (/^[0-9]+\s*mins$/i.test(t)) return false; 
                          if (/^ADD$/i.test(t)) return false;
                          if (/^₹\s*[0-9]+$/i.test(t)) return false;
                          return /[a-zA-Z]/.test(t); // Must have letters
                        })
                        .map(t => {
                          // Clean up the text: remove mins, price, ADD from combined strings
                          let cleaned = t;
                          // Remove delivery time pattern ANYWHERE in string
                          cleaned = cleaned.replace(/\d+\s*mins/gi, '');
                          // Remove quantity pattern ANYWHERE
                          cleaned = cleaned.replace(/\d+\s*pcs/gi, '');
                          // Remove discount badge
                          cleaned = cleaned.replace(/\d+%\s*OFF/gi, '');
                          // Remove price (₹ followed by numbers) and everything after
                          cleaned = cleaned.replace(/₹\s*\d+.*$/g, '');
                          // Remove ADD button text
                          cleaned = cleaned.replace(/ADD/gi, '');
                          // Trim and return
                          return cleaned.trim();
                        })
                        .filter(t => t.length > 10 && t.length < 100); // Re-filter after cleaning
                      
                      // Pick the cleanest text (no junk like mins, pcs, prices)
                      // Score each option: lower score = cleaner
                      const scoredTexts = textNodes.map(t => ({
                        text: t,
                        score: 
                          (t.match(/\d+/g) || []).length + // penalize numbers
                          (t.match(/mins/gi) || []).length * 10 + // heavily penalize mins
                          (t.match(/pcs/gi) || []).length * 10 + // heavily penalize pcs
                          (t.match(/₹/g) || []).length * 10 // heavily penalize rupee
                      })).sort((a, b) => a.score - b.score); // sort by cleanest (lowest score)
                      
                      name = scoredTexts.length > 0 ? scoredTexts[0].text : textNodes[0];
                      if (index === 0) {
                        log('[Blinkit] Cleaned options: ' + textNodes.slice(0, 3).join(' | '));
                        log('[Blinkit] Selected: ' + name);
                      }
                    }
                    
                    // Try multiple selectors for price  
                    let priceText = '';
                    let priceEl = card.querySelector('div[class*="Price"]');
                    if (!priceEl) priceEl = card.querySelector('span[class*="price"]');
                    if (priceEl) {
                      priceText = priceEl.textContent;
                    } else {
                      // Fallback: extract price from card text
                      const cardText = card.textContent || '';
                      
                      // First try: Find numbers immediately after rupee symbol
                      const rupeeMatch = cardText.match(/₹\s*([0-9]+)/g);
                      if (rupeeMatch && rupeeMatch.length > 0) {
                        // Get all prices with ₹ symbol, pick smallest realistic one
                        const prices = rupeeMatch.map(m => parseInt(m.replace(/₹\s*/g, ''))).filter(p => p >= 5 && p <= 9999);
                        if (prices.length > 0) {
                          priceText = Math.min(...prices).toString();
                        }
                      }
                      
                      // Fallback: Find numbers NOT followed by units
                      if (!priceText) {
                        const allNumbers = cardText.match(/[0-9]+/g);
                        if (allNumbers) {
                          for (let i = 0; i < allNumbers.length; i++) {
                            const num = allNumbers[i];
                            const val = parseInt(num);
                            
                            // Skip if not in price range
                            if (val < 5 || val > 9999) continue;
                            
                            // Check context around this number to skip measurements
                            const numIndex = cardText.indexOf(num);
                            const contextAfter = cardText.substring(numIndex + num.length, numIndex + num.length + 10).toLowerCase();
                            
                            // Skip if followed by measurement units
                            if (/^\s*(ml|g|kg|l|pcs|pack|piece|mins?|%)/.test(contextAfter)) {
                              continue;
                            }
                            
                            priceText = num;
                            break;
                          }
                        }
                      }
                    }
                    
                    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : 0;
                    const imgEl = card.querySelector('img');
                    const image = imgEl ? imgEl.src : '';
                    
                    if (index === 0) {
                      log('First product - name: ' + (name || 'NOT FOUND') + ', price: ' + price);
                    }
                    
                    if (name && name.length > 3 && price > 0) {
                      products.push({
                        product_name: name,
                        brand: '',
                        price: price,
                        mrp: price,
                        image_url: image,
                        product_url: card.href || card.querySelector('a')?.href || '',
                        in_stock: true,
                        weight: card.querySelector('div[class*="weight"], div[class*="quantity"]')?.textContent?.trim() || '',
                        platform: 'Blinkit'
                      });
                    }
                  } catch(e) {
                    if (index === 0) {
                      log('Error parsing first product: ' + e.message);
                    }
                  }
                });

                if (products.length === 0) {
                  try {
                    const state =
                      (window.grofers && window.grofers.PRELOADED_STATE) ||
                      window.__PRELOADED_STATE__ ||
                      null;
                    if (state && typeof state === 'object') {
                      const seen = new Set();

                      const toPrice = (raw) => {
                        const n = typeof raw === 'string' ? parseFloat(raw) : raw;
                        if (!Number.isFinite(n) || n <= 0) return 0;
                        if (n > 9999 && n <= 999999) return Math.round(n / 100);
                        if (n > 0 && n <= 9999) return Math.round(n);
                        return 0;
                      };

                      const tryPush = (obj) => {
                        const name = obj?.name || obj?.display_name || obj?.displayName || obj?.product_name || obj?.title;
                        const rawPrice = obj?.price ?? obj?.finalPrice ?? obj?.final_price ?? obj?.offerPrice ?? obj?.offer_price ?? obj?.selling_price ?? obj?.sellingPrice ?? obj?.mrp;
                        if (typeof name !== 'string' || name.trim().length < 3) return;
                        const price = toPrice(rawPrice);
                        if (!price) return;
                        const key = name.trim().toLowerCase() + '|' + price;
                        if (seen.has(key)) return;
                        seen.add(key);
                        products.push({
                          product_name: name.trim(),
                          brand: '',
                          price,
                          mrp: price,
                          image_url: obj?.image_url || obj?.imageUrl || obj?.image || '',
                          product_url: obj?.deep_link || obj?.url || '',
                          in_stock: true,
                          weight: obj?.quantity || obj?.unit || '',
                          platform: 'Blinkit'
                        });
                      };

                      const walk = (node, depth) => {
                        if (!node || depth > 9) return;
                        if (Array.isArray(node)) {
                          node.forEach((x) => walk(x, depth + 1));
                          return;
                        }
                        if (typeof node !== 'object') return;
                        const hasName = ('name' in node) || ('display_name' in node) || ('displayName' in node) || ('title' in node);
                        const hasPrice = ('price' in node) || ('mrp' in node) || ('finalPrice' in node) || ('offerPrice' in node) || ('selling_price' in node);
                        if (hasName && hasPrice) tryPush(node);
                        Object.keys(node).forEach((k) => walk(node[k], depth + 1));
                      };

                      walk(state, 0);
                      log('Blinkit PRELOADED_STATE fallback parsed ' + products.length + ' products');
                    } else {
                      log('Blinkit PRELOADED_STATE fallback: global state missing');
                    }
                  } catch (e) {
                    log('Blinkit PRELOADED_STATE fallback failed: ' + e.message);
                  }
                }
                
                log('Parsed ' + products.length + ' products');
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'SEARCH_RESULTS',
                  platform: 'Blinkit',
                  sessionId: window.__COMPAREX_SESSION_ID__ || null,
                  products: products,
                  success: true
                }));
              }, 5000); // Wait 5s for Blinkit's React app to render
            } catch (error) {
              log('Error: ' + error.message);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SEARCH_RESULTS',
                platform: 'Blinkit',
                sessionId: window.__COMPAREX_SESSION_ID__ || null,
                error: error.message,
                success: false,
                products: []
              }));
            }
          })();
        `,
      },

      BigBasket: {
        searchUrl: (query) =>
          `https://www.bigbasket.com/ps/?q=${encodeURIComponent(query)}`,
        parseScript: () => `
          (function() {
            const log = (msg) => {
              try {
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', message: '[BigBasket-DOM] ' + msg}));
              } catch(e) {}
            };
            
            try {
              log('Parsing search results page...');
              
              setTimeout(() => {
                const products = [];
                let productCards = document.querySelectorAll('[data-test-id="product-pod"], .product-card, .SKUDeck___StyledDiv-sc-1e5d9gk-0, li[class*="Product"]');

                if (productCards.length === 0) {
                  const candidateLinks = Array.from(document.querySelectorAll('a[href*="/pd/"], a[href*="/product/"]'));
                  productCards = candidateLinks.filter((a) => {
                    const text = a.textContent || '';
                    return text.length > 20 && text.length < 500 && /₹\s*\d+/.test(text);
                  });
                  log('Fallback link-based cards: ' + productCards.length);
                }
                
                log('Found ' + productCards.length + ' product cards');
                
                // Debug first card
                if (productCards.length > 0) {
                  const firstCard = productCards[0];
                  log('First card classes: ' + firstCard.className);
                  log('First card has h3: ' + !!firstCard.querySelector('h3'));
                  log('First card has img: ' + !!firstCard.querySelector('img'));
                  const allText = firstCard.textContent?.substring(0, 100);
                  log('First card text: ' + allText);
                }
                
                productCards.forEach((card, index) => {
                  try {
                    // Try multiple strategies to find name
                    let name = card.querySelector('h3')?.textContent?.trim();
                    if (!name) name = card.querySelector('[qa="product-name"]')?.textContent?.trim();
                    if (!name) name = card.querySelector('.text-base')?.textContent?.trim();
                    if (!name) name = card.querySelector('a[href*="/pd/"]')?.textContent?.trim();
                    
                    // Try multiple strategies to find price
                    let priceText = '';
                    let priceEl = card.querySelector('[qa="selling-price"]');
                    if (!priceEl) priceEl = card.querySelector('.Pricing___StyledLabel-sc-pldi2d-1');
                    if (!priceEl) priceEl = card.querySelector('[class*="Price"]');
                    if (!priceEl) priceEl = card.querySelector('span[class*="price"]');
                    
                    if (priceEl) {
                      priceText = priceEl.textContent;
                      if (index === 0) {
                        log('DEBUG: Found priceEl with text: "' + priceText + '"');
                      }
                    } else {
                      // Fallback: extract price from card text using regex
                      const cardText = card.textContent || '';
                      const allNumbers = cardText.match(/[0-9]+/g);
                      if (allNumbers) {
                        // Skip discount %, delivery time, quantities - find first number >= 5
                        for (let num of allNumbers) {
                          const val = parseInt(num);
                          if (val >= 5 && val <= 9999) {
                            priceText = num;
                            break;
                          }
                        }
                      }
                      if (index === 0) {
                        log('DEBUG: No priceEl, cardText: "' + cardText + '"');
                        log('DEBUG: All numbers found: ' + (allNumbers ? allNumbers.join(',') : 'NONE') + ', Selected: ' + priceText);
                      }
                    }
                    
                    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : 0;
                    const imgEl = card.querySelector('img');
                    const image = imgEl ? imgEl.src : '';
                    
                    if (index === 0) {
                      log('First product - name: ' + (name || 'NOT FOUND') + ', priceText: "' + priceText + '", price: ' + price);
                    }
                    
                    if (name && price > 0) {
                      products.push({
                        product_name: name,
                        brand: card.querySelector('[qa="brand"]')?.textContent?.trim() || '',
                        price: price,
                        mrp: price,
                        image_url: image,
                        product_url: card.querySelector('a')?.href || '',
                        in_stock: true,
                        weight: card.querySelector('[qa="size"]')?.textContent?.trim() || '',
                        platform: 'BigBasket'
                      });
                    }
                  } catch(e) {
                    if (index === 0) {
                      log('Error parsing first product: ' + e.message);
                    }
                  }
                });
                
                log('Parsed ' + products.length + ' products');
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'SEARCH_RESULTS',
                  platform: 'BigBasket',
                  sessionId: window.__COMPAREX_SESSION_ID__ || null,
                  products: products,
                  success: true
                }));
              }, 5000);
            } catch (error) {
              log('Error: ' + error.message);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SEARCH_RESULTS',
                platform: 'BigBasket',
                sessionId: window.__COMPAREX_SESSION_ID__ || null,
                error: error.message,
                success: false,
                products: []
              }));
            }
          })();
        `,
      },

      Instamart: {
        searchUrl: (query, lat = 12.9716, lng = 77.5946) =>
          `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(query)}&lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
        parseScript: (tokens) => `
          (function() {
            // ---- bridge helpers (bridge may be deleted by Swiggy WAF, use cached ref) ----
            var __send = window.__rnMsg || (window.ReactNativeWebView && window.ReactNativeWebView.postMessage.bind(window.ReactNativeWebView));
            if (!__send && window.ReactNativeWebView) __send = window.ReactNativeWebView.postMessage.bind(window.ReactNativeWebView);

            function log(msg) {
              try { if (__send) __send(JSON.stringify({type:'LOG', message:'[Instamart-API] '+msg})); } catch(ignored){}
            }

            function sendResults(prods, err) {
              try {
                var payload = JSON.stringify({
                  type:'SEARCH_RESULTS',
                  platform:'Instamart',
                  sessionId: window.__COMPAREX_SESSION_ID__ || null,
                  products: prods || [],
                  success: !!(prods && prods.length > 0),
                  error: err || null
                });
                if (__send) __send(payload);
              } catch(ignored){}
            }

            try {
              log('Script executing. readyState=' + document.readyState + ' url=' + location.href);

              // ---- helpers ----
              function toPrice(raw) {
                var n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
                if (!isFinite(n) || n <= 0) return 0;
                if (n > 9999 && n <= 999999) return Math.round(n / 100);
                if (n > 0 && n <= 9999) return Math.round(n);
                return 0;
              }

              // ---- parseAndSend: walk a JS object tree for products ----
              function parseAndSend(result) {
                var products = [];
                var seen = Object.create(null);

                function getString(obj) {
                  var keys = ['name','display_name','displayName','product_name','title'];
                  for (var i=0;i<keys.length;i++) { if (obj && typeof obj[keys[i]]==='string' && obj[keys[i]].length>2) return obj[keys[i]]; }
                  return '';
                }
                function getRawPrice(obj) {
                  var keys = ['price','finalPrice','final_price','offerPrice','offer_price','selling_price','sellingPrice','mrp'];
                  for (var i=0;i<keys.length;i++) { if (obj && obj[keys[i]] != null) return obj[keys[i]]; }
                  return null;
                }

                function tryAdd(obj) {
                  var name = getString(obj);
                  if (!name || name.length < 3) return;
                  var price = toPrice(getRawPrice(obj));
                  if (!price) return;
                  var key = name.toLowerCase()+'|'+price;
                  if (seen[key]) return;
                  seen[key] = 1;
                  products.push({
                    product_name: name.trim(),
                    price: price,
                    mrp: price,
                    image_url: obj.image_url || obj.imageUrl || obj.image || '',
                    product_url: obj.deep_link || obj.url || '',
                    in_stock: true,
                    weight: obj.quantity || obj.unit || '',
                    platform: 'Instamart'
                  });
                }

                function walk(node, depth) {
                  if (!node || depth > 10) return;
                  if (Array.isArray(node)) {
                    for (var i=0;i<node.length;i++) walk(node[i], depth+1);
                    return;
                  }
                  if (typeof node !== 'object') return;
                  var hasName = ('name' in node)||('display_name' in node)||('displayName' in node)||('title' in node);
                  var hasPrice = ('price' in node)||('mrp' in node)||('finalPrice' in node)||('offerPrice' in node)||('selling_price' in node);
                  if (hasName && hasPrice) tryAdd(node);
                  var keys = Object.keys(node);
                  for (var i=0;i<keys.length;i++) {
                    var v = node[keys[i]];
                    if (typeof v === 'string' && v.length > 30000) continue;
                    walk(v, depth+1);
                  }
                }

                walk(result, 0);
                log('parseAndSend found ' + products.length + ' products');
                if (products.length === 0) {
                  log('Top-level keys: ' + JSON.stringify(Object.keys(result || {}).slice(0, 10)));
                }
                sendResults(products, products.length === 0 ? 'parseAndSend: 0 products' : null);
              }

              // ---- runExtraction: try JSON state first, then DOM ----
              function runExtraction(attempt) {
                log('Extraction attempt ' + attempt + ', readyState=' + document.readyState);

                // Strategy 1: hydrated globals
                try {
                  var gs = window.__PRELOADED_STATE__ || window.INITIAL_STATE || null;
                  if (gs && typeof gs === 'object') {
                    log('Found global hydrated state');
                    parseAndSend(gs);
                    return;
                  }
                } catch(e) { log('Global state error: '+e.message); }

                // Strategy 2: script#__NEXT_DATA__
                try {
                  var el = document.querySelector('script#__NEXT_DATA__');
                  var txt = el ? el.textContent : '';
                  if (txt && txt.trim().charAt(0) === '{') {
                    var nd = JSON.parse(txt);
                    var initialData = (nd && nd.props && nd.props.pageProps && (nd.props.pageProps.initialState || nd.props.pageProps.initialData)) || nd;
                    log('Found __NEXT_DATA__, parsing...');
                    parseAndSend(initialData);
                    return;
                  }
                } catch(e) { log('__NEXT_DATA__ parse error: '+e.message); }

                // Strategy 3: scan raw HTML for state assignment
                try {
                  var html = document.documentElement.innerHTML;
                  function extractObjectAfter(src, marker) {
                    var mi = src.indexOf(marker);
                    if (mi < 0) return null;
                    var start = src.indexOf('{', mi);
                    if (start < 0) return null;
                    var depth = 0, inStr = false, quote = '', esc = false;
                    for (var i=start;i<src.length;i++) {
                      var ch = src[i];
                      if (inStr) {
                        if (esc) { esc = false; }
                        else if (ch === '\\\\') { esc = true; }
                        else if (ch === quote) { inStr = false; quote = ''; }
                        continue;
                      }
                      if (ch === '"' || ch === "'") { inStr = true; quote = ch; continue; }
                      if (ch === '{') depth++;
                      if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i+1); }
                    }
                    return null;
                  }
                  var jsonStr = extractObjectAfter(html, 'window.__PRELOADED_STATE__') || extractObjectAfter(html, 'window.INITIAL_STATE');
                  if (jsonStr) {
                    log('Found embedded JSON state len=' + jsonStr.length);
                    parseAndSend(JSON.parse(jsonStr));
                    return;
                  }
                } catch(e) { log('HTML state scan error: '+e.message); }

                // Strategy 4: display_name regex on raw HTML
                try {
                  var html2 = document.documentElement.innerHTML;
                  var products4 = [];
                  var seen4 = Object.create(null);
                  var re = /"display_name"\\s*:\\s*"([^"\\\\]{3,140}(?:\\\\.[^"\\\\]{0,40})*)"[\\s\\S]{0,300}?"(?:price|final_price|offer_price|selling_price|mrp)"\\s*:\\s*([0-9]{1,7})/g;
                  var m;
                  while ((m = re.exec(html2)) !== null) {
                    var rawName = m[1].replace(/\\\\u[0-9a-fA-F]{4}/g,' ').replace(/\\\\"/g,' ').replace(/\\s+/g,' ').trim();
                    var price4 = parseInt(m[2], 10);
                    if (!rawName || rawName.length < 3) continue;
                    if (!isFinite(price4) || price4 <= 0) continue;
                    if (price4 > 9999 && price4 <= 999999) price4 = Math.round(price4/100);
                    if (price4 < 5 || price4 > 9999) continue;
                    var key4 = rawName.toLowerCase()+'|'+price4;
                    if (seen4[key4]) continue;
                    seen4[key4] = 1;
                    products4.push({ product_name:rawName, price:price4, mrp:price4, platform:'Instamart', in_stock:true });
                    if (products4.length >= 80) break;
                  }
                  if (products4.length > 0) {
                    log('HTML regex found ' + products4.length + ' products');
                    sendResults(products4);
                    return;
                  }
                  log('HTML regex: 0 products');
                } catch(e) { log('HTML regex error: '+e.message); }

                // Strategy 5: DOM elements
                try {
                  var nodes = Array.from(document.querySelectorAll(
                    'a[href*="/instamart/item/"], [data-testid="item-card"], [data-testid*="product"], [class*="ProductCard"], [class*="productCard"], [class*="ItemCard"]'
                  ));
                  log('DOM strategy: ' + nodes.length + ' candidate nodes');
                  var products5 = [];
                  var seen5 = Object.create(null);
                  nodes.forEach(function(node) {
                    var rawText = (node.innerText||node.textContent||'').replace(/\\s+/g,' ').trim();
                    if (!rawText || rawText.length < 8) return;
                    var heading = node.querySelector('h2,h3,h4,[class*="name"],[class*="title"]');
                    var name = heading ? heading.textContent.trim() : '';
                    if (!name) {
                      var lines = rawText.split(' ');
                      name = lines.find(function(l){
                        return l.length>=4 && l.length<=120 && /[a-zA-Z]/.test(l) && !/^\\d+\\s*mins?$/i.test(l) && !/^add$/i.test(l) && !/₹/.test(l);
                      }) || '';
                    }
                    var rupeeM = rawText.match(/₹\\s*([0-9]+(?:\\.[0-9]+)?)/);
                    var price5 = rupeeM ? Math.round(parseFloat(rupeeM[1])) : 0;
                    if (!name || !price5) return;
                    var key5 = name.toLowerCase()+'|'+price5;
                    if (seen5[key5]) return;
                    seen5[key5] = 1;
                    products5.push({ product_name:name, price:price5, mrp:price5, platform:'Instamart', in_stock:!rawText.toLowerCase().includes('out of stock') });
                  });
                  if (products5.length > 0) {
                    log('DOM strategy found ' + products5.length + ' products');
                    sendResults(products5);
                    return;
                  }
                  log('DOM strategy: 0 products');
                } catch(e) { log('DOM strategy error: '+e.message); }

                // All failed on attempt 1? Retry once after 2s
                if (attempt <= 1) {
                  log('All strategies failed, retrying in 2s...');
                  setTimeout(function(){ runExtraction(attempt+1); }, 2000);
                  return;
                }

                sendResults([], 'All extraction strategies exhausted (attempt ' + attempt + ')');
              }

              // Start extraction after 3s to let Swiggy SSR hydrate
              setTimeout(function(){ runExtraction(1); }, 3000);

            } catch(e) {
              try {
                var errSend = window.__rnMsg || (window.ReactNativeWebView && window.ReactNativeWebView.postMessage.bind(window.ReactNativeWebView));
                if (errSend) {
                  errSend(JSON.stringify({type:'LOG', message:'[Instamart-API] Fatal error: '+e.message}));
                  errSend(JSON.stringify({type:'SEARCH_RESULTS', platform:'Instamart', sessionId:window.__COMPAREX_SESSION_ID__||null, products:[], success:false, error:'Fatal: '+e.message}));
                }
              } catch(ignored){}
            }
          })();
        `,
      },

      Zepto: {
        searchUrl: (query) =>
          `https://www.zepto.com/search?query=${encodeURIComponent(query)}`,
        parseScript: () => `
          (function() {
            // Immediate execution check - THIS SHOULD APPEAR FIRST
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'LOG', 
              message: '[Zepto-DOM] ===== SCRIPT EXECUTING ====='
            }));
            
            const log = (msg) => {
              try {
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', message: '[Zepto-DOM] ' + msg}));
              } catch(e) {
                console.log('[Zepto-ERROR] ' + e.toString());
              }
            };
            
            try {
              log('Starting Zepto parser...');
              log('URL: ' + window.location.href);
              log('Title: ' + document.title);
              
              setTimeout(() => {
                log('Extracting products after 6s wait...');
                log('ReadyState: ' + document.readyState);
                log('Body children count: ' + document.body.children.length);
                
                // Debug: Check what's on the page
                const allLinks = document.querySelectorAll('a');
                const allDivs = document.querySelectorAll('div');
                const allImages = document.querySelectorAll('img');
                log('DEBUG: Total links=' + allLinks.length + ', divs=' + allDivs.length + ', images=' + allImages.length);
                
                // Sample some links
                const linkSample = Array.from(allLinks).slice(0, 5).map(a => a.href).join(' | ');
                log('DEBUG: Link sample: ' + linkSample);
                
                const products = [];
                
                // Try simple selectors first
                let productCards = document.querySelectorAll('a[href*="/pn/"], a[href*="/product/"]');
                log('Found ' + productCards.length + ' product links');
                
                if (productCards.length === 0) {  
                  productCards = document.querySelectorAll('[class*="ProductCard"], [class*="product"]');
                  log('Found ' + productCards.length + ' product class elements');
                }
                
                // Try looking for links with images inside them
                if (productCards.length === 0) {
                  log('Trying: links with images inside');
                  const linksWithImg = Array.from(allLinks).filter(link => link.querySelector('img'));
                  log('Found ' + linksWithImg.length + ' links with images');
                  if (linksWithImg.length > 0) {
                    productCards = linksWithImg.filter(link => {
                      const text = link.textContent || '';
                      const hasRupee = /₹/.test(text);
                      const hasNumbers = /\d+/.test(text);
                      return hasRupee && hasNumbers && text.length > 10 && text.length < 300;
                    });
                    log('Filtered to ' + productCards.length + ' links that look like products (has ₹, text 10-300 chars)');
                  }
                }
                
                if (productCards.length === 0) {
                  log('No cards found - trying last resort filter');
                  const all = Array.from(allDivs);
                  productCards = all.filter(el => {
                    const hasImg = el.querySelector('img');
                    const hasNumbers = /[0-9]+/.test(el.textContent || '');
                    const textLen = (el.textContent || '').length;
                    return hasImg && hasNumbers && textLen > 20 && textLen < 400;
                  });
                  log('Last resort found ' + productCards.length + ' cards');
                }
                
                log('Processing ' + productCards.length + ' cards');
                
                productCards.forEach((card, index) => {
                  try {
                    // Get name - try heading elements first (no optional chaining)
                    let name = '';
                    const heading = card.querySelector('h4, h3, h2');
                    if (heading && heading.textContent) {
                      name = heading.textContent.trim();
                    }
                    
                    // If no heading, get longest text that looks like a product name
                    if (!name || name.length < 5) {
                      const textEls = Array.from(card.querySelectorAll('div, p, span'));
                      const allText = [];
                      for (let i = 0; i < textEls.length; i++) {
                        const text = textEls[i].textContent;
                        if (!text) continue;
                        const trimmed = text.trim();
                        if (trimmed.length < 10 || trimmed.length > 100) continue;
                        // Filter out: just numbers, prices, buttons, ratings
                        if (/^[\\u20b9\\d\\s,.%]+$/.test(trimmed)) continue;
                        if (/ADD/i.test(trimmed) && trimmed.length < 20) continue;
                        if (/^OFF$/i.test(trimmed)) continue;
                        if (/^\\d+\\.\\d+\\(/.test(trimmed)) continue;
                        if (!/[a-zA-Z]/.test(trimmed)) continue;
                        allText.push(trimmed);
                      }
                      
                      // Clean and pick the best match
                      if (allText.length > 0) {
                        name = allText[0]
                          .replace(/^ADD/gi, '') // Remove ADD prefix
                          .replace(/ADD$/gi, '') // Remove ADD suffix  
                          .replace(/\\u20b9\\d+/g, '') // Remove all prices
                          .replace(/\\d+\\.\\d+\\([^)]*\\)?/g, '') // Remove ratings "4.7(123)" or "4.7("
                          .replace(/\\d+\\.\\d+k\\)?/g, '') // Remove ratings "74.4k" or "74.4k)"
                          .replace(/\\([^)]*\\)/g, '') // Remove any remaining parentheses content
                          .replace(/\\d+\\s*pack/gi, '') // Remove pack info
                          .replace(/OFF/gi, '') // Remove OFF text
                          .replace(/\\s+/g, ' ') // Normalize spaces
                          .trim();
                      }
                    }
                    
                    const cardText = card.textContent || '';
                    
                    // Try to find price with rupee symbol first
                    let price;
                    const rupeeMatch = cardText.match(/\\u20b9\\s*(\\d+)/g);
                    if (rupeeMatch && rupeeMatch.length > 0) {
                      const prices = rupeeMatch.map(m => parseInt(m.replace(/\\u20b9\\s*/g, ''))).filter(p => p >= 5 && p <= 9999);
                      if (prices.length > 0) {
                        price = Math.min(...prices).toString();
                      }
                    }
                    
                    // Fallback: Find numbers NOT followed by units
                    if (!price) {
                      const numbers = cardText.match(/\\d+/g) || [];
                      for (let i = 0; i < numbers.length; i++) {
                        const num = numbers[i];
                        const val = parseInt(num);
                        if (val < 5 || val > 9999) continue;
                        
                        const numIndex = cardText.indexOf(num);
                        const contextAfter = cardText.substring(numIndex + num.length, numIndex + num.length + 10).toLowerCase();
                        
                        if (!/\\s*(ml|g|kg|l|pcs|pack|mins?)/.test(contextAfter)) {
                          price = num;
                          break;
                        }
                      }
                    }
                    
                    const imgEl = card.querySelector('img');
                    
                    if (index === 0) {
                      log('First product: ' + name.substring(0, 50) + ', price: ' + price);
                    }
                    
                    if (name && price && parseInt(price) > 0) {
                      const linkEl = card.querySelector('a');
                      const productUrl = card.href || (linkEl ? linkEl.href : '') || '';
                      
                      products.push({
                        product_name: name.substring(0, 100),
                        brand: '',
                        price: parseInt(price),
                        mrp: parseInt(price),
                        image_url: imgEl ? imgEl.src : '',
                        product_url: productUrl,
                        in_stock: true,
                        weight: '',
                        platform: 'Zepto'
                      });
                    }
                  } catch(e) {
                    log('Error on card ' + index + ': ' + e.message);
                  }
                });

                if (products.length === 0) {
                  try {
                    const nextDataEl = document.querySelector('script#__NEXT_DATA__');
                    const nextDataText = nextDataEl ? nextDataEl.textContent : '';
                    if (nextDataText && nextDataText.trim().startsWith('{')) {
                      const nextData = JSON.parse(nextDataText);
                      const seen = new Set();

                      const toPrice = (raw) => {
                        const n = typeof raw === 'string' ? parseFloat(raw) : raw;
                        if (!Number.isFinite(n) || n <= 0) return 0;
                        if (n > 9999 && n <= 999999) return Math.round(n / 100);
                        if (n > 0 && n <= 9999) return Math.round(n);
                        return 0;
                      };

                      const tryPush = (obj) => {
                        const name = obj?.name || obj?.display_name || obj?.displayName || obj?.product_name || obj?.title;
                        const rawPrice = obj?.price ?? obj?.finalPrice ?? obj?.final_price ?? obj?.offerPrice ?? obj?.offer_price ?? obj?.selling_price ?? obj?.sellingPrice ?? obj?.mrp;
                        if (typeof name !== 'string' || name.trim().length < 3) return;
                        const price = toPrice(rawPrice);
                        if (!price) return;
                        const key = name.trim().toLowerCase() + '|' + price;
                        if (seen.has(key)) return;
                        seen.add(key);
                        products.push({
                          product_name: name.trim(),
                          brand: '',
                          price,
                          mrp: price,
                          image_url: obj?.image_url || obj?.imageUrl || obj?.image || '',
                          product_url: obj?.deep_link || obj?.url || '',
                          in_stock: true,
                          weight: obj?.quantity || obj?.unit || '',
                          platform: 'Zepto'
                        });
                      };

                      const walk = (node, depth) => {
                        if (!node || depth > 9) return;
                        if (Array.isArray(node)) {
                          node.forEach((x) => walk(x, depth + 1));
                          return;
                        }
                        if (typeof node !== 'object') return;
                        const hasName = ('name' in node) || ('display_name' in node) || ('displayName' in node) || ('title' in node);
                        const hasPrice = ('price' in node) || ('mrp' in node) || ('finalPrice' in node) || ('offerPrice' in node) || ('selling_price' in node);
                        if (hasName && hasPrice) tryPush(node);
                        Object.keys(node).forEach((k) => walk(node[k], depth + 1));
                      };

                      walk(nextData, 0);
                      log('Zepto __NEXT_DATA__ fallback parsed ' + products.length + ' products');
                    } else {
                      log('Zepto __NEXT_DATA__ fallback: no state found');
                    }
                  } catch (e) {
                    log('Zepto __NEXT_DATA__ fallback failed: ' + e.message);
                  }
                }
                
                log('Parsed ' + products.length + ' products');
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'SEARCH_RESULTS',
                  platform: 'Zepto',
                  sessionId: window.__COMPAREX_SESSION_ID__ || null,
                  products: products,
                  success: true
                }));
              }, 10000); // Wait 10s for page to fully render (Next.js needs time for JS)
            } catch (error) {
              log('FATAL ERROR: ' + error.message);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SEARCH_RESULTS',
                platform: 'Zepto',
                sessionId: window.__COMPAREX_SESSION_ID__ || null,
                error: error.message,
                success: false,
                products: []
              }));
            }
          })();
        `,
      },
    };
  }

  getSearchUrl(platform, query, lat, lng) {
    const config = this.platforms[platform];
    if (!config) return null;
    return config.searchUrl(query, lat, lng);
  }

  getParseScript(platform, tokens) {
    const config = this.platforms[platform];
    if (!config) return null;
    return config.parseScript(tokens);
  }
}

export default new PlatformDOMScraperService();
