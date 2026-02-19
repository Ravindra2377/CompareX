package scraper

import (
	"bytes"
	"comparex/config"
	"comparex/models"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type ZeptoScraper struct {
	client *http.Client
}

func NewZeptoScraper() *ZeptoScraper {
	return &ZeptoScraper{
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (z *ZeptoScraper) Name() string { return "Zepto" }

func (z *ZeptoScraper) Search(ctx context.Context, query string, lat, lng float64, userTokens map[string]string) ([]models.PlatformListing, error) {
	cfg := config.AppConfig.Zepto

	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://api.zepto.co.in/api/v1/search"
	}

	payload := map[string]interface{}{
		"query":        query,
		"pageNumber":   0,
		"mode":         "AUGMENTED",
		"searchSource": "PRIMARY_SEARCH_BAR",
	}

	// Override with config payload if present
	if val, ok := cfg.Payload["intentId"]; ok && val != "" {
		payload["intentId"] = val
	}

	// Extract intentId from userTokens if available (from localStorage)
	if userTokens != nil {
		if intentId, ok := userTokens["intentId"]; ok && intentId != "" {
			payload["intentId"] = intentId
		}
	}

	// If still no intentId, use a default UUID-like fallback
	if _, ok := payload["intentId"]; !ok {
		payload["intentId"] = "281d2279-058b-4b13-b541-69aa1c27806f"
	}

	bodyData, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", baseURL, bytes.NewReader(bodyData))
	if err != nil {
		return nil, err
	}

	// Apply headers from config
	for k, v := range cfg.Headers {
		req.Header.Set(k, v)
	}

	// Set default headers if not present
	if req.Header.Get("user-agent") == "" {
		req.Header.Set("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	}
	if req.Header.Get("content-type") == "" {
		req.Header.Set("content-type", "application/json")
	}
	req.Header.Set("origin", "https://www.zeptonow.com")
	req.Header.Set("referer", "https://www.zeptonow.com/")

	// Override with user tokens if present
	if userTokens != nil {
		for k, v := range userTokens {
			if v != "" {
				req.Header.Set(k, v)
			}
		}
		// Handle specific token mappings for Zepto
		if cookie, ok := userTokens["cookie"]; ok && cookie != "" {
			req.Header.Set("Cookie", cookie)
		}
		if token, ok := userTokens["token"]; ok && token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		if storeId, ok := userTokens["storeId"]; ok && storeId != "" {
			req.Header.Set("store_id", storeId)
		}
	}

	resp, err := z.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		// Log more details for debugging
		log.Printf("🔴 Zepto API error: status=%d, endpoint=%s", resp.StatusCode, baseURL)
		if resp.StatusCode == 404 {
			log.Printf("💡 Zepto requires authentication. Link your account in the app's Accounts tab.")
		}
		return nil, fmt.Errorf("zepto api status: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var listings []models.PlatformListing

	layout, _ := result["layout"].([]interface{})
	for _, widget := range layout {
		w, _ := widget.(map[string]interface{})
		data, _ := w["data"].(map[string]interface{})
		resolver, _ := data["resolver"].(map[string]interface{})
		items, _ := resolver["items"].([]interface{})

		for _, item := range items {
			p, _ := item.(map[string]interface{})
			variant, _ := p["productResponse"].(map[string]interface{})

			if variant == nil {
				continue
			}

			name := getString(variant, "name")
			id := getString(variant, "id")
			mrp := getFloat(variant, "mrp") / 100
			price := getFloat(variant, "sellingPrice") / 100
			slug := getString(variant, "slug")

			deepLink := fmt.Sprintf("https://zeptonow.com/product/%s/%s", slug, id)

			if name != "" && price > 0 {
				l := models.PlatformListing{
					Platform:     "Zepto",
					ProductName:  name,
					Price:        price,
					MRP:          mrp,
					InStock:      getBool(variant, "isAvailable"),
					DeliveryTime: "10 mins",
					DeepLink:     deepLink,
					ScrapedAt:    time.Now(),
				}
				listings = append(listings, l)
			}
		}
	}

	log.Printf("✅ Zepto API found %d items", len(listings))
	return listings, nil
}
