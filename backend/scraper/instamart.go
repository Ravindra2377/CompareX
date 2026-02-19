package scraper

import (
	"comparex/config"
	"comparex/models"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"
)

type InstamartScraper struct {
	client *http.Client
}

func NewInstamartScraper() *InstamartScraper {
	return &InstamartScraper{
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (im *InstamartScraper) Name() string { return "Instamart" }

func (im *InstamartScraper) Search(ctx context.Context, query string, lat, lng float64, userTokens map[string]string) ([]models.PlatformListing, error) {
	cfg := config.AppConfig.Instamart

	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://www.swiggy.com/dapi/instamart/search"
	}

	endpoint := fmt.Sprintf("%s?lat=%f&lng=%f&str=%s&submitAction=ENTER", baseURL, lat, lng, url.QueryEscape(query))
	log.Printf("Instamart Endpoint: %s", endpoint)

	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, err
	}

	for k, v := range cfg.Headers {
		req.Header.Set(k, v)
	}

	// Set default headers if not present
	if req.Header.Get("user-agent") == "" {
		req.Header.Set("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	}
	req.Header.Set("accept", "application/json")
	req.Header.Set("referer", "https://www.swiggy.com/instamart")

	// Override with user tokens if present
	if userTokens != nil {
		// Handle cookie first
		if cookie, ok := userTokens["cookie"]; ok && cookie != "" {
			req.Header.Set("Cookie", cookie)
		}

		// Set any other tokens as headers
		for k, v := range userTokens {
			if v != "" && k != "cookie" {
				req.Header.Set(k, v)
			}
		}
	}

	resp, err := im.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		// Log more details for debugging
		log.Printf("🔴 Instamart API error: status=%d, endpoint=%s", resp.StatusCode, endpoint)
		if resp.StatusCode == 404 {
			log.Printf("💡 Instamart requires authentication. Link your account in the app's Accounts tab.")
		}
		return nil, fmt.Errorf("instamart api status: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var listings []models.PlatformListing

	// Check data -> widgets -> ...
	data, _ := result["data"].(map[string]interface{})
	widgets, _ := data["widgets"].([]interface{})
	log.Printf("Instamart: Found %d widgets", len(widgets))

	for _, w := range widgets {
		widget, _ := w.(map[string]interface{})
		data, _ := widget["data"].(map[string]interface{})
		nodes, _ := data["nodes"].([]interface{}) // Instamart specific
		if len(nodes) > 0 {
			log.Printf("Instamart: Found %d nodes in widget", len(nodes))
		}

		for _, node := range nodes {
			n, _ := node.(map[string]interface{})
			data, _ := n["data"].(map[string]interface{})
			if data == nil {
				data = n // Fallback
			}

			name := getString(data, "name")
			if name == "" {
				name = getString(data, "display_name")
			}

			price := getFloat(data, "price")
			mrp := getFloat(data, "mrp")

			// Instamart often has 'variations'
			vars, _ := data["variations"].([]interface{})
			if len(vars) > 0 {
				v, _ := vars[0].(map[string]interface{})
				priceV := getFloat(v, "price")
				mrpV := getFloat(v, "mrp")
				if price == 0 {
					price = priceV
				}
				if mrp == 0 {
					mrp = mrpV
				}
				// price is often inside 'price' object in variation
				priceObj, _ := v["price"].(map[string]interface{})
				if priceObj != nil {
					price = getFloat(priceObj, "offer_price")
					mrp = getFloat(priceObj, "mrp")
				}
			}

			// Fallback for root price object
			if price == 0 {
				priceObj, _ := data["price"].(map[string]interface{})
				if priceObj != nil {
					price = getFloat(priceObj, "offer_price")
					mrp = getFloat(priceObj, "mrp")
				}
			}

			// Normalize Swiggy/Instamart pricing
			price = price / 100
			mrp = mrp / 100

			stock, _ := data["stock"].(map[string]interface{})
			inStock := true
			if stock != nil {
				q := getFloat(stock, "quantity")
				if q <= 0 {
					inStock = false
				}
			}

			// product_id
			pid := getString(data, "product_id")
			deepLink := fmt.Sprintf("https://www.swiggy.com/instamart/item/%s", pid)

			if name != "" && price > 0 {
				l := models.PlatformListing{
					Platform:     "Instamart",
					ProductName:  name,
					Price:        price,
					MRP:          mrp,
					InStock:      inStock,
					DeliveryTime: "15-25 mins",
					DeepLink:     deepLink,
					ScrapedAt:    time.Now(),
				}
				listings = append(listings, l)
			}
		}
	}

	log.Printf("✅ Instamart API found %d items", len(listings))
	return listings, nil
}
