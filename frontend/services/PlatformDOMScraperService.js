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
                          var __tokenBundle = ${JSON.stringify(tokens || {})};
                          var __send = window.__rnMsg || (window.ReactNativeWebView && window.ReactNativeWebView.postMessage.bind(window.ReactNativeWebView));
                          if (!__send && window.ReactNativeWebView) __send = window.ReactNativeWebView.postMessage.bind(window.ReactNativeWebView);
                          if (!__send) return;

                          function log(msg) {
                            try { __send(JSON.stringify({ type: 'LOG', message: '[Instamart-DOM] ' + msg })); } catch (ignored) {}
                          }

                          function sendResults(products, error) {
                            try {
                              __send(JSON.stringify({
                                type: 'SEARCH_RESULTS',
                                platform: 'Instamart',
                                sessionId: window.__COMPAREX_SESSION_ID__ || null,
                                products: products || [],
                                success: !!(products && products.length > 0),
                                error: error || null
                              }));
                            } catch (ignored) {}
                          }

                          function syncTokens(reason) {
                            try {
                              __send(JSON.stringify({
                                type: 'SYNC_TOKENS',
                                platform: 'Instamart',
                                payload: {
                                  cookie: document.cookie || (__tokenBundle && __tokenBundle.cookie) || '',
                                  authHeaders:
                                    localStorage.swiggy_auth_headers ||
                                    localStorage.auth_headers ||
                                    (__tokenBundle && __tokenBundle.authHeaders) ||
                                    '',
                                  swiggyUserInfo:
                                    localStorage.swiggy_user_info ||
                                    localStorage.user_info ||
                                    (__tokenBundle && __tokenBundle.swiggyUserInfo) ||
                                    '',
                                  syncReason: reason || 'dom',
                                  syncUrl: location.href
                                }
                              }));
                            } catch (ignored) {}
                          }

                          function toPrice(raw) {
                            var n = typeof raw === 'string' ? parseFloat(String(raw).replace(/[^0-9.]/g, '')) : Number(raw);
                            if (!isFinite(n) || n <= 0) return 0;
                            if (n > 9999 && n <= 999999) return Math.round(n / 100);
                            if (n > 0 && n <= 9999) return Math.round(n);
                            return 0;
                          }

                          function collectFromObject(root) {
                            var products = [];
                            var seen = Object.create(null);

                            function pickName(obj) {
                              var keys = ['display_name', 'name', 'displayName', 'product_name', 'title', 'item_name'];
                              for (var i = 0; i < keys.length; i++) {
                                var value = obj && obj[keys[i]];
                                if (typeof value === 'string' && value.trim().length > 2) return value.trim();
                              }
                              return '';
                            }

                            function pickPrice(obj) {
                              var keys = ['price', 'final_price', 'finalPrice', 'offer_price', 'offerPrice', 'selling_price', 'sellingPrice', 'sp', 'mrp'];
                              for (var i = 0; i < keys.length; i++) {
                                if (obj && obj[keys[i]] != null) return toPrice(obj[keys[i]]);
                              }
                              return 0;
                            }

                            function walk(node, depth) {
                              if (!node || depth > 10) return;
                              if (Array.isArray(node)) {
                                for (var i = 0; i < node.length; i++) walk(node[i], depth + 1);
                                return;
                              }
                              if (typeof node !== 'object') return;

                              var name = pickName(node);
                              var price = pickPrice(node);
                              if (name && price) {
                                var key = name.toLowerCase() + '|' + price;
                                if (!seen[key]) {
                                  seen[key] = 1;
                                  var itemId = node.product_id || node.productId || node.id || '';
                                  products.push({
                                    product_name: name,
                                    brand: node.brand || node.brand_name || '',
                                    price: price,
                                    mrp: toPrice(node.mrp) || price,
                                    image_url: node.image_url || node.imageUrl || node.image || '',
                                    product_url: itemId ? ('https://www.swiggy.com/instamart/item/' + encodeURIComponent(String(itemId))) : (node.url || node.deep_link || ''),
                                    in_stock: !(node.out_of_stock === true || node.in_stock === false),
                                    weight: node.quantity || node.unit || node.weight || '',
                                    platform: 'Instamart'
                                  });
                                }
                              }

                              var keys = Object.keys(node);
                              for (var j = 0; j < keys.length; j++) {
                                var value = node[keys[j]];
                                if (typeof value === 'string' && value.length > 30000) continue;
                                walk(value, depth + 1);
                              }
                            }

                            walk(root, 0);
                            return products;
                          }

                          function collectFromDom() {
                            var selector = [
                              'a[href*="/instamart/item/"]',
                              '[data-testid*="item"]',
                              '[data-testid*="product"]',
                              '[class*="ProductCard"]',
                              '[class*="product-card"]',
                              '[class*="item-card"]',
                              '[aria-label*="ADD"]',
                              'button[aria-label*="ADD"]'
                            ].join(',');

                            var nodes = Array.from(document.querySelectorAll(selector));
                            log('DOM candidates=' + nodes.length);

                            var products = [];
                            var seen = Object.create(null);

                            nodes.forEach(function(node) {
                              var text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
                              if (!text || text.length < 10) return;

                              var titleNode = node.querySelector('h1,h2,h3,h4,[class*="name"],[class*="title"]');
                              var name = titleNode ? (titleNode.textContent || '').trim() : '';
                              if (!name) {
                                name = text
                                  .replace(/₹\s*\d+(?:\.\d+)?/g, ' ')
                                  .replace(/\bADD\b/gi, ' ')
                                  .replace(/\b\d+\s*mins?\b/gi, ' ')
                                  .replace(/\s+/g, ' ')
                                  .trim()
                                  .split(' ')
                                  .slice(0, 12)
                                  .join(' ');
                              }

                              var priceMatches = text.match(/₹\s*([0-9]+(?:\.[0-9]+)?)/g) || [];
                              var price = 0;
                              if (priceMatches.length > 0) {
                                price = priceMatches
                                  .map(function(entry) {
                                    return parseFloat(String(entry).replace(/[^0-9.]/g, ''));
                                  })
                                  .filter(function(value) {
                                    return isFinite(value) && value >= 5 && value <= 9999;
                                  })
                                  .sort(function(a, b) {
                                    return a - b;
                                  })[0] || 0;
                              }

                              if (!name || name.length < 3 || !price) return;

                              var key = name.toLowerCase() + '|' + price;
                              if (seen[key]) return;
                              seen[key] = 1;

                              var imgNode = node.querySelector('img');
                              var deepLink =
                                node.href ||
                                (node.closest && node.closest('a') && node.closest('a').href) ||
                                (node.querySelector && node.querySelector('a') && node.querySelector('a').href) ||
                                '';

                              products.push({
                                product_name: name,
                                brand: '',
                                price: Math.round(price),
                                mrp: Math.round(price),
                                image_url: imgNode ? (imgNode.currentSrc || imgNode.src || '') : '',
                                product_url: deepLink,
                                in_stock: text.toLowerCase().indexOf('out of stock') === -1,
                                weight: '',
                                platform: 'Instamart'
                              });
                            });

                            return products;
                          }

                          function runExtraction(reason) {
                            syncTokens(reason || 'run');

                            try {
                              var preloaded = window.__PRELOADED_STATE__ || window.INITIAL_STATE || null;
                              if (preloaded && typeof preloaded === 'object') {
                                var fromPreload = collectFromObject(preloaded);
                                log('state parser found ' + fromPreload.length + ' products');
                                if (fromPreload.length > 0) {
                                  sendResults(fromPreload, null);
                                  return true;
                                }
                              }
                            } catch (e) {
                              log('state parser error: ' + e.message);
                            }

                            try {
                              var nextDataNode = document.querySelector('script#__NEXT_DATA__');
                              var nextDataText = nextDataNode ? nextDataNode.textContent : '';
                              if (nextDataText && nextDataText.trim().charAt(0) === '{') {
                                var parsedNext = JSON.parse(nextDataText);
                                var nextState =
                                  (parsedNext && parsedNext.props && parsedNext.props.pageProps && (parsedNext.props.pageProps.initialState || parsedNext.props.pageProps.initialData)) ||
                                  parsedNext;
                                var fromNext = collectFromObject(nextState);
                                log('__NEXT_DATA__ parser found ' + fromNext.length + ' products');
                                if (fromNext.length > 0) {
                                  sendResults(fromNext, null);
                                  return true;
                                }
                              }
                            } catch (e) {
                              log('__NEXT_DATA__ parser error: ' + e.message);
                            }

                            try {
                              var fromDom = collectFromDom();
                              log('DOM parser found ' + fromDom.length + ' products');
                              if (fromDom.length > 0) {
                                sendResults(fromDom, null);
                                return true;
                              }
                            } catch (e) {
                              log('DOM parser error: ' + e.message);
                            }

                            return false;
                          }

                          try {
                            log('Script executing. readyState=' + document.readyState + ' url=' + location.href);

                            var done = false;
                            function attempt(reason) {
                              if (done) return;
                              if (runExtraction(reason)) {
                                done = true;
                              }
                            }

                            setTimeout(function(){ attempt('attempt-1'); }, 1200);
                            setTimeout(function(){ attempt('attempt-2'); }, 3200);
                            setTimeout(function(){ attempt('attempt-3'); }, 6200);
                            setTimeout(function(){ if (!done) sendResults([], 'Instamart DOM parser returned 0 products'); }, 9200);
                          } catch (e) {
                            sendResults([], 'Fatal: ' + e.message);
                          }
                  if (isFinite(qty) && qty <= 0) return false;
                }
                return true;
              }

              // ---- parseAndSend: walk a JS object tree for products ----
              function collectProducts(result) {
                var products = [];
                var seen = Object.create(null);

                function getString(obj) {
                  var keys = ['name','display_name','displayName','product_name','title','item_name'];
                  for (var i=0;i<keys.length;i++) { if (obj && typeof obj[keys[i]]==='string' && obj[keys[i]].length>2) return obj[keys[i]]; }
                  return '';
                }
                function getRawPrice(obj) {
                  var keys = ['price','finalPrice','final_price','offerPrice','offer_price','selling_price','sellingPrice','display_price','sp','mrp'];
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
                    brand: obj.brand_name || obj.brand || '',
                    price: price,
                    mrp: toPrice(obj.mrp) || price,
                    image_url: imageFrom(obj),
                    product_url: deepLinkFrom(obj),
                    in_stock: isInStock(obj),
                    weight: obj.quantity || obj.unit || obj.weight || '',
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
                    var hasName = ('name' in node)||('display_name' in node)||('displayName' in node)||('title' in node)||('item_name' in node);
                    var hasPrice = ('price' in node)||('mrp' in node)||('finalPrice' in node)||('offerPrice' in node)||('selling_price' in node)||('offer_price' in node)||('display_price' in node)||('sp' in node);
                  if (hasName && hasPrice) tryAdd(node);
                  var keys = Object.keys(node);
                  for (var i=0;i<keys.length;i++) {
                    var v = node[keys[i]];
                    if (typeof v === 'string' && v.length > 30000) continue;
                    walk(v, depth+1);
                  }
                }

                walk(result, 0);
                  return products;
                }

                function parseAndSend(result, sourceLabel) {
                  var products = collectProducts(result);
                  log((sourceLabel || 'parseAndSend') + ' found ' + products.length + ' products');
                if (products.length === 0) {
                  log('Top-level keys: ' + JSON.stringify(Object.keys(result || {}).slice(0, 10)));
                }
                sendResults(products, products.length === 0 ? 'parseAndSend: 0 products' : null);
              }

                async function tryApiFetch() {
                  var ctx = getSearchContext();
                  var searchQuery = ctx.query || '';
                  if (!searchQuery) {
                    log('API strategy skipped: missing query in URL');
                    return false;
                  }

                  var headers = buildAuthHeaders();
                  var variants = [
                    {
                      id: 'search_v2_post',
                      url: 'https://www.swiggy.com/api/instamart/search/v2?lat=' + encodeURIComponent(ctx.lat) + '&lng=' + encodeURIComponent(ctx.lng),
                      options: {
                        method: 'POST',
                        credentials: 'include',
                        headers: Object.assign({}, headers, {
                          'content-type': 'application/json'
                        }),
                        body: JSON.stringify({
                          facets: [],
                          sortAttribute: '',
                          query: searchQuery,
                          search_results_offset: '0',
                          page_type: 'INSTAMART_SEARCH_PAGE',
                          is_pre_search_tag: false
                        })
                      }
                    },
                    {
                      id: 'search_query_get',
                      url: 'https://www.swiggy.com/api/instamart/search?lat=' + encodeURIComponent(ctx.lat) + '&lng=' + encodeURIComponent(ctx.lng) + '&query=' + encodeURIComponent(searchQuery) + '&pageType=INSTAMART_SEARCH',
                      options: {
                        method: 'GET',
                        credentials: 'include',
                        headers: headers
                      }
                    },
                    {
                      id: 'search_str_get',
                      url: 'https://www.swiggy.com/api/instamart/search?lat=' + encodeURIComponent(ctx.lat) + '&lng=' + encodeURIComponent(ctx.lng) + '&str=' + encodeURIComponent(searchQuery),
                      options: {
                        method: 'GET',
                        credentials: 'include',
                        headers: headers
                      }
                    }
                  ];

                  for (var i = 0; i < variants.length; i++) {
                    var variant = variants[i];
                    try {
                      log('API strategy trying ' + variant.id + '...');
                      var resp = await fetch(variant.url, variant.options);
                      var ct = (resp.headers && resp.headers.get && resp.headers.get('content-type')) || '';
                      log('API ' + variant.id + ' status=' + resp.status + ' ct=' + ct);
                      if (!resp.ok) {
                        var failText = await resp.text().catch(function(){ return ''; });
                        log('API ' + variant.id + ' failed body=' + (failText || '').slice(0, 120));
                        continue;
                      }

                      if (ct && ct.indexOf('application/json') === -1) {
                        var nonJson = await resp.text().catch(function(){ return ''; });
                        log('API ' + variant.id + ' non-json body=' + (nonJson || '').slice(0, 120));
                        continue;
                      }

                      var json = await resp.json();
                      var products = collectProducts(json);
                      log('API ' + variant.id + ' extracted ' + products.length + ' products');
                      if (products.length > 0) {
                        sendResults(products, null);
                        return true;
                      }
                    } catch (e) {
                      log('API ' + variant.id + ' error: ' + e.message);
                    }
                  }

                  log('API strategy exhausted without products');
                  return false;
                }

              // ---- runExtraction: try JSON state first, then DOM ----
                async function runExtraction(attempt) {
                log('Extraction attempt ' + attempt + ', readyState=' + document.readyState);

                  if (attempt === 1) {
                    var apiWorked = await tryApiFetch();
                    if (apiWorked) {
                      return;
                    }
                  }

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

                // Strategy 2b: scan JSON script tags
                try {
                  var jsonScripts = Array.from(document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]'));
                  for (var jsIndex = 0; jsIndex < jsonScripts.length; jsIndex++) {
                    var scriptText = jsonScripts[jsIndex] && jsonScripts[jsIndex].textContent;
                    if (!scriptText || scriptText.length < 20 || scriptText.length > 3000000) continue;
                    if (scriptText.indexOf('display_name') === -1 && scriptText.indexOf('product_id') === -1) continue;
                    var parsedScript = safeJsonParse(scriptText);
                    if (!parsedScript) continue;
                    var scriptProducts = collectProducts(parsedScript);
                    if (scriptProducts.length > 0) {
                      log('JSON script strategy found ' + scriptProducts.length + ' products');
                      sendResults(scriptProducts, null);
                      return;
                    }
                  }
                } catch(e) { log('JSON script scan error: ' + e.message); }

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
                    'a[href*="/instamart/item/"], [data-testid="item-card"], [data-testid*="product"], [data-testid*="Item"], [aria-label*="ADD"], button[aria-label*="ADD"], [class*="ProductCard"], [class*="productCard"], [class*="ItemCard"], [class*="item-card"], [class*="ProductListItem"]'
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
                      var normalizedText = rawText
                        .replace(/\b\d+\s*mins?\b/gi, ' ')
                        .replace(/\bADD\b/gi, ' ')
                        .replace(/₹\s*\d+(?:\.\d+)?/g, ' ')
                        .replace(/\b\d+%\s*off\b/gi, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                      var parts = normalizedText.split(/\s{2,}|\n/).filter(Boolean);
                      name = parts.find(function(part) {
                        return part.length >= 4 && part.length <= 120 && /[a-zA-Z]/.test(part);
                      }) || normalizedText.split(/\s+/).slice(0, 8).join(' ');
                    }
                    var allPrices = rawText.match(/₹\s*([0-9]+(?:\.[0-9]+)?)/g) || [];
                    var price5 = 0;
                    if (allPrices.length > 0) {
                      price5 = allPrices
                        .map(function(entry) { return Math.round(parseFloat(String(entry).replace(/[^0-9.]/g, ''))); })
                        .filter(function(value) { return value >= 5 && value <= 9999; })
                        .sort(function(a, b) { return a - b; })[0] || 0;
                    }
                    if (!name || !price5) return;
                    var key5 = name.toLowerCase()+'|'+price5;
                    if (seen5[key5]) return;
                    seen5[key5] = 1;
                    var imgNode = node.querySelector('img');
                    products5.push({
                      product_name:name,
                      price:price5,
                      mrp:price5,
                      image_url: imgNode ? (imgNode.currentSrc || imgNode.src || '') : '',
                      product_url: node.href || (node.querySelector && node.querySelector('a') && node.querySelector('a').href) || '',
                      platform:'Instamart',
                      in_stock:!rawText.toLowerCase().includes('out of stock')
                    });
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

              // Start extraction after 1s - page is already hydrated since we warmed up on homepage first
              setTimeout(function(){ runExtraction(1); }, 1000);

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
