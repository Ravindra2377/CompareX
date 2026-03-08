package scraper

import (
	"bytes"
	"comparex/config"
	"comparex/models"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type InstamartScraper struct{}

func NewInstamartScraper() *InstamartScraper {
	return &InstamartScraper{}
}

func (s *InstamartScraper) Name() string {
	return "Instamart"
}

func (s *InstamartScraper) Search(ctx context.Context, query string, lat, lng float64, userTokens map[string]string) ([]models.PlatformListing, error) {
	if err := config.LoadConfig(); err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	platformConfig := config.AppConfig.Instamart
	if platformConfig.BaseURL == "" {
		return nil, fmt.Errorf("platform config not found for Instamart")
	}

	// Clean query for JSON payload
	cleanQuery := strings.TrimSpace(query)

	// Try multiple API variants
	variants := []struct {
		method string
		url    string
		body   interface{}
	}{
		{
			method: "POST",
			url:    platformConfig.BaseURL,
			body: map[string]interface{}{
				"pageType": "INSTAMART_SEARCH",
				"query":    cleanQuery,
				"lat":      fmt.Sprintf("%f", lat),
				"lng":      fmt.Sprintf("%f", lng),
			},
		},
		{
			method: "GET",
			url:    platformConfig.BaseURL + "?query=" + url.QueryEscape(cleanQuery) + "&lat=" + fmt.Sprintf("%f", lat) + "&lng=" + fmt.Sprintf("%f", lng) + "&offset=0&ageConsent=false",
			body:   nil,
		},
		{
			method: "GET",
			url:    strings.Replace(platformConfig.BaseURL, "/v2", "", 1) + "?query=" + url.QueryEscape(cleanQuery) + "&lat=" + fmt.Sprintf("%f", lat) + "&lng=" + fmt.Sprintf("%f", lng),
			body:   nil,
		},
		{
			method: "POST",
			url:    strings.Replace(platformConfig.BaseURL, "/v2", "", 1),
			body: map[string]interface{}{
				"query": cleanQuery,
				"lat":   fmt.Sprintf("%f", lat),
				"lng":   fmt.Sprintf("%f", lng),
			},
		},
		{
			method: "GET",
			url:    "https://www.swiggy.com/dapi/instamart/search?query=" + url.QueryEscape(cleanQuery) + "&lat=" + fmt.Sprintf("%f", lat) + "&lng=" + fmt.Sprintf("%f", lng) + "&pageType=INSTAMART_SEARCH",
			body:   nil,
		},
		{
			method: "GET",
			url:    "https://www.swiggy.com/dapi/instamart/search?str=" + url.QueryEscape(cleanQuery) + "&lat=" + fmt.Sprintf("%f", lat) + "&lng=" + fmt.Sprintf("%f", lng),
			body:   nil,
		},
	}

	for i, variant := range variants {
		log.Printf("[Instamart] Trying variant %d: %s %s", i+1, variant.method, variant.url)

		var reqBody io.Reader
		if variant.body != nil {
			payloadBytes, err := json.Marshal(variant.body)
			if err != nil {
				continue
			}
			reqBody = bytes.NewBuffer(payloadBytes)
		}

		req, err := http.NewRequestWithContext(ctx, variant.method, variant.url, reqBody)
		if err != nil {
			continue
		}

		// Apply default headers from config
		for k, v := range platformConfig.Headers {
			req.Header.Set(k, v)
		}

		if variant.method == "POST" {
			req.Header.Set("Content-Type", "application/json")
		}

		// Apply user tokens (cookies, authorization, etc)
		if cookie, ok := userTokens["cookie"]; ok && cookie != "" {
			req.Header.Set("Cookie", cookie)
		}
		if authHeadersJSON, ok := userTokens["authHeaders"]; ok && authHeadersJSON != "" {
			var headers map[string]string
			if err := json.Unmarshal([]byte(authHeadersJSON), &headers); err == nil {
				for k, v := range headers {
					req.Header.Set(k, v)
				}
			}
		}

		client := &http.Client{
			Timeout: 10 * time.Second,
		}

		resp, err := client.Do(req)
		if err != nil {
			log.Printf("[Instamart] Variant %d failed: %v", i+1, err)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			bodyBytes, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			log.Printf("[Instamart] Variant %d status %d: %s", i+1, resp.StatusCode, string(bodyBytes))
			continue
		}

		// Try to extract products
		products, err := s.extractProducts(resp.Body, query)
		resp.Body.Close()
		if err != nil {
			log.Printf("[Instamart] Variant %d extract error: %v", i+1, err)
			continue
		}

		if len(products) > 0 {
			log.Printf("[Instamart] Variant %d succeeded with %d products", i+1, len(products))
			return products, nil
		}
	}

	return nil, fmt.Errorf("all API variants failed")
}

func (s *InstamartScraper) extractProducts(body io.Reader, query string) ([]models.PlatformListing, error) {
	var result map[string]interface{}
	if err := json.NewDecoder(body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	var listings []models.PlatformListing
	now := time.Now()

	// Navigate: data -> data -> cards[] -> card -> gridElements -> infoWithStyle -> items[] -> info
	dataOuter, ok := result["data"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("data object not found in response")
	}

	dataInner, ok := dataOuter["data"].(map[string]interface{})
	if !ok {
		// Sometimes it's just one level
		dataInner = dataOuter
	}

	cards, ok := dataInner["cards"].([]interface{})
	if !ok {
		return listings, nil // Return empty, missing cards array
	}

	for _, cardInterface := range cards {
		cardMap, ok := cardInterface.(map[string]interface{})
		if !ok {
			continue
		}

		cardData, ok := cardMap["card"].(map[string]interface{})
		if !ok {
			continue
		}

		var actualCard map[string]interface{}
		if innerCard, ok := cardData["card"].(map[string]interface{}); ok {
			actualCard = innerCard
		} else {
			actualCard = cardData
		}

		gridElements, ok := actualCard["gridElements"].(map[string]interface{})
		if !ok {
			continue
		}

		infoWithStyle, ok := gridElements["infoWithStyle"].(map[string]interface{})
		if !ok {
			continue
		}

		items, ok := infoWithStyle["items"].([]interface{})
		if !ok {
			continue
		}

		for _, itemInterface := range items {
			itemMap, ok := itemInterface.(map[string]interface{})
			if !ok {
				continue
			}

			info, ok := itemMap["info"].(map[string]interface{})
			if !ok {
				continue
			}

			productName, _ := info["name"].(string)
			if productName == "" {
				productName, _ = info["display_name"].(string)
			}
			if productName == "" {
				continue
			}

			// Swiggy prices are in paise (e.g., 2400 = 24 INR)
			var price, mrp float64

			if priceInfo, ok := info["price"].(map[string]interface{}); ok {
				if finalPrice, ok := priceInfo["offer_price"].(float64); ok {
					price = finalPrice / 100
				} else if finalPrice, ok := priceInfo["discounted_price"].(float64); ok {
					price = finalPrice / 100
				} else if finalPrice, ok := priceInfo["price"].(float64); ok {
					price = finalPrice / 100
				}

				if mrpVal, ok := priceInfo["mrp"].(float64); ok {
					mrp = mrpVal / 100
				}
			} else {
				// Fallback flat price properties
				if offerPrice, ok := info["offer_price"].(float64); ok {
					price = offerPrice / 100
				} else if p, ok := info["price"].(float64); ok {
					price = p / 100
				}
				if m, ok := info["mrp"].(float64); ok {
					mrp = m / 100
				}
			}

			if price == 0 {
				price = mrp
			}
			if mrp == 0 {
				mrp = price
			}
			if price == 0 {
				continue // Skip items without a price
			}

			inStock := true
			if outOfStock, ok := info["out_of_stock"].(bool); ok {
				inStock = !outOfStock
			} else if inStockVal, ok := info["in_stock"].(bool); ok {
				inStock = inStockVal
			}

			listing := models.PlatformListing{
				Platform:     s.Name(),
				ProductName:  productName,
				Price:        price,
				MRP:          mrp,
				InStock:      inStock,
				DeliveryTime: "10-15 mins",
				ScrapedAt:    now,
			}

			// Generate DeepLink
			itemId, _ := info["id"].(string)
			if itemId == "" {
				if idNum, ok := info["id"].(float64); ok {
					itemId = fmt.Sprintf("%.0f", idNum)
				}
			}
			if itemId != "" {
				listing.DeepLink = fmt.Sprintf("https://www.swiggy.com/instamart/item/%s", url.PathEscape(itemId))
			} else {
				listing.DeepLink = "https://www.swiggy.com/instamart"
			}

			listings = append(listings, listing)
		}
	}

	if len(listings) > 0 {
		log.Printf("[Instamart] Extracted %d products for query: %s", len(listings), query)
		return listings, nil
	}

	// Fallback for evolving API shapes: walk the full response and collect product-like objects
	seen := make(map[string]struct{})
	walkCollectProducts(result, &listings, seen, now)

	if len(listings) == 0 {
		log.Printf("[Instamart] Fallback extractor found 0 products. Top-level keys: %v", mapKeys(result))
	}

	log.Printf("[Instamart] Extracted %d products for query: %s", len(listings), query)
	return listings, nil
}

func walkCollectProducts(node interface{}, listings *[]models.PlatformListing, seen map[string]struct{}, now time.Time) {
	switch typed := node.(type) {
	case []interface{}:
		for _, child := range typed {
			walkCollectProducts(child, listings, seen, now)
		}
	case map[string]interface{}:
		tryAppendProductFromMap(typed, listings, seen, now)
		for _, child := range typed {
			walkCollectProducts(child, listings, seen, now)
		}
	}
}

func tryAppendProductFromMap(item map[string]interface{}, listings *[]models.PlatformListing, seen map[string]struct{}, now time.Time) {
	if item == nil {
		return
	}

	name := getString(item, "name")
	if name == "" {
		name = getString(item, "display_name")
	}
	if name == "" {
		name = getString(item, "displayName")
	}
	if name == "" {
		name = getString(item, "title")
	}
	if len(strings.TrimSpace(name)) < 3 {
		return
	}

	price := 0.0
	mrp := 0.0

	if priceInfo, ok := item["price"].(map[string]interface{}); ok {
		price = normalizedINR(
			getFloat(priceInfo, "offer_price"),
			getFloat(priceInfo, "discounted_price"),
			getFloat(priceInfo, "selling_price"),
			getFloat(priceInfo, "finalPrice"),
			getFloat(priceInfo, "final_price"),
			getFloat(priceInfo, "price"),
		)
		mrp = normalizedINR(
			getFloat(priceInfo, "mrp"),
			getFloat(priceInfo, "originalPrice"),
			getFloat(priceInfo, "original_price"),
		)
	} else {
		price = normalizedINR(
			getFloat(item, "offer_price"),
			getFloat(item, "discounted_price"),
			getFloat(item, "selling_price"),
			getFloat(item, "sellingPrice"),
			getFloat(item, "finalPrice"),
			getFloat(item, "final_price"),
			getFloat(item, "display_price"),
			getFloat(item, "sp"),
			getFloat(item, "price"),
		)
		mrp = normalizedINR(
			getFloat(item, "mrp"),
			getFloat(item, "originalPrice"),
			getFloat(item, "original_price"),
		)
	}

	if price == 0 {
		price = mrp
	}
	if mrp == 0 {
		mrp = price
	}
	if price <= 0 {
		return
	}

	if strings.Contains(strings.ToLower(name), "search") && len(name) < 8 {
		return
	}

	key := strings.ToLower(strings.TrimSpace(name)) + "|" + fmt.Sprintf("%.2f", price)
	if _, exists := seen[key]; exists {
		return
	}
	seen[key] = struct{}{}

	inStock := true
	if outOfStock, ok := item["out_of_stock"].(bool); ok {
		inStock = !outOfStock
	} else if inStockVal, ok := item["in_stock"].(bool); ok {
		inStock = inStockVal
	} else if isOutOfStock, ok := item["is_out_of_stock"].(bool); ok {
		inStock = !isOutOfStock
	}

	itemID := getString(item, "id")
	if itemID == "" {
		itemID = getString(item, "product_id")
	}
	if itemID == "" {
		if idNum, ok := item["id"].(float64); ok {
			itemID = fmt.Sprintf("%.0f", idNum)
		}
	}

	deepLink := "https://www.swiggy.com/instamart"
	if itemID != "" {
		deepLink = fmt.Sprintf("https://www.swiggy.com/instamart/item/%s", url.PathEscape(itemID))
	}

	*listings = append(*listings, models.PlatformListing{
		Platform:     "Instamart",
		ProductName:  strings.TrimSpace(name),
		Price:        price,
		MRP:          mrp,
		InStock:      inStock,
		DeliveryTime: "10-15 mins",
		DeepLink:     deepLink,
		ScrapedAt:    now,
	})
}

func normalizedINR(values ...float64) float64 {
	for _, v := range values {
		if v <= 0 {
			continue
		}
		if v > 500 && float64(int64(v)) == v {
			return v / 100
		}
		return v
	}
	return 0
}

func mapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
