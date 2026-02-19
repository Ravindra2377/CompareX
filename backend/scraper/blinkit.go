package scraper

import (
	"comparex/config"
	"comparex/models"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"
)

type BlinkitScraper struct {
	client *http.Client
}

func NewBlinkitScraper() *BlinkitScraper {
	return &BlinkitScraper{
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (b *BlinkitScraper) Name() string { return "Blinkit" }

func (b *BlinkitScraper) Search(ctx context.Context, query string, lat, lng float64, userTokens map[string]string) ([]models.PlatformListing, error) {
	// Log what tokens we received
	if userTokens != nil && len(userTokens) > 0 {
		tokenKeys := make([]string, 0, len(userTokens))
		for k := range userTokens {
			tokenKeys = append(tokenKeys, k)
		}
		log.Printf("🔵 Blinkit received tokens: %v", tokenKeys)
	} else {
		log.Printf("🔵 Blinkit: No tokens provided")
	}

	cfg := config.AppConfig.Blinkit

	// Use configured URL or default
	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://blinkit.com/v6/search/products"
	}

	// Parse location token FIRST to get correct coordinates
	if userTokens != nil {
		if locationJSON, ok := userTokens["location"]; ok && locationJSON != "" {
			var locData map[string]interface{}
			if err := json.Unmarshal([]byte(locationJSON), &locData); err == nil {
				if coords, ok := locData["coords"].(map[string]interface{}); ok {
					if coordLat, ok := coords["lat"].(float64); ok {
						lat = coordLat
					}
					if coordLon, ok := coords["lon"].(float64); ok {
						lng = coordLon
					}
				}
			}
		}
	}

	// Build endpoint with correct coordinates
	endpoint := fmt.Sprintf("%s?start=0&size=20&q=%s&lat=%f&lon=%f", baseURL, url.QueryEscape(query), lat, lng)

	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
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
	if req.Header.Get("accept") == "" {
		req.Header.Set("accept", "application/json, text/plain, */*")
	}
	req.Header.Set("origin", "https://blinkit.com")
	req.Header.Set("referer", "https://blinkit.com/")
	req.Header.Set("app_client", "consumer_web")
	req.Header.Set("app_version", "52.9")

	// Override with user tokens if present
	if userTokens != nil {
		// Handle cookie first
		if cookie, ok := userTokens["cookie"]; ok && cookie != "" {
			req.Header.Set("Cookie", cookie)
		}

		// Parse and set auth from localStorage JSON
		if authJSON, ok := userTokens["auth"]; ok && authJSON != "" {
			var authData map[string]interface{}
			if err := json.Unmarshal([]byte(authJSON), &authData); err == nil {
				if accessToken, ok := authData["accessToken"].(string); ok && accessToken != "" {
					// Try multiple header formats that Blinkit might accept
					req.Header.Set("access_token", accessToken)
					req.Header.Set("accesstoken", accessToken)
					req.Header.Set("Authorization", accessToken) // Some APIs use this
				}
			}
		}

		// Set auth_key if present
		if authKey, ok := userTokens["auth_key"]; ok && authKey != "" {
			req.Header.Set("auth_key", authKey)
			req.Header.Set("auth-key", authKey)
			req.Header.Set("authkey", authKey)
		}

		// Set any remaining tokens as headers
		for k, v := range userTokens {
			if v != "" && k != "auth" && k != "location" && k != "cookie" && k != "auth_key" && k != "user" {
				req.Header.Set(k, v)
			}
		}
	}
	// Ensure these are set
	req.Header.Set("lat", fmt.Sprintf("%f", lat))
	req.Header.Set("lon", fmt.Sprintf("%f", lng))

	// Log what tokens/headers we're using
	log.Printf("🔵 Blinkit Request Headers:")
	log.Printf("  - Cookie: %s", maskString(req.Header.Get("Cookie")))
	log.Printf("  - access_token: %s", maskString(req.Header.Get("access_token")))
	log.Printf("  - auth_key: %s", maskString(req.Header.Get("auth_key")))
	log.Printf("  - lat/lon: %f, %f", lat, lng)

	resp, err := b.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		// Read response body for debugging
		bodyBytes, _ := io.ReadAll(resp.Body)
		bodyPreview := string(bodyBytes)
		if len(bodyPreview) > 500 {
			bodyPreview = bodyPreview[:500] + "..."
		}

		log.Printf("🔴 Blinkit API error: status=%d, endpoint=%s", resp.StatusCode, endpoint)
		if len(bodyPreview) > 0 {
			log.Printf("🔴 Response body: %s", bodyPreview)
		}
		if resp.StatusCode == 403 {
			log.Printf("💡 Blinkit 403: Check if cookies/tokens are valid or expired")
		}
		return nil, fmt.Errorf("blinkit api status: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var listings []models.PlatformListing

	products, _ := result["products"].([]interface{})
	for _, p := range products {
		item, _ := p.(map[string]interface{})

		name := getString(item, "name")
		price := getFloat(item, "price") / 100
		mrp := getFloat(item, "mrp") / 100

		inventory, _ := item["inventory"].(map[string]interface{})
		inStock := getBool(inventory, "available")

		pid := getString(item, "product_id")
		deepLink := fmt.Sprintf("https://blinkit.com/prn/product/%s", pid)

		if name != "" && price > 0 {
			l := models.PlatformListing{
				Platform:     "Blinkit",
				ProductName:  name,
				Price:        price,
				MRP:          mrp,
				InStock:      inStock,
				DeliveryTime: "10-15 mins",
				DeepLink:     deepLink,
				ScrapedAt:    time.Now(),
			}
			listings = append(listings, l)
		}
	}

	log.Printf("✅ Blinkit API found %d items", len(listings))
	return listings, nil
}
