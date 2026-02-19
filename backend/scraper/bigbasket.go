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

type BigBasketScraper struct {
	client *http.Client
}

func NewBigBasketScraper() *BigBasketScraper {
	return &BigBasketScraper{
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (bb *BigBasketScraper) Name() string { return "BigBasket" }

func (bb *BigBasketScraper) Search(ctx context.Context, query string, lat, lng float64, userTokens map[string]string) ([]models.PlatformListing, error) {
	cfg := config.AppConfig.BigBasket

	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://www.bigbasket.com/listing-svc/v2/products"
	}

	endpoint := fmt.Sprintf("%s?type=pc&iss=false&page=1&tab_type=[%%22all%%22]&sorted_on=relevance&q=%s", baseURL, url.QueryEscape(query))

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
	req.Header.Set("x-channel", "BB-WEB")
	req.Header.Set("accept", "application/json")
	req.Header.Set("referer", "https://www.bigbasket.com/")

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

	resp, err := bb.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		// Log more details for debugging
		log.Printf("🔴 BigBasket API error: status=%d, endpoint=%s", resp.StatusCode, endpoint)
		if resp.StatusCode == 400 {
			log.Printf("💡 BigBasket requires authentication. Link your account in the app's Accounts tab.")
		}
		return nil, fmt.Errorf("bigbasket api status: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var listings []models.PlatformListing

	tabs, _ := result["tabs"].([]interface{})
	if len(tabs) > 0 {
		tab0, _ := tabs[0].(map[string]interface{})
		productInfo, _ := tab0["product_info"].(map[string]interface{})
		products, _ := productInfo["products"].([]interface{})

		for _, p := range products {
			item, _ := p.(map[string]interface{})

			name := getString(item, "p_desc")
			if name == "" {
				name = getString(item, "desc")
			}
			brand := getString(item, "p_brand")

			mrp := getFloat(item, "mrp")
			sp := getFloat(item, "sp")

			if sp == 0 {
				pricing, _ := item["pricing"].(map[string]interface{})
				discount, _ := pricing["discount"].(map[string]interface{})
				mrp = getFloat(discount, "mrp")
				sp = getFloat(discount, "prim_price")
			}

			sku := getString(item, "sku")
			slug := getString(item, "slug")
			if slug == "" {
				slug = "product"
			}
			deepLink := fmt.Sprintf("https://www.bigbasket.com/pd/%v/%s/", sku, slug)

			if name != "" && sp > 0 {
				l := models.PlatformListing{
					Platform:     "BigBasket",
					ProductName:  name,
					Brand:        brand,
					Price:        sp,
					MRP:          mrp,
					InStock:      true,
					DeliveryTime: "2-4 hours",
					DeepLink:     deepLink,
					ScrapedAt:    time.Now(),
				}
				listings = append(listings, l)
			}
		}
	}

	log.Printf("✅ BigBasket API found %d items", len(listings))
	return listings, nil
}
