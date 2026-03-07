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
                const productCards = document.querySelectorAll('[data-test-id="product-pod"], .product-card, .SKUDeck___StyledDiv-sc-1e5d9gk-0, li[class*="Product"]');
                
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
                        // Skip discount %, delivery time, quantities - find first number >= 50
                        for (let num of allNumbers) {
                          const val = parseInt(num);
                          if (val >= 50 && val <= 9999) {
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
              }, 3000);
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
          `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(query)}&lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`, // Include location hints
        parseScript: () => `
          (function() {
            const log = (msg) => {
              try {
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', message: '[Instamart-DOM] ' + msg}));
              } catch(e) {}
            };

            const safeJsonParse = (text) => {
              try {
                if (typeof text !== 'string') return null;
                const t = text.trim();
                if (!t) return null;
                if (!(t.startsWith('{') || t.startsWith('['))) return null;
                return JSON.parse(t);
              } catch (e) {
                return null;
              }
            };

            const shouldCaptureUrl = (url) => {
              if (!url || typeof url !== 'string') return false;
              return url.includes('swiggy.com') && (url.includes('/dapi/') || url.includes('/api/'));
            };

            // Capture dynamic JSON responses produced by the Swiggy web app.
            /*
            try {
              if (!window.__COMPAREX_INSTAMART_NET_HOOKS__) {
                window.__COMPAREX_INSTAMART_NET_HOOKS__ = { entries: [] };

                const pushEntry = (entry) => {
                  try {
                    const list = window.__COMPAREX_INSTAMART_NET_HOOKS__.entries;
                    list.push(entry);
                    if (list.length > 20) list.splice(0, list.length - 20);
                  } catch (e) {}
                };

                if (typeof window.fetch === 'function') {
                  const originalFetch = window.fetch.bind(window);
                  window.fetch = async function(input, init) {
                    const response = await originalFetch(input, init);
                    try {
                      const url = (typeof input === 'string') ? input : (input && input.url ? input.url : '');
                      if (shouldCaptureUrl(url)) {
                        const clone = response.clone();
                        const contentType = (clone.headers && clone.headers.get) ? (clone.headers.get('content-type') || '') : '';
                        const text = await clone.text();
                        pushEntry({ via: 'fetch', url: url, status: response.status, contentType: contentType, sample: (text || '').slice(0, 50000) });
                      }
                    } catch (e) {}
                    return response;
                  };
                }

                if (typeof window.XMLHttpRequest === 'function') {
                  const XHR = window.XMLHttpRequest;
                  const originalOpen = XHR.prototype.open;
                  const originalSend = XHR.prototype.send;
                  XHR.prototype.open = function(method, url) {
                    try { this.__comparex_url = url; } catch (e) {}
                    return originalOpen.apply(this, arguments);
                  };
                  XHR.prototype.send = function(body) {
                    try {
                      this.addEventListener('loadend', function() {
                        try {
                          const url = this.__comparex_url || '';
                          if (!shouldCaptureUrl(url)) return;
                          const contentType = (this.getResponseHeader && this.getResponseHeader('content-type')) ? (this.getResponseHeader('content-type') || '') : '';
                          const text = (typeof this.responseText === 'string') ? this.responseText : '';
                          pushEntry({ via: 'xhr', url: url, status: (typeof this.status === 'number' ? this.status : 0), contentType: contentType, sample: (text || '').slice(0, 50000) });
                        } catch (e) {}
                      });
                    } catch (e) {}
                    return originalSend.apply(this, arguments);
                  };
                }

                log('NET: Installed fetch/XHR interceptors');
              }
            } catch (e) {
              log('NET: Failed to install interceptors: ' + e.message);
            }
            */
            
            try {
              log('Parsing Swiggy Instamart search page...');
                            // Immediate confirmation that script is running
              window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', message: '[Instamart-DOM] Script injected and running'}));
                            setTimeout(async () => {
                              log('SetTimeout callback executed');
                              log('Starting product extraction after 6s wait...');
                if (document.readyState !== 'complete') {
                  log('Document not complete, readyState: ' + document.readyState);
                  return;
                }
                const products = [];

                try {
                  log('URL: ' + window.location.href);
                  log('Title: ' + (document.title || ''));
                  log('ReadyState: ' + (document.readyState || ''));
                } catch (e) {}

                const bodyTextRaw = (document.body && document.body.textContent) ? document.body.textContent : '';
                const bodyText = bodyTextRaw.toLowerCase();
                if (bodyTextRaw) {
                  log('Body length: ' + bodyTextRaw.length);
                  log('Body sample: ' + bodyTextRaw.slice(0, 160).replace(/\s+/g, ' '));
                }

                const looksLikeLocationGate =
                  bodyText.includes('set your location') ||
                  bodyText.includes('enter your delivery location') ||
                  bodyText.includes('detect my location') ||
                  bodyText.includes('choose your location') ||
                  bodyText.includes('select delivery location');

                const looksLikeServiceabilityGate =
                  bodyText.includes('not serviceable') ||
                  bodyText.includes('not available in your area') ||
                  bodyText.includes('currently not available');

                const looksLikeWafOrError =
                  bodyText.includes('something went wrong') ||
                  bodyText.includes('try again later') ||
                  bodyText.includes("we'll be back") ||
                  bodyText.includes('temporarily unavailable') ||
                  bodyText.includes('access denied') ||
                  bodyText.includes('blocked') ||
                  bodyText.includes('request blocked');

                const looksLikeGetAppInterstitial =
                  bodyText.includes('get app') &&
                  (bodyText.includes('best offer') || bodyText.includes('just for you'));

                // Try to dismiss the GET APP interstitial so products can load beneath it
                if (looksLikeGetAppInterstitial) {
                  log('GET APP interstitial detected — attempting to dismiss...');
                  try {
                    // Try clicking any close / dismiss / skip button in the interstitial
                    const dismissSelectors = [
                      'button[aria-label*="close" i]', 'button[aria-label*="dismiss" i]',
                      '[class*="close"]', '[class*="Close"]', '[class*="dismiss"]',
                      'button[class*="skip" i]', 'svg[class*="close"]',
                      // Swiggy specific: the X button or the backdrop
                      '[data-testid*="close"]', '[data-testid*="dismiss"]',
                    ];
                    let dismissed = false;
                    for (const sel of dismissSelectors) {
                      const btn = document.querySelector(sel);
                      if (btn) { btn.click(); dismissed = true; log('Clicked dismiss: ' + sel); break; }
                    }
                    // Also try pressing Escape key
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
                    if (!dismissed) log('No dismiss button found, continuing anyway (products may be behind modal)');
                  } catch (e) { log('Dismiss attempt failed: ' + e.message); }
                }

                try {
                  const perf = (window.performance && window.performance.getEntriesByType) ? window.performance.getEntriesByType('resource') : [];
                  const urls = (perf || []).map(r => (r && r.name) ? String(r.name) : '').filter(Boolean);
                  const interesting = urls.filter(u => u.includes('swiggy.com') && (u.includes('/dapi/') || u.includes('instamart')));
                  log('NET: perf resources=' + urls.length + ', interesting=' + interesting.length);
                  if (interesting.length) {
                    log('NET: perf sample: ' + interesting.slice(0, 3).map(u => u.slice(0, 120)).join(' | '));
                  }
                } catch (e) {}
                
                // Try multiple selector strategies for Instamart product cards
                let rawLinks = Array.from(document.querySelectorAll(
                  'a[href*="/instamart/item/"], a[href*="/item/"]'
                ));
                log('Found ' + rawLinks.length + ' raw product links');

                // Walk UP from each anchor to find the actual card container.
                // The <a> is tiny (just "18 MINS"); the real card is its grandparent.
                const getCardAncestor = (el) => {
                  let cur = el.parentElement;
                  for (let i = 0; i < 8 && cur; i++) {
                    const txt = cur.textContent || '';
                    const hasImg = !!cur.querySelector('img');
                    const hasPricePattern = /[₹\u20B9]\s*\d/.test(txt) || /\b\d{2,4}\b/.test(txt);
                    const txtLen = txt.length;
                    if (hasImg && hasPricePattern && txtLen > 15 && txtLen < 600) return cur;
                    cur = cur.parentElement;
                  }
                  return el; // fallback
                };

                // De-duplicate cards
                const seenCards = new Set();
                let productCards = [];
                for (const link of rawLinks) {
                  const card = getCardAncestor(link);
                  if (!seenCards.has(card)) { seenCards.add(card); productCards.push(card); }
                }
                log('Resolved ' + productCards.length + ' unique product cards');

                // Debug first card to understand HTML structure
                if (productCards.length > 0) {
                  const fc = productCards[0];
                  log('First card tag: ' + fc.tagName + ', textLen: ' + (fc.textContent || '').length);
                  log('First card TEXT: ' + (fc.textContent || '').replace(/\s+/g, ' ').slice(0, 250));
                  log('First card HTML: ' + fc.innerHTML.slice(0, 350));
                }

                if (productCards.length === 0) {
                  log('DEBUG: Trying Instamart-specific fallback selector...');
                  const allElements = Array.from(document.querySelectorAll('div, a'));
                  productCards = allElements.filter(el => {
                    const text = el.textContent || '';
                    const hasImg = el.querySelector('img');
                    const hasPrice = /[₹\u20B9]\s*\d/.test(text);
                    const textLen = text.length;
                    return hasImg && hasPrice && textLen > 20 && textLen < 500 && el.children.length >= 2;
                  });
                  log('DEBUG: Instamart fallback found ' + productCards.length + ' cards');
                }

                // If DOM cards are not found, try extracting products from Next.js state
                if (productCards.length === 0) {
                  const nextDataEl = document.querySelector('script#__NEXT_DATA__');
                  const nextDataText = nextDataEl?.textContent;
                  log('DEBUG: __NEXT_DATA__ present: ' + (!!nextDataText));
                  if (nextDataText) {
                    log('DEBUG: __NEXT_DATA__ length: ' + nextDataText.length);
                  }
                  if (nextDataText && nextDataText.trim().startsWith('{')) {
                    log('DEBUG: Attempting __NEXT_DATA__ JSON extraction...');
                    try {
                      const nextData = JSON.parse(nextDataText);
                      const found = [];
                      const seen = new Set();

                      const normalizePrice = (raw) => {
                        const n = typeof raw === 'string' ? parseFloat(raw) : raw;
                        if (!Number.isFinite(n) || n <= 0) return 0;
                        // If looks like paise/cents (e.g. 2599), convert to rupees when reasonable
                        if (n > 9999 && n <= 999999) return Math.round(n / 100);
                        if (n > 0 && n <= 9999) return Math.round(n);
                        return 0;
                      };

                      const tryPush = (obj) => {
                        const name =
                          obj?.name ||
                          obj?.display_name ||
                          obj?.displayName ||
                          obj?.product_name ||
                          obj?.title;

                        const rawPrice =
                          obj?.price ??
                          obj?.finalPrice ??
                          obj?.final_price ??
                          obj?.offerPrice ??
                          obj?.offer_price ??
                          obj?.selling_price ??
                          obj?.sellingPrice ??
                          obj?.mrp;
                        if (typeof name !== 'string' || name.trim().length < 3) return;
                        const price = normalizePrice(rawPrice);
                        if (!price) return;
                        const key = (name.trim().toLowerCase() + '|' + price);
                        if (seen.has(key)) return;
                        seen.add(key);
                        found.push({ name: name.trim(), price });
                      };

                      const walk = (node, depth) => {
                        if (!node || depth > 7) return;
                        if (Array.isArray(node)) {
                          for (const item of node) walk(item, depth + 1);
                          return;
                        }
                        if (typeof node !== 'object') return;

                        // Common product-like shapes
                        const maybeProduct =
                          ('name' in node || 'display_name' in node || 'displayName' in node) &&
                          ('price' in node || 'mrp' in node || 'finalPrice' in node || 'final_price' in node || 'offerPrice' in node || 'offer_price' in node);
                        if (maybeProduct) tryPush(node);

                        // Instamart sometimes nests products under variations
                        if (Array.isArray(node.variations)) {
                          for (const v of node.variations) {
                            tryPush(v);
                          }
                        }

                        for (const k of Object.keys(node)) {
                          const v = node[k];
                          // Skip huge HTML strings
                          if (typeof v === 'string' && v.length > 50000) continue;
                          walk(v, depth + 1);
                        }
                      };

                      walk(nextData, 0);
                      log('DEBUG: __NEXT_DATA__ candidates: ' + found.length);

                      // Convert to products list
                      for (const p of found.slice(0, 60)) {
                        products.push({
                          product_name: p.name,
                          brand: '',
                          price: p.price,
                          mrp: p.price,
                          image_url: '',
                          product_url: '',
                          in_stock: true,
                          weight: '',
                          platform: 'Instamart'
                        });
                      }
                    } catch (e) {
                      log('DEBUG: __NEXT_DATA__ parse failed: ' + e.message);
                    }
                  }
                }

                // If DOM/Next data didn't yield anything, try extracting from in-page API + captured network JSON.
                if (productCards.length === 0 && products.length === 0) {
                  // Temporarily disabled in-page API fetch to prevent hanging on iOS
                  // const found = [];
                  // ... (comment out the whole block)
                }

                // If still nothing, report a specific failure reason (avoid silent empty success)
                if (productCards.length === 0 && products.length === 0) {
                  let reason = 'No products found';
                  if (looksLikeLocationGate) reason = 'Location selection required';
                  else if (looksLikeServiceabilityGate) reason = 'Not serviceable for current location';
                  else if (looksLikeWafOrError) reason = 'Error/WAF page displayed';
                  else if (looksLikeGetAppInterstitial) reason = 'GET APP interstitial shown — products may still be in DOM';

                  log('WARNING: ' + reason + ' — proceeding with extraction anyway');
                  // Don't return early — products may still be extractable behind the modal
                }
                
                const priceAttrNames = [
                  'data-price',
                  'data-final-price',
                  'data-offer-price',
                  'data-list-price',
                  'data-product-price',
                  'data-value',
                  'data-amount',
                  'aria-label'
                ];

                const extractPriceFromAttributes = (element) => {
                  if (!element || !element.getAttribute) return null;
                  for (const attr of priceAttrNames) {
                    const value = element.getAttribute(attr);
                    if (value && /\d/.test(value)) {
                      const cleaned = value.replace(/[^0-9.]/g, '');
                      if (cleaned) return cleaned;
                    }
                  }
                  return null;
                };

                const extractPriceFromDescendants = (card) => {
                  const all = [card, ...Array.from(card.querySelectorAll('*'))];
                  for (const el of all) {
                    const attr = extractPriceFromAttributes(el);
                    if (attr) return attr;
                    const aria = el.getAttribute && el.getAttribute('aria-label');
                    if (aria) {
                      const found = parsePriceFromText(aria);
                      if (found) return found;
                    }
                    if (el.className && typeof el.className === 'string' && /price/i.test(el.className)) {
                      const found = parsePriceFromText(el.textContent || el.innerText || '');
                      if (found) return found;
                    }
                    if (el.dataset) {
                      for (const val of Object.values(el.dataset)) {
                        const found = parsePriceFromText(val);
                        if (found) return found;
                      }
                    }
                  }
                  return null;
                };

                const parsePriceFromText = (text) => {
                  if (!text) return null;
                  const cleaned = text.replace(/[\u00a0\u202f]/g, ' ');
                  const rupeeMatch = cleaned.match(/(?:₹|Rs\.?\s*)\s*([0-9][0-9,.]*)/i);
                  if (rupeeMatch && rupeeMatch[1]) return rupeeMatch[1];

                  const numbers = cleaned.match(/\d+/g) || [];
                  for (const n of numbers) {
                    const val = parseInt(n, 10);
                    if (val < 5 || val > 9999) continue;
                    const idx = cleaned.indexOf(n);
                    const after = cleaned.substring(idx + n.length, idx + n.length + 6).toLowerCase();
                    // Skip delivery times/weights
                    if (/(min|mins|kg|g|ml|l|ltr|pcs|pack)/.test(after)) continue;
                    return n;
                  }
                  return null;
                };

                const resolvePrice = (card, cardText) => {
                  let resolved = parsePriceFromText(cardText);
                  if (resolved) return resolved;

                  const attrPrice = extractPriceFromDescendants(card);
                  if (attrPrice) return attrPrice;

                  const textNodes = Array.from(card.querySelectorAll('span, div, p, button'));
                  for (const node of textNodes) {
                    const candidate = parsePriceFromText(node.textContent || node.innerText || '');
                    if (candidate) return candidate;
                  }

                  return null;
                };

                const normalizeNumericPrice = (raw) => {
                  if (!raw) return 0;
                  const match = String(raw).match(/\d+(?:\.\d+)?/);
                  if (!match) return 0;
                  const n = parseFloat(match[0]);
                  if (!Number.isFinite(n)) return 0;
                  if (n < 5 || n > 9999) return 0;
                  return Math.round(n);
                };

                log('Processing ' + productCards.length + ' cards');

                productCards.forEach((card, index) => {
                  try {
                    let name = '';
                    const heading = card.querySelector('h4, h3, h2, div[class*="name"], div[class*="title"]');
                    if (heading && heading.textContent) {
                      name = heading.textContent.trim();
                    }

                    if (!name || name.length < 5) {
                      const textEls = Array.from(card.querySelectorAll('div, p, span'))
                        .map(el => el.textContent?.trim())
                        .filter(t => t && t.length > 3 && t.length < 120 && /[a-zA-Z]/.test(t))
                        .filter(t => !/^\d+\s*(min|mins)$/i.test(t));

                      if (textEls.length > 0) {
                        // Prefer strings with fewer numbers (avoid delivery time labels)
                        const sorted = textEls
                          .map(t => ({ t, score: (t.match(/\d+/g) || []).length }))
                          .sort((a, b) => a.score - b.score);
                        name = sorted[0].t;
                      }
                    }

                    const cardText = card.textContent || '';
                    const priceCandidate = resolvePrice(card, cardText);
                    const numericPrice = normalizeNumericPrice(priceCandidate);

                    const imgEl = card.querySelector('img');
                    const productUrl = card.href || card.querySelector('a')?.href || '';
                    
                    if (index === 0) {
                      log('First product: ' + (name || 'NOT FOUND') + ', rawPrice: ' + (priceCandidate || 'NONE') + ', price: ' + numericPrice);
                    }
                    
                    if (name && numericPrice > 0) {
                      products.push({
                        product_name: name,
                        brand: '',
                        price: numericPrice,
                        mrp: numericPrice,
                        image_url: imgEl ? imgEl.src : '',
                        product_url: productUrl,
                        in_stock: true,
                        weight: '',
                        platform: 'Instamart'
                      });
                    }
                  } catch(e) {
                    if (index === 0) {
                      log('Error parsing first product: ' + e.message);
                    }
                  }
                });

                // Fallback: if we still have zero products, try __NEXT_DATA__ extraction even when cards were present (price parsing may have failed)
                if (products.length === 0) {
                  try {
                    const nextDataEl = document.querySelector('script#__NEXT_DATA__');
                    const nextDataText = nextDataEl?.textContent;
                    if (nextDataText && nextDataText.trim().startsWith('{')) {
                      const nextData = JSON.parse(nextDataText);
                      const found = [];
                      const seen = new Set();

                      const normalizePrice = (raw) => {
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
                        const price = normalizePrice(rawPrice);
                        if (!price) return;
                        const key = (name.trim().toLowerCase() + '|' + price);
                        if (seen.has(key)) return;
                        seen.add(key);
                        found.push({ name: name.trim(), price });
                      };

                      const walk = (node, depth) => {
                        if (!node || depth > 7) return;
                        if (Array.isArray(node)) {
                          for (const item of node) walk(item, depth + 1);
                          return;
                        }
                        if (typeof node !== 'object') return;

                        const maybeProduct = ('name' in node || 'display_name' in node || 'displayName' in node) && ('price' in node || 'mrp' in node || 'finalPrice' in node || 'final_price' in node || 'offerPrice' in node || 'offer_price' in node);
                        if (maybeProduct) tryPush(node);

                        if (Array.isArray(node.variations)) {
                          for (const v of node.variations) {
                            tryPush(v);
                          }
                        }

                        for (const k of Object.keys(node)) {
                          const v = node[k];
                          if (typeof v === 'string' && v.length > 50000) continue;
                          walk(v, depth + 1);
                        }
                      };

                      walk(nextData, 0);
                      log('DEBUG: __NEXT_DATA__ fallback candidates: ' + found.length);

                      for (const p of found.slice(0, 60)) {
                        products.push({
                          product_name: p.name,
                          brand: '',
                          price: p.price,
                          mrp: p.price,
                          image_url: '',
                          product_url: '',
                          in_stock: true,
                          weight: '',
                          platform: 'Instamart'
                        });
                      }
                    } else {
                      log('DEBUG: __NEXT_DATA__ fallback missing or not JSON');
                    }
                  } catch (e) {
                    log('DEBUG: __NEXT_DATA__ fallback parse failed: ' + e.message);
                  }
                }
                
                log('Parsed ' + products.length + ' products');
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'SEARCH_RESULTS',
                  platform: 'Instamart',
                  sessionId: window.__COMPAREX_SESSION_ID__ || null,
                  products: products,
                  success: true
                }));
              }, 6000); // Shorter wait to avoid WebView timeouts while React renders
            } catch (error) {
              log('FATAL ERROR: ' + error.message);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SEARCH_RESULTS',
                platform: 'Instamart',
                sessionId: window.__COMPAREX_SESSION_ID__ || null,
                error: error.message,
                success: false,
                products: []
              }));
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

  getParseScript(platform) {
    const config = this.platforms[platform];
    if (!config) return null;
    return config.parseScript();
  }
}

export default new PlatformDOMScraperService();
