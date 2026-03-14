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

            const extractMeta = (text) => {
              const raw = String(text || '');
              const compact = raw.replace(/\s+/g, ' ').trim();

              const labeledPriceMatch = compact.match(/\bprice\b\s*:?\s*₹\s*([0-9]+(?:\.[0-9]+)?)/i);
              const labeledMrpMatch = compact.match(/\bmrp\b\s*:?\s*₹\s*([0-9]+(?:\.[0-9]+)?)/i);

              const quantity = (compact.match(/\b\d+(?:\.\d+)?\s*(?:kg|g|gm|grams?|ml|l|ltr|litre|litres|pcs?|pc|pack|pouch|bottle)\b/i) || [])[0] || '';

              const ratingMatch = compact.match(/\b([0-5](?:\.\d)?)\b\s*(?:\(([\d.,]+)\s*([kKmM]?)\)|⭐|stars?|\\/5)/i);
              const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
              let ratingCount = 0;
              if (ratingMatch && ratingMatch[2]) {
                const base = parseFloat(String(ratingMatch[2]).replace(/,/g, '')) || 0;
                const unit = String(ratingMatch[3] || '').toLowerCase();
                ratingCount = unit === 'k' ? Math.round(base * 1000) : unit === 'm' ? Math.round(base * 1000000) : Math.round(base);
              }

              const rupees = [];
              const rupeeRegex = /₹\s*([0-9]+(?:\.[0-9]+)?)/g;
              let rupeeMatch;
              while ((rupeeMatch = rupeeRegex.exec(compact)) !== null) {
                const parsed = parseFloat(rupeeMatch[1]);
                if (!Number.isNaN(parsed)) rupees.push(parsed);
              }
              const validRupees = rupees.filter((v) => Number.isFinite(v) && v > 0);

              const mrp = labeledMrpMatch
                ? parseFloat(labeledMrpMatch[1])
                : (validRupees.length > 1 ? Math.max(...validRupees) : 0);

              const discountPercentMatch = compact.match(/(\d{1,2})\s*%\s*OFF|OFF\s*(\d{1,2})\s*%/i);
              const discountPercent = discountPercentMatch ? parseInt(discountPercentMatch[1] || discountPercentMatch[2], 10) : 0;

              const discountValueMatch = compact.match(/(?:save|off)\s*₹\s*([0-9]+(?:\.[0-9]+)?)|₹\s*([0-9]+(?:\.[0-9]+)?)\s*OFF/i);
              const discountValue = discountValueMatch ? parseFloat(discountValueMatch[1] || discountValueMatch[2]) : 0;

              return {
                labeled_price: labeledPriceMatch ? parseFloat(labeledPriceMatch[1]) : 0,
                quantity,
                rating,
                rating_count: ratingCount,
                mrp,
                discount_percent: discountPercent,
                discount_value: discountValue,
                raw_text: compact,
              };
            };

            const extractBestPrice = (cardText, meta) => {
              if (!cardText) return 0;

              const compact = String(cardText || '').replace(/\s+/g, ' ').trim();
              const labeledPriceMatch = compact.match(/\bprice\b\s*:?\s*₹\s*([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]+)?)/i);
              if (labeledPriceMatch && labeledPriceMatch[1]) {
                const labeledPrice = parseFloat(String(labeledPriceMatch[1]).replace(/,/g, ''));
                if (Number.isFinite(labeledPrice) && labeledPrice > 0) {
                  return labeledPrice;
                }
              }

              if (meta && meta.labeled_price > 0) {
                return meta.labeled_price;
              }

              const rupeeRegex = /₹\s*([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]+)?)/g;
              const candidates = [];
              let match;

              while ((match = rupeeRegex.exec(cardText)) !== null) {
                const raw = String(match[1] || '').replace(/,/g, '');
                const value = parseFloat(raw);
                if (!Number.isFinite(value) || value <= 0 || value > 99999) continue;

                const around = cardText
                  .substring(Math.max(0, match.index - 28), match.index + match[0].length + 40)
                  .toLowerCase();
                const before = cardText
                  .substring(Math.max(0, match.index - 16), match.index)
                  .toLowerCase();
                const after = cardText
                  .substring(match.index + match[0].length, match.index + match[0].length + 32)
                  .toLowerCase();

                let score = 0;
                const isExplicitPrice = /(?:^|\b)(price|selling|sale|our\s*price|current\s*price)\b/.test(around);
                const isMrp = /\bmrp\b|list\s*price|market\s*price/.test(around);
                const isDiscount = /save|discount|\boff\b/.test(around);
                const isPromoThreshold =
                  /bill|basket|cart|minimum\\s+order|minimum\\s+bill|order[-\\s]*value|on\\s+₹/.test(around) ||
                  /bill|basket|cart|minimum\\s+order|minimum\\s+bill|order[-\\s]*value/.test(after) ||
                  /@\\s*$/.test(before);

                // Penalize non-selling contexts heavily.
                if (isMrp) score -= 35;
                if (isDiscount) score -= 25;
                if (isPromoThreshold) score -= 40;

                // Favor price contexts commonly used for current selling price.
                if (isExplicitPrice || /at\s*₹|only\s*₹/.test(around)) score += 18;
                if (/\badd\b|\bbuy\b|\bcart\b/.test(around)) score += 6;

                if (meta && meta.mrp > 0) {
                  if (Math.abs(value - meta.mrp) < 0.51 && !isExplicitPrice) score -= 10;
                  if (value > meta.mrp) score -= 25;
                }

                candidates.push({ value, score, pos: match.index, isExplicitPrice, isMrp, isDiscount, isPromoThreshold });
              }

              if (!candidates.length) return 0;

              const cleanSellingCandidates = candidates.filter(
                (c) => !c.isMrp && !c.isDiscount && !c.isPromoThreshold,
              );

              if (cleanSellingCandidates.length) {
                cleanSellingCandidates.sort((a, b) => {
                  if (Number(b.isExplicitPrice) !== Number(a.isExplicitPrice)) {
                    return Number(b.isExplicitPrice) - Number(a.isExplicitPrice);
                  }
                  if (b.score !== a.score) return b.score - a.score;
                  if (meta && meta.mrp > 0) {
                    const aGap = Math.abs(meta.mrp - a.value);
                    const bGap = Math.abs(meta.mrp - b.value);
                    if (aGap !== bGap) return aGap - bGap;
                  }
                  return a.value - b.value;
                });

                return cleanSellingCandidates[0].value;
              }

              candidates.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                if (meta && meta.mrp > 0) {
                  const aGap = Math.abs(meta.mrp - a.value);
                  const bGap = Math.abs(meta.mrp - b.value);
                  if (aGap !== bGap) return aGap - bGap;
                }
                return a.value - b.value;
              });

              return candidates[0].value;
            };
            
            try {
              log('Parsing search results page...');

              const MAX_WAIT_MS = 5500;
              const POLL_MS = 500;
              const MIN_CARDS = 15;
              let elapsed = 0;
              let extracted = false;

              const doExtract = () => {
                if (extracted) return;
                extracted = true;
                log('Starting product extraction at ' + elapsed + 'ms...');
                const products = [];
                
                // Try multiple selector strategies
                let productCards = document.querySelectorAll('[class*="Product"][class*="Card"], [class*="product-card"], div[class*="ProductCard"]');
                if (productCards.length === 0) {
                  productCards = document.querySelectorAll('a[href*="/p/"], a[href*="/pn/"], a[href*="/product/"]');
                }
                if (productCards.length === 0) {
                  // Blinkit uses Tailwind CSS (body class "spicy-tailwind") — no semantic class names, no <a> links.
                  // Product card text pattern: "{Name}{size}₹{price}ADD" e.g. "Amul Gold Full Cream Milk500 ml₹33ADD"
                  log('DEBUG: Trying Blinkit-specific fallback selector...');
                  const allDivs = Array.from(document.querySelectorAll('div'));
                  log('DEBUG: Total divs in document: ' + allDivs.length);

                  // Find all divs that contain a selling-price token and ADD.
                  // Blinkit often concatenates text like "₹33ADD23 mins", so strict word boundaries are brittle.
                  const hasPriceToken = (text) => /(₹\s*[0-9]+|\brs\.?\s*[0-9]+|\binr\s*[0-9]+)/i.test(text);
                  const hasRupeeAndAdd = (text) => hasPriceToken(text) && /ADD/i.test(text);
                  let candidateDivs = allDivs.filter(div => {
                    const text = div.textContent || '';
                    const textLen = text.length;
                    return hasRupeeAndAdd(text) && textLen >= 10 && textLen <= 2000;
                  });

                  if (candidateDivs.length === 0) {
                    const priceDivs = allDivs.filter(div => hasPriceToken(div.textContent || ''));
                    const derived = [];
                    priceDivs.forEach((div) => {
                      let cursor = div;
                      for (let depth = 0; depth < 7 && cursor; depth += 1) {
                        const text = cursor.textContent || '';
                        if (/ADD/i.test(text) && text.length >= 10 && text.length <= 2000) {
                          derived.push(cursor);
                          break;
                        }
                        cursor = cursor.parentElement;
                      }
                    });
                    candidateDivs = Array.from(new Set(derived));
                    log('DEBUG: Blinkit ancestor fallback candidates: ' + candidateDivs.length + ' from price divs=' + priceDivs.length);
                  }

                  // Deduplicate: keep only the innermost (leaf-level) matching divs.
                  // A parent container that wraps multiple products will also match,
                  // so discard any div that has another matching div as a descendant.
                  const candidateSet = new Set(candidateDivs);
                  productCards = candidateDivs.filter(div => {
                    return !Array.from(div.querySelectorAll('div')).some(child => candidateSet.has(child));
                  });

                  log('DEBUG: Blinkit price+ADD candidates: ' + candidateDivs.length + ', leaf cards: ' + productCards.length);
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
                    const rawSelectorName = name || ''; // exact text from DOM element before fallback cleaning
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
                    
                    const cardText = card.textContent || '';
                    const meta = extractMeta(cardText);

                    // Try multiple selectors for price  
                    let priceText = '';
                    let priceEl = card.querySelector('div[class*="Price"]');
                    if (!priceEl) priceEl = card.querySelector('span[class*="price"]');
                    if (priceEl) {
                      const directPriceText = (priceEl.textContent || '').trim();
                      if (/\bmrp\b/i.test(directPriceText) && !/\b(price|selling|sale)\b/i.test(directPriceText)) {
                        priceText = '';
                      } else {
                        priceText = directPriceText;
                      }
                    } else {
                      // Fallback: extract the best selling price from the card text.
                      const bestPrice = extractBestPrice(cardText, meta);
                      if (bestPrice > 0) {
                        priceText = String(bestPrice);
                      }
                    }

                    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : 0;
                    const imgEl = card.querySelector('img');
                    const image = imgEl ? imgEl.src : '';
                    const nestedAnchor = card.querySelector('a[href]');
                    const closestAnchor = card.closest ? card.closest('a[href]') : null;
                    let productUrl =
                      card.href ||
                      nestedAnchor?.href ||
                      closestAnchor?.href ||
                      card.querySelector('[href]')?.getAttribute('href') ||
                      '';

                    if (productUrl && productUrl.startsWith('/')) {
                      productUrl = 'https://blinkit.com' + productUrl;
                    }

                    if (!productUrl && name) {
                      productUrl = 'https://blinkit.com/s/?q=' + encodeURIComponent(name);
                    }
                    
                    if (index === 0) {
                      log('First product - name: ' + (name || 'NOT FOUND') + ', price: ' + price);
                    }
                    
                    if (name && name.length > 3 && price > 0) {
                      products.push({
                        product_name: name,
                        raw_product_name: rawSelectorName || name,
                        brand: '',
                        price: price,
                        mrp: meta.mrp || price,
                        image_url: image,
                        product_url: productUrl,
                        in_stock: true,
                        weight: card.querySelector('div[class*="weight"], div[class*="quantity"]')?.textContent?.trim() || meta.quantity || '',
                        quantity: meta.quantity || '',
                        rating: meta.rating || 0,
                        rating_count: meta.rating_count || 0,
                        discount_percent: meta.discount_percent || ((meta.mrp && price > 0 && meta.mrp > price) ? Math.round(((meta.mrp - price) / meta.mrp) * 100) : 0),
                        discount_value: meta.discount_value || ((meta.mrp && price > 0 && meta.mrp > price) ? (meta.mrp - price) : 0),
                        raw_text: meta.raw_text || '',
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
                    // Last-resort fallback for highly obfuscated DOM: parse snippets from visible body text.
                    const bodyText = String(document.body?.textContent || '').replace(/\s+/g, ' ').trim();
                    const pattern = /(?:\d+\s*mins?)?\s*([A-Za-z][A-Za-z0-9'&\-\s]{6,120}?)\s*(\d+(?:\.\d+)?\s*(?:kg|g|gm|grams?|ml|l|ltr|litre|litres|pcs?|pc|pack|pouch|bottle))?\s*(?:₹|rs\.?|inr)\s*([0-9]{1,5}(?:\.[0-9]{1,2})?)\s*ADD/gi;
                    const seenText = new Set();
                    let match;
                    while ((match = pattern.exec(bodyText)) !== null) {
                      const rawName = (match[1] || '').replace(/\s+/g, ' ').trim();
                      const qty = (match[2] || '').trim();
                      const parsedPrice = parseFloat(match[3]);
                      if (!rawName || rawName.length < 4 || !Number.isFinite(parsedPrice) || parsedPrice <= 0) continue;
                      const key = rawName.toLowerCase() + '|' + parsedPrice;
                      if (seenText.has(key)) continue;
                      seenText.add(key);
                      products.push({
                        product_name: rawName,
                        raw_product_name: rawName,
                        brand: '',
                        price: parsedPrice,
                        mrp: parsedPrice,
                        image_url: '',
                        product_url: 'https://blinkit.com/s/?q=' + encodeURIComponent(rawName),
                        in_stock: true,
                        weight: qty,
                        quantity: qty,
                        rating: 0,
                        rating_count: 0,
                        discount_percent: 0,
                        discount_value: 0,
                        raw_text: '',
                        platform: 'Blinkit'
                      });
                    }
                    log('Blinkit body-text fallback parsed ' + products.length + ' products');
                  } catch (e) {
                    log('Blinkit body-text fallback failed: ' + e.message);
                  }
                }

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
                          product_url: (function() {
                            let url = obj?.deep_link || obj?.url || '';
                            if (url && url.startsWith('/')) {
                              url = 'https://blinkit.com' + url;
                            }
                            return url;
                          })(),
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
              };

              const pollForCards = () => {
                elapsed += POLL_MS;
                const allDivs = document.querySelectorAll('div');
                const hasPriceAndAdd = (t) => /(\u20B9\s*[0-9]+)/i.test(t) && /ADD/i.test(t);
                let cardCount = 0;
                allDivs.forEach(div => {
                  const t = div.textContent || '';
                  if (t.length >= 10 && t.length <= 2000 && hasPriceAndAdd(t)) cardCount++;
                });
                log('Poll @' + (elapsed / 1000) + 's: candidates=' + cardCount + ', divs=' + allDivs.length);
                if (cardCount >= MIN_CARDS || elapsed >= MAX_WAIT_MS) {
                  doExtract();
                } else {
                  setTimeout(pollForCards, POLL_MS);
                }
              };

              setTimeout(pollForCards, POLL_MS); // Start polling at 500ms intervals
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

            const extractMeta = (text) => {
              const raw = String(text || '');
              const compact = raw.replace(/\s+/g, ' ').trim();
              const lowerCompact = compact.toLowerCase();
              const labeledPriceMatch = compact.match(/\bprice\b\s*:?\s*₹\s*([0-9]+(?:\.[0-9]+)?)/i);
              const labeledMrpMatch = compact.match(/\bmrp\b\s*:?\s*₹\s*([0-9]+(?:\.[0-9]+)?)/i);
              const promoBundleMatch = compact.match(/₹\\s*([0-9]+(?:\\.[0-9]+)?)\\s*@\\s*₹\\s*[0-9]+(?:\\.[0-9]+)?\\s*on\\s*₹\\s*[0-9]+(?:\\.[0-9]+)?\\s*(?:bill|basket|cart|order(?:[-\\s]*value)?)/i);

              const quantity = (compact.match(/\b\d+(?:\.\d+)?\s*(?:kg|g|gm|grams?|ml|l|ltr|litre|litres|pcs?|pc|pack|pouch|bottle)\b/i) || [])[0] || '';

              const ratingMatch = compact.match(/\b([0-5](?:\.\d)?)\b\s*(?:\(([\d.,]+)\s*([kKmM]?)\)|⭐|stars?|\\/5)/i);
              const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
              let ratingCount = 0;
              if (ratingMatch && ratingMatch[2]) {
                const base = parseFloat(String(ratingMatch[2]).replace(/,/g, '')) || 0;
                const unit = String(ratingMatch[3] || '').toLowerCase();
                ratingCount = unit === 'k' ? Math.round(base * 1000) : unit === 'm' ? Math.round(base * 1000000) : Math.round(base);
              }

              const rupees = [];
              const rupeeRegex = /₹\s*([0-9]+(?:\.[0-9]+)?)/g;
              let rupeeMatch;
              while ((rupeeMatch = rupeeRegex.exec(compact)) !== null) {
                const parsed = parseFloat(rupeeMatch[1]);
                if (!Number.isNaN(parsed)) rupees.push(parsed);
              }
              const validRupees = rupees.filter((v) => Number.isFinite(v) && v > 0);

              const hasThresholdPromoText = /bill|basket|cart|minimum\\s+order|minimum\\s+bill|order[-\\s]*value/.test(lowerCompact);
              const mrp = labeledMrpMatch
                ? parseFloat(labeledMrpMatch[1])
                : (!hasThresholdPromoText && validRupees.length > 1 ? Math.max(...validRupees) : 0);

              const discountPercentMatch = compact.match(/(\d{1,2})\s*%\s*OFF|OFF\s*(\d{1,2})\s*%/i);
              const discountPercent = discountPercentMatch ? parseInt(discountPercentMatch[1] || discountPercentMatch[2], 10) : 0;

              const discountValueMatch = compact.match(/(?:save|off)\s*₹\s*([0-9]+(?:\.[0-9]+)?)|₹\s*([0-9]+(?:\.[0-9]+)?)\s*OFF/i);
              const discountValue = discountValueMatch ? parseFloat(discountValueMatch[1] || discountValueMatch[2]) : 0;

              return {
                labeled_price: labeledPriceMatch
                  ? parseFloat(labeledPriceMatch[1])
                  : (promoBundleMatch ? parseFloat(promoBundleMatch[1]) : 0),
                quantity,
                rating,
                rating_count: ratingCount,
                mrp,
                discount_percent: discountPercent,
                discount_value: discountValue,
                raw_text: compact,
              };
            };

            const extractBestPrice = (cardText, meta) => {
              if (!cardText) return 0;

              const compact = String(cardText || '').replace(/\s+/g, ' ').trim();
              const promoBundleMatch = compact.match(/₹\\s*([0-9]+(?:\\.[0-9]+)?)\\s*@\\s*₹\\s*[0-9]+(?:\\.[0-9]+)?\\s*on\\s*₹\\s*[0-9]+(?:\\.[0-9]+)?\\s*(?:bill|basket|cart|order(?:[-\\s]*value)?)/i);
              if (promoBundleMatch && promoBundleMatch[1]) {
                const promoSellingPrice = parseFloat(promoBundleMatch[1]);
                if (Number.isFinite(promoSellingPrice) && promoSellingPrice > 0) {
                  return promoSellingPrice;
                }
              }

              const labeledPriceMatch = compact.match(/\bprice\b\s*:?\s*₹\s*([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]+)?)/i);
              if (labeledPriceMatch && labeledPriceMatch[1]) {
                const labeledPrice = parseFloat(String(labeledPriceMatch[1]).replace(/,/g, ''));
                if (Number.isFinite(labeledPrice) && labeledPrice > 0) {
                  return labeledPrice;
                }
              }

              if (meta && meta.labeled_price > 0) {
                return meta.labeled_price;
              }

              const rupeeRegex = /₹\s*([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]+)?)/g;
              const candidates = [];
              let match;

              while ((match = rupeeRegex.exec(cardText)) !== null) {
                const raw = String(match[1] || '').replace(/,/g, '');
                const value = parseFloat(raw);
                if (!Number.isFinite(value) || value <= 0 || value > 99999) continue;

                const around = cardText
                  .substring(Math.max(0, match.index - 28), match.index + match[0].length + 40)
                  .toLowerCase();
                const before = cardText
                  .substring(Math.max(0, match.index - 16), match.index)
                  .toLowerCase();
                const after = cardText
                  .substring(match.index + match[0].length, match.index + match[0].length + 32)
                  .toLowerCase();

                const isMrp = /\bmrp\b|list\s*price|market\s*price/.test(around);
                const isDiscount = /save|discount/.test(around) || /\boff\b/.test(around) || /^\s*off\b/.test(after);
                const isPromoThreshold =
                  /\bbill\b|\bbasket\b|\bcart\b|minimum\s+order|minimum\s+bill|order\s+value|on\s+₹/.test(around) ||
                  /\bbill\b|\bbasket\b|\bcart\b|minimum\s+order|minimum\s+bill|order\s+value/.test(after) ||
                  /@\s*$/.test(before);
                const hasSaleCue = /price|selling|sale|our\s*price|at\s*₹|only\s*₹|\badd\b|\bbuy\b|\bcart\b/.test(around);

                let score = 0;
                if (isMrp) score -= 40;
                if (isDiscount) score -= 45;
                if (isPromoThreshold) score -= 50;
                if (hasSaleCue) score += 14;

                candidates.push({ value, score, pos: match.index, isMrp, isDiscount, isPromoThreshold, hasSaleCue });
              }

              if (!candidates.length) return 0;

              // If MRP and discount value are present, prefer candidate that matches (MRP - discount).
              const expectedFromDiscount =
                (meta && meta.mrp > 0 && meta.discount_value > 0)
                  ? Math.round((meta.mrp - meta.discount_value) * 100) / 100
                  : 0;

              if (expectedFromDiscount > 0) {
                const expectedMatch = candidates.find((c) => Math.abs(c.value - expectedFromDiscount) < 0.51);
                if (expectedMatch) {
                  return expectedMatch.value;
                }
              }

              const sellingCandidates = candidates.filter((c) => !c.isMrp && !c.isDiscount && !c.isPromoThreshold);
              if (sellingCandidates.length) {
                // Prefer explicit sale cues first, then lower value (selling price is typically <= MRP).
                sellingCandidates.sort((a, b) => {
                  if (Number(b.hasSaleCue) !== Number(a.hasSaleCue)) return Number(b.hasSaleCue) - Number(a.hasSaleCue);
                  if (a.value !== b.value) return a.value - b.value;
                  return a.pos - b.pos;
                });
                return sellingCandidates[0].value;
              }

              candidates.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                if (a.value !== b.value) return a.value - b.value;
                return a.pos - b.pos;
              });

              return candidates[0].value;
            };
            
            try {
              log('Parsing search results page...');
              let hasSent = false;
              const sendResults = (products, success, error) => {
                if (hasSent) return;
                hasSent = true;
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'SEARCH_RESULTS',
                  platform: 'BigBasket',
                  sessionId: window.__COMPAREX_SESSION_ID__ || null,
                  products: products || [],
                  success: !!success,
                  error: error || null,
                }));
              };

              const runParse = (attempt) => {
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
                    const normalizeName = (rawName) => {
                      if (!rawName) return '';
                      let cleaned = rawName
                        .replace(/\u00a0/g, ' ')
                        .replace(/([a-z])([A-Z])/g, '$1 $2')
                        .replace(/([A-Za-z])(\d)/g, '$1 $2')
                        .replace(/(\d)([A-Za-z])/g, '$1 $2')
                        .replace(/\b\d+\s*mins?\b/gi, ' ')
                        .replace(/₹\s*[0-9]+(?:\.[0-9]+)?/gi, ' ')
                        .replace(/\b(add|buy\s*now|qty|view\s*more|off)\b/gi, ' ')
                        .replace(/\b\d+(?:\.\d+)?\s*[kK]?\s*Ratings?.*$/i, '')
                        .replace(/\bRatings?.*$/i, '')
                        .replace(/\bReviews?.*$/i, '')
                        .replace(/[|]+/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();

                      // In some cards brand and product can be stuck together, this keeps a readable split.
                      cleaned = cleaned.replace(/([!\)])([A-Z][a-z])/g, '$1 $2').trim();

                       // Repair fragmented words from mixed text nodes, e.g. "Go d rej".
                      for (let i = 0; i < 3; i++) {
                        cleaned = cleaned.replace(/\b([A-Za-z]{2,})\s([A-Za-z])\s([A-Za-z]{2,})\b/g, '$1$2$3');
                      }

                      cleaned = cleaned.replace(/\s+/g, ' ').trim();
                      return cleaned;
                    };

                    const extractBestPrice = (cardText, meta) => {
                      if (!cardText) return 0;
                      const compact = String(cardText || '').replace(/\s+/g, ' ').trim();

                      const promoBundleMatch = compact.match(/₹\\s*([0-9]+(?:\\.[0-9]+)?)\\s*@\\s*₹\\s*[0-9]+(?:\\.[0-9]+)?\\s*on\\s*₹\\s*[0-9]+(?:\\.[0-9]+)?\\s*(?:bill|basket|cart|order(?:[-\\s]*value)?)/i);
                      if (promoBundleMatch && promoBundleMatch[1]) {
                        const promoSellingPrice = parseFloat(promoBundleMatch[1]);
                        if (Number.isFinite(promoSellingPrice) && promoSellingPrice > 0) {
                          return promoSellingPrice;
                        }
                      }

                      if (meta && meta.labeled_price > 0) {
                        return meta.labeled_price;
                      }

                      const rupeeRegex = /₹\s*([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]+)?)/g;
                      const candidates = [];
                      let match;

                      while ((match = rupeeRegex.exec(cardText)) !== null) {
                        const raw = (match[1] || '').replace(/,/g, '');
                        const value = parseFloat(raw);
                        if (!Number.isFinite(value) || value <= 0 || value > 99999) continue;

                        const around = cardText
                          .substring(Math.max(0, match.index - 28), match.index + match[0].length + 40)
                          .toLowerCase();
                        const before = cardText
                          .substring(Math.max(0, match.index - 16), match.index)
                          .toLowerCase();
                        const after = cardText
                          .substring(match.index + match[0].length, match.index + match[0].length + 32)
                          .toLowerCase();

                        let score = 0;
                        const isExplicitPrice = /(?:^|\b)(price|selling|sale|our\s+price)\b/.test(around);
                        const isMrp = /\bmrp\b|list\s*price|market\s*price/.test(around);
                        const isDiscount = /save|off|discount/.test(around);
                        const isPromoThreshold =
                          /bill|basket|cart|minimum\\s+order|minimum\\s+bill|order[-\\s]*value|on\\s+₹/.test(around) ||
                          /bill|basket|cart|minimum\\s+order|minimum\\s+bill|order[-\\s]*value/.test(after) ||
                          /@\\s*$/.test(before);

                        if (isExplicitPrice) score += 20;
                        if (isMrp) score -= 25;
                        if (isDiscount) score -= 18;
                        if (isPromoThreshold) score -= 40;

                        if (meta && meta.mrp > 0) {
                          if (Math.abs(value - meta.mrp) < 0.51 && !isExplicitPrice) score -= 12;
                          if (value > meta.mrp) score -= 30;
                        }

                        candidates.push({ value, score, pos: match.index, isExplicitPrice, isMrp, isDiscount, isPromoThreshold });
                      }

                      if (!candidates.length) return 0;

                      const cleanSellingCandidates = candidates.filter(
                        (c) => !c.isMrp && !c.isDiscount && !c.isPromoThreshold,
                      );

                      if (cleanSellingCandidates.length) {
                        cleanSellingCandidates.sort((a, b) => {
                          if (Number(b.isExplicitPrice) !== Number(a.isExplicitPrice)) {
                            return Number(b.isExplicitPrice) - Number(a.isExplicitPrice);
                          }
                          if (b.score !== a.score) return b.score - a.score;
                          if (meta && meta.mrp > 0) {
                            const aGap = Math.abs(meta.mrp - a.value);
                            const bGap = Math.abs(meta.mrp - b.value);
                            if (aGap !== bGap) return aGap - bGap;
                          }
                          if (a.value !== b.value) return a.value - b.value;
                          return a.pos - b.pos;
                        });

                        return cleanSellingCandidates[0].value;
                      }

                      // Fallback to best remaining candidate if all values are noisy.
                      candidates.sort((a, b) => {
                        if (b.score !== a.score) return b.score - a.score;
                        if (meta && meta.mrp > 0) {
                          const aGap = Math.abs(meta.mrp - a.value);
                          const bGap = Math.abs(meta.mrp - b.value);
                          if (aGap !== bGap) return aGap - bGap;
                        }
                        if (a.value !== b.value) return a.value - b.value;
                        return a.pos - b.pos;
                      });

                      return candidates[0].value;
                    };

                    // Try multiple strategies to find name
                    let name = card.querySelector('h3')?.textContent?.trim();
                    if (!name) name = card.querySelector('[qa="product-name"]')?.textContent?.trim();
                    if (!name) name = card.querySelector('.text-base')?.textContent?.trim();
                    if (!name) name = card.querySelector('a[href*="/pd/"]')?.textContent?.trim();

                    if (!name) {
                      const cardText = (card.textContent || '')
                        .replace(/\s+/g, ' ')
                        .replace(/\b(add|qty|view\s+more)\b/ig, ' ')
                        .replace(/₹\s*[0-9]+(?:\.[0-9]+)?/g, ' ')
                        .trim();
                      if (cardText.length > 8) {
                        name = cardText.split(/\b\d+\s*mins?\b/i)[0].trim();
                      }
                    }
                    const rawName = name || ''; // exact platform text before normalization
                    name = normalizeName(name);
                    
                    // Try multiple strategies to find price
                    let priceText = '';
                    let priceEl = card.querySelector('[qa="selling-price"]');
                    if (!priceEl) priceEl = card.querySelector('.Pricing___StyledLabel-sc-pldi2d-1');
                    if (!priceEl) priceEl = card.querySelector('[class*="Price"]');
                    if (!priceEl) priceEl = card.querySelector('span[class*="price"]');
                    
                    const cardTextForMeta = card.textContent || '';
                    const meta = extractMeta(cardTextForMeta);

                    const promoLower = String(cardTextForMeta || '').toLowerCase();
                    if (promoLower.includes('@') && promoLower.includes(' on ') && promoLower.includes('bill')) {
                      log('DEBUG: Promo card meta labeled_price=' + meta.labeled_price + ', mrp=' + meta.mrp + ', text="' + cardTextForMeta.substring(0, 120) + '"');
                    }

                    if (meta && meta.labeled_price > 0) {
                      priceText = String(meta.labeled_price);
                    }

                    if (!priceText && priceEl) {
                      const directPriceText = (priceEl.textContent || '').trim();
                      const directPriceMatch = directPriceText.match(/\bprice\b\s*:?\s*₹\s*([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]+)?)/i);
                      const directPromoMatch = /bill|basket|cart|minimum\\s+order|minimum\\s+bill|order[-\\s]*value/.test(directPriceText.toLowerCase());
                      if (directPriceMatch && directPriceMatch[1]) {
                        priceText = directPriceMatch[1];
                      } else if (!directPromoMatch) {
                        priceText = directPriceText;
                      }
                      if (index === 0) {
                        log('DEBUG: Found priceEl with text: "' + priceText + '"');
                      }
                    } else if (!priceText) {
                      // Fallback: extract price from card text with context-aware scoring.
                      const cardText = cardTextForMeta;
                      const bestPrice = extractBestPrice(cardText, meta);
                      if (bestPrice > 0) {
                        priceText = String(bestPrice);
                      }

                      if (index === 0) {
                        log('DEBUG: No priceEl, cardText: "' + cardText + '"');
                        log('DEBUG: Selected fallback price: ' + priceText);
                      }
                    }
                    
                    const price = priceText ? parseFloat(String(priceText).replace(/[^0-9.]/g, '')) : 0;
                    const imgEl = card.querySelector('img');
                    const image = imgEl ? imgEl.src : '';
                    
                    if (index === 0) {
                      log('First product - name: ' + (name || 'NOT FOUND') + ', priceText: "' + priceText + '", price: ' + price);
                    }
                    
                    if (name && price > 0) {
                      products.push({
                        product_name: name,
                        raw_product_name: rawName || name,
                        brand: card.querySelector('[qa="brand"]')?.textContent?.trim() || '',
                        price: price,
                        mrp: meta.mrp || price,
                        image_url: image,
                        product_url: (function() {
                          let url = card.querySelector('a')?.href || '';
                          if (url && url.startsWith('/')) {
                            url = 'https://www.bigbasket.com' + url;
                          }
                          return url;
                        })(),
                        in_stock: true,
                        weight: card.querySelector('[qa="size"]')?.textContent?.trim() || meta.quantity || '',
                        quantity: meta.quantity || '',
                        rating: meta.rating || 0,
                        rating_count: meta.rating_count || 0,
                        discount_percent: meta.discount_percent || ((meta.mrp && price > 0 && meta.mrp > price) ? Math.round(((meta.mrp - price) / meta.mrp) * 100) : 0),
                        discount_value: meta.discount_value || ((meta.mrp && price > 0 && meta.mrp > price) ? (meta.mrp - price) : 0),
                        raw_text: meta.raw_text || '',
                        platform: 'BigBasket'
                      });
                    }
                  } catch(e) {
                    if (index === 0) {
                      log('Error parsing first product: ' + e.message);
                    }
                  }
                });
                
                log('Attempt ' + attempt + ' parsed ' + products.length + ' products');

                if (products.length > 0) {
                  sendResults(products, true, null);
                  return;
                }

                if (attempt < 3) {
                  setTimeout(() => runParse(attempt + 1), 1500);
                  return;
                }

                sendResults([], false, 'No products parsed from BigBasket');
              };

              setTimeout(() => runParse(1), 3000);
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

            const extractMeta = (text) => {
              const raw = String(text || '');
              const compact = raw.replace(/\s+/g, ' ').trim();

              const quantity = (compact.match(/\b\d+(?:\.\d+)?\s*(?:kg|g|gm|grams?|ml|l|ltr|litre|litres|pcs?|pc|pack|pouch|bottle)\b/i) || [])[0] || '';

              const ratingMatch = compact.match(/\b([0-5](?:\.\d)?)\b\s*(?:\(([\d.,]+)\s*([kKmM]?)\)|⭐|stars?|\\/5)/i);
              const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
              let ratingCount = 0;
              if (ratingMatch && ratingMatch[2]) {
                const base = parseFloat(String(ratingMatch[2]).replace(/,/g, '')) || 0;
                const unit = String(ratingMatch[3] || '').toLowerCase();
                ratingCount = unit === 'k' ? Math.round(base * 1000) : unit === 'm' ? Math.round(base * 1000000) : Math.round(base);
              }

              const rupees = [];
              const rupeeRegex = /₹\s*([0-9]+(?:\.[0-9]+)?)/g;
              let rupeeMatch;
              while ((rupeeMatch = rupeeRegex.exec(compact)) !== null) {
                const parsed = parseFloat(rupeeMatch[1]);
                if (!Number.isNaN(parsed)) rupees.push(parsed);
              }
              const validRupees = rupees.filter((v) => Number.isFinite(v) && v > 0);

              const mrpMatch = compact.match(/\bMRP\b[^₹]*₹\s*([0-9]+(?:\.[0-9]+)?)/i);
              const mrp = mrpMatch ? parseFloat(mrpMatch[1]) : (validRupees.length > 1 ? Math.max(...validRupees) : 0);

              const discountPercentMatch = compact.match(/(\d{1,2})\s*%\s*OFF|OFF\s*(\d{1,2})\s*%/i);
              const discountPercent = discountPercentMatch ? parseInt(discountPercentMatch[1] || discountPercentMatch[2], 10) : 0;

              const discountValueMatch = compact.match(/(?:save|off)\s*₹\s*([0-9]+(?:\.[0-9]+)?)|₹\s*([0-9]+(?:\.[0-9]+)?)\s*OFF/i);
              const discountValue = discountValueMatch ? parseFloat(discountValueMatch[1] || discountValueMatch[2]) : 0;

              return {
                quantity,
                rating,
                rating_count: ratingCount,
                mrp,
                discount_percent: discountPercent,
                discount_value: discountValue,
                raw_text: compact,
              };
            };

            const extractBestPrice = (cardText, meta) => {
              if (!cardText) return 0;

              const rupeeRegex = /₹\s*([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]+)?)/g;
              const candidates = [];
              let match;

              while ((match = rupeeRegex.exec(cardText)) !== null) {
                const raw = String(match[1] || '').replace(/,/g, '');
                const value = parseFloat(raw);
                if (!Number.isFinite(value) || value <= 0 || value > 99999) continue;

                const around = cardText
                  .substring(Math.max(0, match.index - 28), match.index + match[0].length + 28)
                  .toLowerCase();
                const after = cardText
                  .substring(match.index + match[0].length, match.index + match[0].length + 10)
                  .toLowerCase();

                const isMrp = /\bmrp\b|list\s*price|market\s*price/.test(around);
                const isDiscount = /save|discount/.test(around) || /\boff\b/.test(around) || /^\s*off\b/.test(after);
                const hasSaleCue = /price|selling|sale|our\s*price|at\s*₹|only\s*₹|\badd\b|\bbuy\b|\bcart\b/.test(around);

                let score = 0;
                if (isMrp) score -= 40;
                if (isDiscount) score -= 45;
                if (hasSaleCue) score += 14;

                candidates.push({ value, score, pos: match.index, isMrp, isDiscount, hasSaleCue });
              }

              if (!candidates.length) return 0;

              // Strong rule: if we have MRP and discount amount, infer selling price first.
              const expectedFromDiscount =
                (meta && meta.mrp > 0 && meta.discount_value > 0)
                  ? Math.round((meta.mrp - meta.discount_value) * 100) / 100
                  : 0;

              if (expectedFromDiscount > 0) {
                const matchCandidate = candidates.find((c) => Math.abs(c.value - expectedFromDiscount) < 0.51);
                if (matchCandidate) {
                  return matchCandidate.value;
                }
                return expectedFromDiscount;
              }

              const sellingCandidates = candidates.filter((c) => !c.isMrp && !c.isDiscount);
              if (sellingCandidates.length) {
                sellingCandidates.sort((a, b) => {
                  if (Number(b.hasSaleCue) !== Number(a.hasSaleCue)) return Number(b.hasSaleCue) - Number(a.hasSaleCue);
                  if (a.value !== b.value) return a.value - b.value;
                  return a.pos - b.pos;
                });
                return sellingCandidates[0].value;
              }

              candidates.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                if (a.value !== b.value) return a.value - b.value;
                return a.pos - b.pos;
              });

              return candidates[0].value;
            };
            
            try {
              log('Starting Zepto parser...');
              log('URL: ' + window.location.href);
              log('Title: ' + document.title);

              const MAX_WAIT_MS = 15000;
              const POLL_MS = 1000;
              let pollElapsed = 0;
              let hasSentZepto = false;

              const doExtract = () => {
                if (hasSentZepto) return;
                hasSentZepto = true;
                log('Extracting products (' + (pollElapsed / 1000).toFixed(0) + 's elapsed)...');
                log('ReadyState: ' + document.readyState);
                log('Body children count: ' + document.body.children.length);

                // Debug: Check what's on the page
                const allLinks = document.querySelectorAll('a');
                const allDivs = document.querySelectorAll('div');
                const allImages = document.querySelectorAll('img');
                log('DEBUG: Total links=' + allLinks.length + ', divs=' + allDivs.length + ', images=' + allImages.length);

                // Log first 5 links and first script id to aid debugging
                const linkSample = Array.from(allLinks).slice(0, 5).map(a => a.href).join(' | ');
                log('DEBUG: Link sample: ' + linkSample);
                const nextApp = document.querySelector('#__next, #root, [data-reactroot]');
                log('DEBUG: App root children: ' + (nextApp ? nextApp.children.length : 'none'));

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
                    let rawName = ''; // exact platform text before any transforms
                    const heading = card.querySelector('h4, h3, h2');
                    if (heading && heading.textContent) {
                      rawName = heading.textContent.trim();
                      name = rawName;
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
                    const meta = extractMeta(cardText);
                    
                    // Try to find selling price from rupee candidates with context-aware scoring.
                    let price;
                    const bestPrice = extractBestPrice(cardText, meta);
                    if (bestPrice > 0) {
                      price = String(bestPrice);
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
                    
                    if (name && price && parseFloat(price) > 0) {
                      const linkEl = card.querySelector('a');
                      let productUrl = card.href || (linkEl ? linkEl.href : '') || '';
                      if (productUrl && productUrl.startsWith('/')) {
                        productUrl = 'https://www.zepto.com' + productUrl;
                      }
                      const parsedPrice = parseFloat(price);
                      
                      products.push({
                        product_name: name.substring(0, 100),
                        raw_product_name: (rawName || name).substring(0, 100),
                        brand: '',
                        price: parsedPrice,
                        mrp: meta.mrp || parsedPrice,
                        image_url: imgEl ? imgEl.src : '',
                        product_url: productUrl,
                        in_stock: true,
                        weight: meta.quantity || '',
                        quantity: meta.quantity || '',
                        rating: meta.rating || 0,
                        rating_count: meta.rating_count || 0,
                        discount_percent: meta.discount_percent || ((meta.mrp && parsedPrice > 0 && meta.mrp > parsedPrice) ? Math.round(((meta.mrp - parsedPrice) / meta.mrp) * 100) : 0),
                        discount_value: meta.discount_value || ((meta.mrp && parsedPrice > 0 && meta.mrp > parsedPrice) ? (meta.mrp - parsedPrice) : 0),
                        raw_text: meta.raw_text || '',
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
                        if (typeof name !== 'string' || name.trim().length < 3) return;

                        // Zepto specific price logic: sellingPrice/discountedSellingPrice are final prices in paise.
                        const rawSelling = obj?.sellingPrice ?? obj?.discountedSellingPrice ?? obj?.selling_price ?? obj?.finalPrice ?? obj?.offerPrice ?? obj?.price;
                        const rawMrp = obj?.mrp ?? obj?.original_price ?? obj?.originalPrice;
                        const rawDiscount = obj?.discountAmount ?? 0;

                        const price = toPrice(rawSelling);
                        let mrp = toPrice(rawMrp);
                        
                        // If MRP is missing or 0, but we have a discount, calculate it.
                        if (mrp <= price && rawDiscount > 0) {
                          mrp = toPrice(rawSelling + rawDiscount);
                        }
                        
                        if (!price) return;
                        const key = name.trim().toLowerCase() + '|' + price;
                        if (seen.has(key)) return;
                        seen.add(key);
                        products.push({
                          product_name: name.trim(),
                          brand: '',
                          price,
                          mrp: mrp > price ? mrp : price,
                          image_url: obj?.image_url || obj?.imageUrl || obj?.image || '',
                          product_url: (function() {
                            let url = obj?.deep_link || obj?.url || '';
                            if (url && url.startsWith('/')) {
                              url = 'https://www.zepto.com' + url;
                            }
                            return url;
                          })(),
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
              };

              const poll = () => {
                const productLinks = document.querySelectorAll('a[href*="/pn/"], a[href*="/product/"]');
                const divCount = document.querySelectorAll('div').length;
                const linkCount = document.querySelectorAll('a').length;
                log('Poll @' + (pollElapsed / 1000).toFixed(0) + 's: productLinks=' + productLinks.length + ', divs=' + divCount + ', links=' + linkCount);

                if (productLinks.length > 0 || pollElapsed >= MAX_WAIT_MS) {
                  doExtract();
                } else {
                  pollElapsed += POLL_MS;
                  setTimeout(poll, POLL_MS);
                }
              };

              setTimeout(poll, POLL_MS);
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
