package handlers

import (
	"regexp"
	"strings"
)

// QueryIntent represents the classified operational route for an AI request.
type QueryIntent string

const (
	IntentDirectAnswer   QueryIntent = "direct_answer"   // Coding, general knowledge, explanations, writing
	IntentCalculation    QueryIntent = "calculation"     // EMI, math, percentage, finance, unit conversion
	IntentShopping       QueryIntent = "shopping"       // Buying, price comparisons, products, deals, discounts
	IntentWebSearch      QueryIntent = "web_search"      // Live events, news, recent updates, real-time web facts
)

var (
	// Calculation & Math
	calcKeywords = regexp.MustCompile(`(?i)\b(calculate|calculator|emi|loan|mortgage|interest\s+rate|compound\s+interest|percentage|gst|tax\b|convert\s+\d+|how\s+much\s+is\s+\d+)\b`)
	mathSymbols  = regexp.MustCompile(`^\s*[\d\.\,\s\+\-\*\/\^\(\)\%]+\s*$`)

	// Programming & Technical Comparisons (Takes precedence over shopping "vs")
	techComparison = regexp.MustCompile(`(?i)\b(python|golang|java|javascript|typescript|react|vue|angular|node|c\+\+|rust|swift|kotlin|sql|nosql|mongodb|postgres|docker|kubernetes|linux|git|rest|graphql|html|css)\b`)

	// Health, Nutrition & Diet (Takes precedence over grocery product shopping)
	healthNutrition = regexp.MustCompile(`(?i)\b(is\s+\w+\s+(healthy|good\s+for|bad\s+for|safe)|health\s+benefits|side\s+effects|nutrition|calories|protein\s+in|vitamins?\s+in|cure|symptoms?)\b`)

	// Live News, Temporal Updates & Commodity Market Rates (Takes precedence over shopping)
	liveCommodities = regexp.MustCompile(`(?i)\b(gold\s+price|silver\s+price|petrol|diesel|cng|lpg\s+cylinder|sensex|nifty|stock\s+price|crypto|bitcoin|inflation\s+rate)\b`)
	newsTemporal    = regexp.MustCompile(`(?i)\b(today|yesterday|tonight|news|breaking|latest|current|recent|recently|2026|who\s+won|match|cricket|score|weather|election|poll|launch\s+news|release\s+date|when\s+will|when\s+is|ceo\s+of|founder\s+of)\b`)

	// Consumer Shopping Intent (Requires buying or comparison signals)
	shoppingAction = regexp.MustCompile(`(?i)\b(price|prices|buy|cost|cheap|cheapest|deal|deals|discount|discounts|offer|offers|compare|vs|which\s+is\s+better|best\s+\w+\s+under|under\s+₹|under\s+rs|under\s+\d+k?|review\s+of|specs|specifications|where\s+to\s+buy)\b`)
	consumerSKUs   = regexp.MustCompile(`(?i)\b(milk|curd|paneer|ghee|butter|cheese|bread|eggs|oil|atta|rice|dal|sugar|tea|coffee|soap|shampoo|detergent|biscuit|chocolate|nandini|amul|fortune|saffola|aashirvaad|iphone|samsung|oneplus|realme|redmi|macbook|laptop|earbuds|headphones|airpods|tv|television|fridge|refrigerator|washing\s+machine|ac|air\s+conditioner|shoes|sneakers)\b`)

	// Direct Knowledge, Writing & Conceptual
	directExplanations = regexp.MustCompile(`(?i)\b(explain|how\s+does|what\s+is|why\s+is|difference\s+between|how\s+to\s+write|write\s+a|draft\s+an?|poem|recipe|essay|code|debug|syntax|definition)\b`)
)

// ClassifyQueryIntent inspects user query and mode with contextual precedence.
func ClassifyQueryIntent(query, mode string) QueryIntent {
	cleanQuery := strings.TrimSpace(query)
	lowerQuery := strings.ToLower(cleanQuery)
	lowerMode := strings.ToLower(strings.TrimSpace(mode))

	// 1. Explicit user modes
	if lowerMode == "compare" || lowerMode == "shopping" || lowerMode == "buying" {
		return IntentShopping
	}

	// 2. Calculation & Math Queries (Highest operational certainty)
	if calcKeywords.MatchString(lowerQuery) || (mathSymbols.MatchString(cleanQuery) && strings.ContainsAny(cleanQuery, "+-*/^%")) {
		return IntentCalculation
	}

	// 3. Technical & Software Comparisons (e.g. "Python vs Java", "React vs Vue") -> Direct Answer
	if techComparison.MatchString(lowerQuery) && (strings.Contains(lowerQuery, " vs ") || strings.Contains(lowerQuery, "difference") || strings.Contains(lowerQuery, "better")) {
		return IntentDirectAnswer
	}

	// 4. Health, Nutrition & Diet Queries (e.g. "Is milk healthy?", "Benefits of green tea") -> Direct Answer
	if healthNutrition.MatchString(lowerQuery) {
		if lowerMode == "research" {
			return IntentWebSearch
		}
		return IntentDirectAnswer
	}

	// 5. Commodity Market Rates & Live News (e.g. "Today's gold price", "Latest iPhone launch news") -> Web Search
	if liveCommodities.MatchString(lowerQuery) || newsTemporal.MatchString(lowerQuery) {
		return IntentWebSearch
	}

	// 6. Consumer Shopping & Product Comparison (e.g. "Amul Gold milk vs Nandini GoodLife price", "Laptop under 60000")
	if shoppingAction.MatchString(lowerQuery) && consumerSKUs.MatchString(lowerQuery) {
		return IntentShopping
	}
	if shoppingAction.MatchString(lowerQuery) {
		return IntentShopping
	}

	// 7. Direct Educational & Conceptual Queries (e.g. "Explain photosynthesis")
	if directExplanations.MatchString(lowerQuery) {
		return IntentDirectAnswer
	}

	// 8. Mode Fallback: User selected "research" -> WebSearch, else DirectAnswer
	if lowerMode == "research" {
		return IntentWebSearch
	}

	return IntentDirectAnswer
}
