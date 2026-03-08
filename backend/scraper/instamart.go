package scraper

import (
	"bytes"
	"comparex/models"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"
)

// InstamartScraper fetches Swiggy Instamart products via their search API.
// API: POST https://www.swiggy.com/api/instamart/search/v2
// Response path: data.data.cards[i].card.card.gridElements.infoWithStyle.items[j].info
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
	endpoint := fmt.Sprintf(
		"https://www.swiggy.com/api/instamart/search/v2?lat=%f&lng=%f",
		lat, lng,
	)

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
		return nil, fmt.Errorf("instamart: marshal body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}

	// Required headers
	req.Header.Set("content-type", "application/json")
	req.Header.Set("accept", "application/json")
	req.Header.Set("origin", "https://www.swiggy.com")
	req.Header.Set("referer", fmt.Sprintf("https://www.swiggy.com/instamart/search?query=%s", url.QueryEscape(query)))
	req.Header.Set("user-agent", "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
	req.Header.Set("x-requested-with", "XMLHttpRequest")

	// Apply user session cookies if available (captured from the user's WebView)
	if userTokens != nil {
		if cookie, ok := userTokens["cookie"]; ok && cookie != "" {
			req.Header.Set("Cookie", cookie)
		}
		for _, key := range []string{"authHeaders", "swiggy_auth_headers"} {
			if raw, ok := userTokens[key]; ok && raw != "" {
				for k, v := range parseAuthHeaders(raw) {
					req.Header.Set(k, v)
				}
			}
		}
	}

	log.Printf("🔵 Instamart: POST %s query=%q", endpoint, query)

	resp, err := im.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("instamart: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("🔴 Instamart API error: status=%d", resp.StatusCode)
		return nil, fmt.Errorf("instamart api status: %d", resp.StatusCode)
	}

	var root map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&root); err != nil {
		return nil, fmt.Errorf("instamart: json decode: %w", err)
	}

	listings := im.extractProducts(root)
	log.Printf("✅ Instamart: found %d products for %q", len(listings), query)
	return listings, nil
}

// extractProducts navigates the confirmed Swiggy Instamart response structure:
//
//	root.data.cards[i].card.card.gridElements.infoWithStyle.items[j].info → product
func (im *InstamartScraper) extractProducts(root map[string]interface{}) []models.PlatformListing {
	var listings []models.PlatformListing
	seen := map[string]bool{}

	data, _ := root["data"].(map[string]interface{})
	if data == nil {
		return listings
	}
	cards, _ := data["cards"].([]interface{})
	log.Printf("Instamart: %d cards in response", len(cards))

	for _, cardWrapper := range cards {
		cw, _ := cardWrapper.(map[string]interface{})
		if cw == nil {
			continue
		}

		// Navigate: cardWrapper.card.card.gridElements.infoWithStyle.items
		outer, _ := cw["card"].(map[string]interface{})
		if outer == nil {
			continue
		}
		inner, _ := outer["card"].(map[string]interface{})
		if inner == nil {
			continue
		}

		// Path A: gridElements.infoWithStyle.items (main product grid)
		if ge, _ := inner["gridElements"].(map[string]interface{}); ge != nil {
			if iws, _ := ge["infoWithStyle"].(map[string]interface{}); iws != nil {
				if items, _ := iws["items"].([]interface{}); len(items) > 0 {
					for _, item := range items {
						itemMap, _ := item.(map[string]interface{})
						if itemMap == nil {
							continue
						}
						info, _ := itemMap["info"].(map[string]interface{})
						if info == nil {
							info = itemMap // items[j] might itself be the product
						}
						im.tryAdd(info, seen, &listings)
					}
				}
			}
		}

		// Path B: items[] directly on inner card
		if items, _ := inner["items"].([]interface{}); len(items) > 0 {
			for _, item := range items {
				itemMap, _ := item.(map[string]interface{})
				if itemMap == nil {
					continue
				}
				info, _ := itemMap["info"].(map[string]interface{})
				if info == nil {
					info = itemMap
				}
				im.tryAdd(info, seen, &listings)
			}
		}
	}

	return listings
}

func (im *InstamartScraper) tryAdd(info map[string]interface{}, seen map[string]bool, listings *[]models.PlatformListing) {
	if info == nil {
		return
	}

	name := getString(info, "display_name")
	if name == "" {
		name = getString(info, "name")
	}
	if name == "" || len(name) < 3 {
		return
	}

	// Swiggy stores prices in paise (×100)
	rawPrice := getFloat(info, "price")
	if rawPrice == 0 {
		rawPrice = getFloat(info, "offer_price")
	}
	if rawPrice == 0 {
		rawPrice = getFloat(info, "discounted_price")
	}
	// Handle nested price object: { "price": { "offer_price": 2400, "mrp": 2800 } }
	if rawPrice == 0 {
		if priceObj, _ := info["price"].(map[string]interface{}); priceObj != nil {
			rawPrice = getFloat(priceObj, "offer_price")
			if rawPrice == 0 {
				rawPrice = getFloat(priceObj, "mrp")
			}
		}
	}
	price := im.normalizePaise(rawPrice)
	if price <= 0 {
		return
	}

	rawMRP := getFloat(info, "mrp")
	if rawMRP == 0 {
		if priceObj, _ := info["price"].(map[string]interface{}); priceObj != nil {
			rawMRP = getFloat(priceObj, "mrp")
		}
	}
	mrp := im.normalizePaise(rawMRP)
	if mrp == 0 {
		mrp = price
	}

	key := fmt.Sprintf("%s|%.0f", name, price)
	if seen[key] {
		return
	}
	seen[key] = true

	pid := getString(info, "product_id")
	deepLink := ""
	if pid != "" {
		deepLink = "https://www.swiggy.com/instamart/item/" + pid
	}

	imageID := getString(info, "image_id")
	imgURL := getString(info, "image_url")
	if imgURL == "" && imageID != "" {
		imgURL = "https://media-assets.swiggy.com/swiggy/image/upload/" + imageID
	}

	inStock := true
	if stockObj, _ := info["stock"].(map[string]interface{}); stockObj != nil {
		if qty := getFloat(stockObj, "quantity"); qty <= 0 {
			inStock = false
		}
	}
	if b, _ := info["is_out_of_stock"].(bool); b {
		inStock = false
	}

	*listings = append(*listings, models.PlatformListing{
		Platform:     "Instamart",
		ProductName:  name,
		Brand:        getString(info, "brand_name"),
		Price:        price,
		MRP:          mrp,
		ImageURL:     imgURL,
		InStock:      inStock,
		DeliveryTime: "10-20 mins",
		DeepLink:     deepLink,
		ScrapedAt:    time.Now(),
	})
}

// normalizePaise converts Swiggy paise prices to rupees.
// Swiggy sends ₹24 as 2400, ₹99 as 9900, etc.
func (im *InstamartScraper) normalizePaise(v float64) float64 {
	if v <= 0 {
		return 0
	}
	// If it's a whole number divisible by 100 and > 100: assume paise
	if v > 100 && v == float64(int64(v)) && int64(v)%100 == 0 {
		return v / 100
	}
	// Otherwise treat it as rupees directly
	return v
}

// parseAuthHeaders parses a JSON blob of auth headers (may be {"headers":{...}} or flat {k:v}).
func parseAuthHeaders(raw string) map[string]string {
	result := map[string]string{}
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &m); err != nil {
		return result
	}
	src := m
	if nested, ok := m["headers"].(map[string]interface{}); ok {
		src = nested
	}
	for k, v := range src {
		if k == "cookie" || k == "host" || k == "content-length" {
			continue
		}
		if s, ok := v.(string); ok && s != "" {
			result[k] = s
		}
	}
	return result
}
