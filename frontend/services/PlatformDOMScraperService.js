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
                            const contextBefore = cardText.substring(Math.max(0, numIndex - 6), numIndex).toLowerCase();
                            const contextAfter = cardText.substring(numIndex + num.length, numIndex + num.length + 10).toLowerCase();
                            
                            // Fallback numbers are only allowed when they look currency-adjacent
                            if (!/₹|rs\.?|inr/.test(contextBefore)) {
                              continue;
                            }

                            // Skip if followed by measurement units
                            if (/^\s*(ml|g|kg|l|pcs|pack|piece|mins?|%|off)/.test(contextAfter)) {
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
                      const rupeeMatch = cardText.match(/₹\s*([0-9]+)/g);
                      if (rupeeMatch && rupeeMatch.length > 0) {
                        const prices = rupeeMatch.map(m => parseInt(m.replace(/₹\s*/g, ''))).filter(p => p >= 5 && p <= 9999);
                        if (prices.length > 0) {
                          priceText = Math.min(...prices).toString();
                        }
                      }

                      if (!priceText) {
                        const allNumbers = cardText.match(/[0-9]+/g);
                        if (allNumbers) {
                          for (let num of allNumbers) {
                            const val = parseInt(num);
                            if (val < 5 || val > 9999) continue;

                            const numIndex = cardText.indexOf(num);
                            const contextBefore = cardText.substring(Math.max(0, numIndex - 6), numIndex).toLowerCase();
                            const contextAfter = cardText.substring(numIndex + num.length, numIndex + num.length + 10).toLowerCase();

                            if (!/₹|rs\.?|inr/.test(contextBefore)) continue;
                            if (/^\s*(ml|g|kg|l|pcs|pack|piece|mins?|%|off)/.test(contextAfter)) continue;

                            priceText = num;
                            break;
                          }
                        }
                      }

                      if (index === 0) {
                        log('DEBUG: No priceEl, cardText: "' + cardText + '"');
                        log('DEBUG: Selected fallback price: ' + priceText);
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
                        price = Math.max(...prices).toString();
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
                        const contextBefore = cardText.substring(Math.max(0, numIndex - 6), numIndex).toLowerCase();
                        const contextAfter = cardText.substring(numIndex + num.length, numIndex + num.length + 10).toLowerCase();

                        if (!/₹|rs\.?|inr/.test(contextBefore)) {
                          continue;
                        }
                        
                        if (!/\s*(ml|g|kg|l|pcs|pack|mins?|%|off)/.test(contextAfter)) {
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
                      const parsedPrice = parseInt(price);
                      
                      products.push({
                        product_name: name.substring(0, 100),
                        brand: '',
                        price: parsedPrice,
                        mrp: parsedPrice,
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
                        const rawBasePrice = obj?.mrp ?? obj?.original_price ?? obj?.originalPrice ?? obj?.price ?? obj?.selling_price ?? obj?.sellingPrice ?? obj?.finalPrice ?? obj?.final_price ?? obj?.offerPrice ?? obj?.offer_price;
                        if (typeof name !== 'string' || name.trim().length < 3) return;
                        const price = toPrice(rawBasePrice);
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
