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
	calculationRegex = regexp.MustCompile(`(?i)\b(emi|mortgage|interest\s+rate|compound\s+interest|percentage|gst|income\s+tax|calculate|calculator|convert\s+\d+|how\s+much\s+is\s+\d+)\b`)
	mathSymbolRegex  = regexp.MustCompile(`^\s*[\d\.\,\s\+\-\*\/\^\(\)\%]+\s*$`)

	shoppingRegex = regexp.MustCompile(`(?i)\b(price|prices|buy|cost|cheap|cheapest|deal|deals|discount|discounts|offer|offers|compare|vs|which\s+is\s+better|best\s+\w+\s+under|under\s+₹|under\s+rs|under\s+\d+k?|review\s+of|specs|specifications)\b`)
	productNounRegex = regexp.MustCompile(`(?i)\b(milk|curd|paneer|ghee|butter|cheese|bread|eggs|oil|atta|rice|dal|sugar|tea|coffee|soap|shampoo|detergent|biscuit|chocolate|nandini|amul|fortune|saffola|aashirvaad|iphone|samsung|oneplus|realme|redmi|macbook|laptop|earbuds|headphones|airpods|tv|television|fridge|refrigerator|washing\s+machine|ac|air\s+conditioner|shoes|sneakers)\b`)

	webSearchRegex = regexp.MustCompile(`(?i)\b(today|yesterday|tonight|news|breaking|latest|current|recent|recently|2026|who\s+won|match|cricket|score|weather|stock\s+price|sensex|nifty|gold\s+rate|petrol\s+price|election|poll|released|release\s+date|when\s+is|ceo\s+of|founder\s+of)\b`)

	directAnswerRegex = regexp.MustCompile(`(?i)\b(explain|how\s+does|what\s+is|why\s+is|difference\s+between|how\s+to\s+write|write\s+a|draft\s+an?|python|golang|javascript|typescript|react|sql|java|css|html|algorithm|poem|recipe|essay|code|debug|syntax)\b`)
)

// ClassifyQueryIntent inspects user query and mode to determine the optimal AI processing pipeline.
func ClassifyQueryIntent(query, mode string) QueryIntent {
	cleanQuery := strings.TrimSpace(query)
	lowerQuery := strings.ToLower(cleanQuery)
	lowerMode := strings.ToLower(strings.TrimSpace(mode))

	// 1. Explicit user modes
	if lowerMode == "compare" || lowerMode == "shopping" || lowerMode == "buying" {
		return IntentShopping
	}

	// 2. Math & Calculation queries
	if calculationRegex.MatchString(lowerQuery) || (mathSymbolRegex.MatchString(cleanQuery) && strings.ContainsAny(cleanQuery, "+-*/^%")) {
		return IntentCalculation
	}

	// 3. Product & Shopping comparison queries
	if shoppingRegex.MatchString(lowerQuery) || productNounRegex.MatchString(lowerQuery) {
		return IntentShopping
	}

	// 4. Live / Temporal / News queries requiring real-time web search
	if webSearchRegex.MatchString(lowerQuery) {
		return IntentWebSearch
	}

	// 5. Direct coding / educational / explanation queries
	if directAnswerRegex.MatchString(lowerQuery) {
		return IntentDirectAnswer
	}

	// 6. Default: If user selected "research" mode, route to WebSearch; otherwise DirectAnswer
	if lowerMode == "research" {
		return IntentWebSearch
	}

	return IntentDirectAnswer
}
