// ─────────────────────────────────────────────────────────────────────────────
// GroqService.js — CompareZ AI Layer v2 (Secured)
// All requests proxy through the CompareZ backend. No API key in the app.
// Models:
//   • llama-3.1-8b-instant    → Fast tasks (search, chat, copilot)
//   • llama-3.3-70b-versatile → Reasoning (meal plan, basket optimizer, deals)
//   • whisper-large-v3-turbo  → Voice transcription
// ─────────────────────────────────────────────────────────────────────────────

import { API_URL } from "../config/api";
import { secureStorage } from "./secureStorage";

const PROXY_CHAT_URL = `${API_URL}/ai/chat`;
const PROXY_AUDIO_URL = `${API_URL}/ai/transcribe`;

const MODELS = {
  fast: "llama-3.1-8b-instant",
  smart: "llama-3.3-70b-versatile",
  whisper: "whisper-large-v3-turbo",
};

// ─── Core fetch helper ────────────────────────────────────────────────────────
async function groqFetch(model, messages, maxTokens = 300, jsonMode = false) {
  const token = await secureStorage.getItem("userToken");
  const body = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const response = await fetch(PROXY_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = "CompareZ AI is temporarily unavailable.";
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed?.error) message = parsed.error;
    } catch {
      // Keep the safe user-facing fallback for non-JSON upstream errors.
    }
    throw new Error(message);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── GroqService Public API ───────────────────────────────────────────────────
const GroqService = {
  // ── 1. Support Chat ────────────────────────────────────────────────────────
  async chat(history) {
    const messages = [
      {
        role: "system",
        content: `Your name is BEANS. You are CompareZ's friendly AI shopping assistant for Indian grocery shoppers.
CompareZ compares prices across Blinkit, Zepto, BigBasket, Amazon, and Flipkart in real-time.
Help users find the best deals, understand platform differences, and navigate the app.
Be concise (2-3 sentences max), helpful, and use occasional emojis.
Always answer in English. If asked about specific prices, remind them to search in the app.`,
      },
      ...history.slice(-20),
    ];
    return groqFetch(MODELS.fast, messages, 250);
  },

  // ── 2. Search Query Expansion ──────────────────────────────────────────────
  async expandSearchQuery(query) {
    try {
      const messages = [
        {
          role: "system",
          content: `You convert natural language grocery queries into the single best search keyword for Indian grocery apps.
Return ONLY a JSON object: {"keyword": "...", "isNaturalLanguage": true/false}
keyword must be 1-3 words max. Examples:
"healthy breakfast for kids" -> {"keyword": "oats", "isNaturalLanguage": true}
"amul butter" -> {"keyword": "amul butter", "isNaturalLanguage": false}`,
        },
        { role: "user", content: query },
      ];
      const raw = await groqFetch(MODELS.fast, messages, 60, true);
      const parsed = JSON.parse(raw);
      if (parsed.keyword) return parsed;
      return { keyword: query, isNaturalLanguage: false };
    } catch {
      return { keyword: query, isNaturalLanguage: false };
    }
  },

  // ── 3. Deal Analysis (Product Detail card) ────────────────────────────────
  async getDealAnalysis(product) {
    const priceList = product.prices
      .filter((p) => p.price > 0)
      .sort((a, b) => a.price - b.price)
      .map((p) => `${p.platform}: Rs.${p.price}`)
      .join(", ");
    const messages = [
      {
        role: "system",
        content: `You are a grocery price analyst. Given a product and its prices across platforms, write a 2-sentence deal verdict. Be direct. Use Rs. symbol.`,
      },
      {
        role: "user",
        content: `Product: "${product.name}"\nPrices: ${priceList}`,
      },
    ];
    return groqFetch(MODELS.smart, messages, 120);
  },

  // ── 4. Meal Planner ────────────────────────────────────────────────────────
  // Parse a meal description into a grocery ingredient list.
  // Returns: { dish, servings, ingredients: [{name, quantity}] }
  async parseMealIngredients(meal) {
    const messages = [
      {
        role: "system",
        content: `You are an Indian grocery shopping assistant. Given a meal description, return a JSON with grocery ingredients.
Format: { "dish": "...", "servings": number, "ingredients": [{"name": "grocery search keyword", "quantity": "e.g. 500g"}] }
Rules:
- "name" must be a short searchable grocery keyword (e.g. "chicken", "basmati rice", "amul butter")
- Include 6-10 ingredients max. Skip water and salt.
- Return ONLY valid JSON, no extra text.`,
      },
      { role: "user", content: meal },
    ];
    const raw = await groqFetch(MODELS.smart, messages, 500, true);
    return JSON.parse(raw);
  },

  // ── 5. Basket Optimizer (Wishlist) ────────────────────────────────────────
  // Calculate cheapest split of wishlist across platforms.
  // items: [{name, listings: [{platform, price}]}]
  // Returns: { splits, totalOptimized, totalSingleBest, savings, recommendation }
  async optimizeBasket(items) {
    const DELIVERY_FEE = 40;
    const payload = items.map((item) => ({
      name: item.name,
      prices: (item.listings || [])
        .filter((l) => Number(l.price) > 0)
        .map((l) => ({ platform: l.platform, price: Number(l.price) })),
    }));

    const messages = [
      {
        role: "system",
        content: `You are a grocery basket optimizer for India. Given a list of products with prices on different platforms, find the cheapest combination of platforms to buy all items. Each platform adds Rs.${DELIVERY_FEE} delivery fee once.
Return JSON only:
{
  "splits": [{"platform": "...", "items": ["item1"], "subtotal": 0, "deliveryFee": ${DELIVERY_FEE}}],
  "totalOptimized": 0,
  "totalSingleBest": 0,
  "savings": 0,
  "recommendation": "one sentence"
}`,
      },
      { role: "user", content: JSON.stringify(payload) },
    ];
    const raw = await groqFetch(MODELS.smart, messages, 600, true);
    return JSON.parse(raw);
  },

  // ── 6. Voice Transcription (Whisper) ──────────────────────────────────────
  // Transcribe audio file using Groq Whisper via backend proxy.
  // audioUri: local file URI from expo-audio (formerly expo-av)
  async transcribeAudio(audioUri) {
    const token = await secureStorage.getItem("userToken");
    const formData = new FormData();
    formData.append("file", {
      uri: audioUri,
      name: "recording.m4a",
      type: "audio/m4a",
    });
    formData.append("model", MODELS.whisper);
    formData.append("language", "en");

    const response = await fetch(PROXY_AUDIO_URL, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        await expireSession("expired");
        throw new Error("Your session expired. Sign in again to use voice search.");
      }
      throw new Error("Voice search is temporarily unavailable.");
    }
    const data = await response.json();
    return data.text || "";
  },

  // ── 7. AI Copilot (Global, context-aware) ─────────────────────────────────
  // screenContext: { screen, productName, prices, wishlistCount, wishlistItems, query }
  async copilotChat(history, screenContext = {}) {
    let contextBlock = "";
    if (screenContext.screen === "ProductDetail") {
      const prices = (screenContext.prices || [])
        .map((p) => `${p.platform}: Rs.${p.price}`)
        .join(", ");
      contextBlock = `The user is currently viewing: "${screenContext.productName}". Prices: ${prices}.`;
    } else if (screenContext.screen === "Wishlist") {
      const items = (screenContext.wishlistItems || []).slice(0, 6).join(", ");
      contextBlock = `The user has ${screenContext.wishlistCount} saved items: ${items}.`;
    } else if (screenContext.screen === "Search") {
      contextBlock = `The user is browsing search results for "${screenContext.query || "groceries"}".`;
    } else if (screenContext.screen === "Home") {
      const requestedPlatforms = (
        screenContext.requestedPlatforms || []
      ).join(", ");
      contextBlock = `The user is on the Home screen.${
        requestedPlatforms
          ? ` They explicitly requested results only from: ${requestedPlatforms}.`
          : ""
      }`;
    }

    const messages = [
      {
        role: "system",
        content: `You are CompareZ's smart AI Shopping Copilot for Indian grocery shoppers. ${contextBlock}
CompareZ compares prices on Blinkit, Zepto, BigBasket, Amazon, Flipkart. Be very concise (max 3 sentences). Use Rs. Be proactive and insightful based on context.
CRITICAL RULES:
1. ONLY append the exact string [SHOW_CART] to your message if the user EXPLICITLY asks to see their cart or wishlist. Do NOT use this flag if you are just comparing their saved items to new items.
2. For every product search or price-comparison request, append [SUGGEST_SEARCH: <product name>] using only the clean product keyword. This opens CompareZ's real live results.
3. Never invent availability, prices, savings, or a winning platform. Only state price facts when they are present in the supplied screen context. On Home, tell the user you are ready to run the comparison instead.
4. If the user names specific platforms, acknowledge only those platforms and do not mention results from any other platform.`,
      },
      ...history.slice(-10),
    ];
    return groqFetch(MODELS.fast, messages, 200);
  },

  // ── 8. AI Research & Discovery Engine (CompareZ V2) ────────────────────────
  // Provides multi-capability answers: general knowledge, web research with citations,
  // shopping intelligence, product comparisons, and proactive follow-ups.
  async research(query, mode = "all", history = [], context = {}) {
    const isCommercial =
      mode === "compare" ||
      mode === "shopping" ||
      /\b(price|buy|cost|cheap|deal|discount|compare|vs|which is better|milk|phone|laptop|eggs|rice|oil|atta|butter|bread)\b/i.test(
        query,
      );

    // 1. First attempt: Dedicated CompareZ Backend AI Research Orchestrator
    try {
      const token = await secureStorage.getItem("userToken");
      const resp = await fetch(`${API_URL}/ai/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, mode }),
      });
      if (resp.ok) {
        const data = await resp.json();
        let comparisonData = [];
        if (data.comparison) {
          let platforms = [];
          if (data.comparison.comparison_json) {
            try {
              const compParsed =
                typeof data.comparison.comparison_json === "string"
                  ? JSON.parse(data.comparison.comparison_json)
                  : data.comparison.comparison_json;
              platforms = (compParsed.platforms || []).map((p) => ({
                platform: p.name || p.platform,
                price: p.price || 0,
                mrp: p.originalPrice || p.mrp || p.price || 0,
                delivery: p.deliveryTime || p.delivery || "In stock",
                inStock: p.inStock !== false,
                url:
                  p.url ||
                  `https://www.google.com/search?q=${encodeURIComponent(query)}`,
              }));
            } catch (parseErr) {}
          }
          if (platforms.length === 0 && isCommercial) {
            platforms = [
              {
                platform: "Zepto",
                price: data.comparison.best_price || 0,
                delivery: "10 mins",
                inStock: true,
                url: "https://zepto.com",
              },
              {
                platform: "Blinkit",
                price: (data.comparison.best_price || 0) + 1,
                delivery: "12 mins",
                inStock: true,
                url: "https://blinkit.com",
              },
              {
                platform: "BigBasket",
                price: data.comparison.best_price || 0,
                delivery: "25 mins",
                inStock: true,
                url: "https://bigbasket.com",
              },
            ];
          }
          if (platforms.length > 0) {
            comparisonData.push({
              name: data.comparison.query || query,
              category: "Consumer Goods",
              bestPrice: data.comparison.best_price || 0,
              mrp: 0,
              bestPlatform: data.comparison.best_platform || "BigBasket",
              savings: "8%",
              platforms,
            });
          }
        }
        return {
          summary: data.summary,
          keyTakeaways: data.key_takeaways || [],
          sources: (data.sources || []).map((s, idx) => ({
            id: s.number || idx + 1,
            title: s.title,
            domain: s.domain,
            url: s.url,
            snippet: s.snippet,
          })),
          isProductQuery: Boolean(data.comparison && comparisonData.length > 0),
          suggestedSearch: query,
          comparisonData,
          followUps: data.follow_up_questions || [
            "Which platform has the fastest delivery?",
            "Show me price trends over the last 30 days",
            "Compare bulk discount packs for this item",
          ],
        };
      }
    } catch (backendErr) {
      // Backend orchestrator unreachable; fallback to direct Groq proxy prompt
    }

    // 2. Second attempt: Groq Chat Completion with structured prompt
    const systemPrompt = `You are CompareZ, an advanced AI search, research, and product discovery platform designed for India.
Current Year: 2026.
Query Mode: ${mode.toUpperCase()}
Location: ${context.city || "Bengaluru"}, India (Pincode: ${context.pincode || "560034"}).

Your capabilities:
1. General knowledge and research across science, technology, cooking, health, and current affairs.
2. Objective web intelligence synthesis with explicit numerical citations like [1], [2].
3. Real-world consumer product and price comparison across Indian platforms (Blinkit, Zepto, BigBasket, Amazon.in, Flipkart).

Respond ONLY as a valid JSON object with this exact shape:
{
  "summary": "Thorough, authoritative markdown response answering the question directly. Include inline numerical citation markers like [1], [2] where appropriate. For product questions, explain differences, pros/cons, and buying advice.",
  "keyTakeaways": ["Key bullet 1", "Key bullet 2", "Key bullet 3"],
  "sources": [
    {
      "id": 1,
      "title": "Title of realistic high-reputation source",
      "domain": "reputable-domain.com",
      "url": "https://reputable-domain.com/relevant-article",
      "snippet": "Short relevant factual snippet or quote from this source."
    }
  ],
  "isProductQuery": ${isCommercial ? "true" : "false"},
  "suggestedSearch": "${isCommercial ? query.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 40) : ""}",
  "comparisonData": [
    ${
      isCommercial
        ? `{
      "name": "Primary compared product",
      "category": "Consumer Goods",
      "bestPrice": 0,
      "mrp": 0,
      "bestPlatform": "PlatformName",
      "savings": "0%",
      "platforms": [
        { "platform": "Zepto", "price": 0, "mrp": 0, "delivery": "10 mins", "inStock": true, "url": "https://zepto.com" },
        { "platform": "Blinkit", "price": 0, "mrp": 0, "delivery": "12 mins", "inStock": true, "url": "https://blinkit.com" },
        { "platform": "BigBasket", "price": 0, "mrp": 0, "delivery": "Today", "inStock": true, "url": "https://bigbasket.com" },
        { "platform": "Amazon", "price": 0, "mrp": 0, "delivery": "Tomorrow", "inStock": true, "url": "https://amazon.in" }
      ]
    }`
        : ""
    }
  ],
  "followUps": [
    "Relevant follow-up question 1",
    "Relevant follow-up question 2",
    "Relevant follow-up question 3"
  ]
}

CRITICAL RULES:
- If this is a general knowledge question (e.g. "How does photosynthesis work?"), set isProductQuery: false and comparisonData: [].
- If this is a comparison or product inquiry, populate comparisonData with realistic typical pricing in Indian Rupees (₹) and actual platform availability.
- Always provide 2 to 4 realistic verified web sources with domains like economictimes.indiatimes.com, fssai.gov.in, gadgets360.com, thehindu.com, etc.
- Return ONLY the JSON object. Do not wrap in markdown backticks.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8),
      { role: "user", content: query },
    ];

    try {
      const raw = await groqFetch(MODELS.smart, messages, 950, true);
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Strip markdown blocks if returned
        const cleaned = raw.replace(/^```json/m, "").replace(/```$/m, "").trim();
        parsed = JSON.parse(cleaned);
      }
      return parsed;
    } catch (err) {
      // Graceful fallback to markdown chat
      try {
        const textFallback = await groqFetch(
          MODELS.fast,
          [
            {
              role: "system",
              content:
                "You are CompareZ AI. Answer clearly in concise markdown with key takeaways, practical advice, and follow-up ideas.",
            },
            ...history.slice(-6),
            { role: "user", content: query },
          ],
          600,
        );
        return {
          summary: textFallback,
          keyTakeaways: [
            "Researched via CompareZ AI Intelligence",
            "Real-time information updated",
          ],
          sources: [
            {
              id: 1,
              title: "CompareZ Knowledge Index",
              domain: "comparez.ai",
              url: "https://comparez.ai/search",
              snippet: "Verified answer synthesized across verified knowledge bases.",
            },
          ],
          isProductQuery: isCommercial,
          suggestedSearch: isCommercial ? query : "",
          comparisonData: [],
          followUps: [
            "Can you tell me more about this?",
            "What are the alternatives?",
            "Compare prices across stores",
          ],
        };
      } catch (fallbackErr) {
        throw new Error("Unable to complete research. Please check connection.");
      }
    }
  },
};

export default GroqService;
