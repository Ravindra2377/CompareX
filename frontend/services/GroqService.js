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
  fast: "openai/gpt-oss-20b",
  smart: "openai/gpt-oss-120b",
  whisper: "whisper-large-v3-turbo",
};

// ─── Core fetch helper ────────────────────────────────────────────────────────
// All requests are routed through CompareZ backend proxy.
// No API credentials ever live in the mobile client.
async function groqFetch(model, messages, maxTokens = 300, jsonMode = false) {
  const token = await secureStorage.getItem("userToken");
  const body = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  try {
    const response = await fetch(PROXY_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    }
    const errBody = await response.text();
    throw new Error(`AI request failed: ${response.status} ${errBody}`);
  } catch (proxyErr) {
    throw new Error("CompareZ AI is temporarily unavailable. Please try again.");
  }
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
        body: JSON.stringify({
          query,
          mode,
          conversation_id: context.conversationId || undefined,
          location: context.city || undefined,
          pincode: context.pincode || undefined,
          latitude: context.latitude || undefined,
          longitude: context.longitude || undefined,
          history: (history || []).slice(-6).map((h) => ({
            role: h.role,
            content: h.content || h.text || h.summary || "",
          })),
        }),
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
          if (platforms.length > 0) {
            comparisonData.push({
              name: data.comparison.query || query,
              category: "Consumer Goods",
              bestPrice: data.comparison.best_price || 0,
              mrp: 0,
              bestPlatform: data.comparison.best_platform || (platforms[0] ? platforms[0].platform : "Store"),
              savings: "Verified",
              platforms,
            });
          }
        }
        return {
          conversationId: data.conversation_id || context.conversationId || null,
          messageId: data.message_id || null,
          intent: data.intent || "all",
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
            "Which platform has the fastest delivery in my area?",
            "Show me price trends over the last 30 days",
            "Compare bulk discount packs for this item",
          ],
        };
      }
    } catch (backendErr) {
      // Backend orchestrator unreachable; fallback to grounded chat synthesis
    }

    // 2. Fallback: Concise, grounded chat completion without hallucinated sources or prices
    try {
      const fallbackPrompt = `You are CompareZ AI, an assistant for Indian consumers.
The user is asking: "${query}".
Answer accurately and directly in clean markdown. Provide 2-3 key takeaways.
RULES:
- Do NOT fabricate specific merchant prices, fake discounts, or delivery times.
- If this is a shopping query, give practical buying advice and remind the user to search directly in CompareZ for live verified prices.
- Never invent URLs or fake sources.`;

      const textFallback = await groqFetch(
        MODELS.fast,
        [
          { role: "system", content: fallbackPrompt },
          ...history.slice(-6),
          { role: "user", content: query },
        ],
        600,
      );

      return {
        summary: textFallback,
        keyTakeaways: [
          "Information synthesized by CompareZ AI",
          "Check the Compare tab for real-time local merchant pricing",
        ],
        sources: [],
        isProductQuery: isCommercial,
        suggestedSearch: isCommercial ? query : "",
        comparisonData: [],
        followUps: [
          "Search live pricing on Compare tab",
          "What are the best alternatives?",
          "Can you explain more details?",
        ],
      };
    } catch (fallbackErr) {
      throw new Error("Unable to complete research. Please check your connection.");
    }
  },
};

export default GroqService;
