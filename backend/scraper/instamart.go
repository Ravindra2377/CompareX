package scraper

import (
	"bytes"
	"comparex/models"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type InstamartScraper struct {
	client *http.Client
}

func NewInstamartScraper() *InstamartScraper {
	return &InstamartScraper{
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

func (im *InstamartScraper) Name() string { return "Instamart" }

func (im *InstamartScraper) Search(ctx context.Context, query string, lat, lng float64, userTokens map[string]string) ([]models.PlatformListing, error) {
	// Swiggy Instamart uses a POST request to this endpoint
	endpoint := "https://www.swiggy.com/api/instamart/search/v2"

	// Build request body
	bodyMap := map[string]interface{}{
		"facets":                []interface{}{},
		"sortAttribute":         "",
		"query":                 query,
		"search_results_offset": "0",
		"page_type":             "INSTAMART_SEARCH_PAGE",
		"is_pre_search_tag":     false,
	}
	bodyBytes, err := json.Marshal(bodyMap)
	if err != nil {
		return nil, fmt.Errorf("instamart: failed to marshal request body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}

	// Required headers that Swiggy enforces
	req.Header.Set("content-type", "application/json")
	req.Header.Set("accept", "application/json")
	req.Header.Set("origin", "https://www.swiggy.com")
	req.Header.Set("referer", fmt.Sprintf("https://www.swiggy.com/instamart/search?query=%s&lat=%f&lng=%f", query, lat, lng))
	req.Header.Set("user-agent", "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
	req.Header.Set("x-build-id", "4671")
	req.Header.Set("access-control-allow-origin", "*")

	// Provide lat/lng as query params too (some Swiggy endpoints need these)
	q := req.URL.Query()
	q.Set("lat", fmt.Sprintf("%f", lat))
	q.Set("lng", fmt.Sprintf("%f", lng))
	req.URL.RawQuery = q.Encode()

	// Apply user session tokens (cookies, auth headers from their logged-in Swiggy session)
	if userTokens != nil {
		if cookie, ok := userTokens["cookie"]; ok && cookie != "" {
			req.Header.Set("Cookie", cookie)
		}
		if authStr, ok := userTokens["authHeaders"]; ok && authStr != "" {
			var authMap map[string]string
			if err := json.Unmarshal([]byte(authStr), &authMap); err == nil {
				for k, v := range authMap {
					if k != "cookie" {
						req.Header.Set(k, v)
					}
				}
			}
		}
	}

	log.Printf("🔵 Instamart: calling POST %s for query=%q lat=%f lng=%f", endpoint, query, lat, lng)

	resp, err := im.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("instamart: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		log.Printf("🔴 Instamart API error: status=%d", resp.StatusCode)
		return nil, fmt.Errorf("instamart api status: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("instamart: json decode failed: %w", err)
	}

	listings := im.parseResponse(result, query)
	log.Printf("✅ Instamart API found %d items for query=%q", len(listings), query)
	return listings, nil
}

// parseResponse walks the Swiggy Instamart /api/instamart/search/v2 response tree.
// The structure is:
//
//	data.cards[] -> card.card.info (the product node)
//	           OR -> groupedCard.cardGroupMap.ITEM.cards[].card.card.info
func (im *InstamartScraper) parseResponse(result map[string]interface{}, query string) []models.PlatformListing {
	var listings []models.PlatformListing
	seen := map[string]bool{}

	tryAdd := func(node map[string]interface{}) {
		name := getString(node, "display_name")
		if name == "" {
			name = getString(node, "name")
		}
		if name == "" {
			return
		}

		// Swiggy prices are in paise (×100), fall back to direct rupee values
		rawPrice := getFloat(node, "price")
		if rawPrice == 0 {
			rawPrice = getFloat(node, "offer_price")
		}
		if rawPrice == 0 {
			rawPrice = getFloat(node, "sp")
		}

		// Normalize: paise if > 500 and is a round multiple of 100, else assume rupees
		price := rawPrice
		if price > 500 && price == float64(int(price)) && int(price)%100 == 0 {
			price = price / 100
		}

		rawMRP := getFloat(node, "mrp")
		mrp := rawMRP
		if mrp > 500 && mrp == float64(int(mrp)) && int(mrp)%100 == 0 {
			mrp = mrp / 100
		}
		if mrp == 0 {
			mrp = price
		}

		if name == "" || price <= 0 {
			return
		}

		key := fmt.Sprintf("%s|%.0f", name, price)
		if seen[key] {
			return
		}
		seen[key] = true

		pid := getString(node, "product_id")
		deepLink := ""
		if pid != "" {
			deepLink = fmt.Sprintf("https://www.swiggy.com/instamart/item/%s", pid)
		}

		imgURL := getString(node, "image_url")
		if imgURL == "" {
			imgURL = getString(node, "img_url")
		}
		if imgURL == "" {
			imgURL = getString(node, "imageUrl")
		}

		// Stock check
		inStock := true
		if stockObj, ok := node["stock"].(map[string]interface{}); ok {
			if qty := getFloat(stockObj, "quantity"); qty <= 0 {
				inStock = false
			}
		}

		listings = append(listings, models.PlatformListing{
			Platform:     "Instamart",
			ProductName:  name,
			Price:        price,
			MRP:          mrp,
			ImageURL:     imgURL,
			InStock:      inStock,
			DeliveryTime: "10-20 mins",
			DeepLink:     deepLink,
			ScrapedAt:    time.Now(),
		})
	}

	// Recursive walker that handles Swiggy's deeply nested card tree
	var walk func(node interface{}, depth int)
	walk = func(node interface{}, depth int) {
		if depth > 15 || node == nil {
			return
		}
		switch v := node.(type) {
		case []interface{}:
			for _, item := range v {
				walk(item, depth+1)
			}
		case map[string]interface{}:
			// Check if this node itself looks like a product
			hasName := v["display_name"] != nil || v["name"] != nil
			hasPrice := v["price"] != nil || v["offer_price"] != nil || v["sp"] != nil || v["mrp"] != nil
			if hasName && hasPrice {
				tryAdd(v)
			} else {
				// Keep descending
				for k, child := range v {
					// Skip huge strings and metadata fields to save time
					if s, ok := child.(string); ok && len(s) > 5000 {
						continue
					}
					_ = k
					walk(child, depth+1)
				}
			}
		}
	}

	walk(result, 0)
	return listings
}
