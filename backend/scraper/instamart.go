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

	// Instamart requires the payload in a specific format for v2
	payloadMap := map[string]interface{}{
		"pageType": "INSTAMART_SEARCH",
		"query":    cleanQuery,
		"lat":      fmt.Sprintf("%f", lat),
		"lng":      fmt.Sprintf("%f", lng),
	}

	payloadBytes, err := json.Marshal(payloadMap)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	searchURL := platformConfig.BaseURL

	req, err := http.NewRequestWithContext(ctx, "POST", searchURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Apply default headers from config
	for k, v := range platformConfig.Headers {
		req.Header.Set(k, v)
	}

	// Must have JSON content type for the POST payload
	req.Header.Set("Content-Type", "application/json")

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
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	return s.extractProducts(resp.Body, query)
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

		gridElements, ok := cardData["gridElements"].(map[string]interface{})
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

	log.Printf("[Instamart] Extracted %d products for query: %s", len(listings), query)
	return listings, nil
}
