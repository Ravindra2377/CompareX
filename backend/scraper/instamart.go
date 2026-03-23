package scraper

import (
	"bytes"
	"comparez/config"
	"comparez/models"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type InstamartScraper struct {
	client     *http.Client
	apifyClient *ApifyClient
}

func NewInstamartScraper() *InstamartScraper {
	return &InstamartScraper{
		client:      &http.Client{Timeout: 15 * time.Second},
		apifyClient: NewApifyClient(config.AppConfig.ApifyApiKey),
	}
}

func (i *InstamartScraper) Name() string { return "Instamart" }

func (i *InstamartScraper) Search(ctx context.Context, query string, lat, lng float64, userTokens map[string]string) ([]models.PlatformListing, error) {
	cfg := config.AppConfig.Instamart
	
	actorID := cfg.ActorID
	if actorID == "" {
		actorID = "smacient/swiggy-instamart-data-extractor"
	}

	city := ResolveCity(lat, lng)
	input := map[string]interface{}{
		"searchQuery": query,
		"city":        city,
		"maxResults":  30,
	}

	// Try to use Apify if API key is provided
	if config.AppConfig.ApifyApiKey != "" && config.AppConfig.ApifyApiKey != "PASTE_YOUR_APIFY_API_KEY_HERE" {
		log.Printf("🔍 Using Apify for Instamart search (%s): %s", city, query)
		items, err := i.apifyClient.RunActorSync(ctx, actorID, input)
		if err != nil {
			log.Printf("⚠️  Apify Instamart error: %v. Falling back to direct API.", err)
		} else {
			return i.mapApifyResults(items), nil
		}
	} else if config.AppConfig.ApifyApiKey == "PASTE_YOUR_APIFY_API_KEY_HERE" {
		log.Printf("⚠️  Apify API Key is still set to placeholder! Please update platform_config.json")
	}

	// Fallback to direct API if Apify fails or is not configured
	log.Printf("🔍 Using direct API for Instamart search (fallback): %s", query)
	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://www.swiggy.com/api/instamart/search/v2"
	}

	payload := map[string]interface{}{
		"query": query,
		"lat":   lat,
		"lng":   lng,
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

	// Set default headers
	if req.Header.Get("user-agent") == "" {
		req.Header.Set("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	}
	if req.Header.Get("content-type") == "" {
		req.Header.Set("content-type", "application/json")
	}

	// Override with user tokens
	if userTokens != nil {
		for k, v := range userTokens {
			if v != "" {
				req.Header.Set(k, v)
			}
		}
	}

	resp, err := i.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		log.Printf("🔴 Instamart API error: status=%d", resp.StatusCode)
		return nil, fmt.Errorf("instamart api status: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	// Navigate the Swiggy Instamart JSON structure
	data, _ := result["data"].(map[string]interface{})
	cards, _ := data["cards"].([]interface{})

	var listings []models.PlatformListing
	for _, c := range cards {
		cardMap, _ := c.(map[string]interface{})
		cardObj, _ := cardMap["card"].(map[string]interface{})
		cardData, _ := cardObj["card"].(map[string]interface{})
		
		gridElements, _ := cardData["gridElements"].(map[string]interface{})
		infoWithStyle, _ := gridElements["infoWithStyle"].(map[string]interface{})
		items, _ := infoWithStyle["items"].([]interface{})
        
        if len(items) == 0 {
            items, _ = cardData["items"].([]interface{})
        }

		for _, item := range items {
			p, _ := item.(map[string]interface{})
			info, _ := p["info"].(map[string]interface{})
			if info == nil {
				info = p
			}

			name := getString(info, "name")
			if name == "" {
				name = getString(info, "product_name")
			}
			if name == "" {
				continue
			}

			price := getFloat(info, "price")
			if price == 0 {
				price = getFloat(info, "sp")
			}
			
			mrp := getFloat(info, "mrp")
			if mrp == 0 {
				pd, _ := info["price_details"].(map[string]interface{})
				mrp = getFloat(pd, "mrp")
			}
			if mrp == 0 {
				mrp = price
			}

			price = price / 100
			mrp = mrp / 100

			imageId := getString(info, "imageId")
			if imageId == "" {
				imageId = getString(info, "cloudinaryImageId")
			}
			imageURL := ""
			if imageId != "" {
				imageURL = fmt.Sprintf("https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_300,h_300,c_fill/%s", imageId)
			}

			deepLink := fmt.Sprintf("https://www.swiggy.com/instamart/search?query=%s", query)

			if price > 0 {
				l := models.PlatformListing{
					Platform:     "Instamart",
					ProductName:  name,
					Price:        price,
					MRP:          mrp,
					ImageURL:     imageURL,
					InStock:      getBool(info, "inStock"),
					DeliveryTime: "15-20 mins",
					DeepLink:     deepLink,
					ScrapedAt:    time.Now(),
				}
				l.Quantity = getString(info, "quantity")
				if l.Quantity == "" {
					l.Quantity = getString(info, "unitItems")
				}
				listings = append(listings, l)
			}
		}
	}

	log.Printf("✅ Instamart API found %d items", len(listings))
	return listings, nil
}

func (i *InstamartScraper) mapApifyResults(items []map[string]interface{}) []models.PlatformListing {
	var listings []models.PlatformListing
	for _, item := range items {
		name := getString(item, "name")
		if name == "" {
			continue
		}

		price := getFloat(item, "price")
		mrp := getFloat(item, "mrp")
		if mrp == 0 {
			mrp = price
		}

		l := models.PlatformListing{
			Platform:    "Instamart",
			ProductName: name,
			Brand:       getString(item, "brand"),
			Price:       price,
			MRP:         mrp,
			Discount:    getString(item, "discount"),
			ImageURL:    getString(item, "imageUrl"),
			InStock:     getBool(item, "inStock"),
			Quantity:    getString(item, "quantity"),
			ScrapedAt:   time.Now(),
		}

		// Fallback image handling if imageUrl is missing but imageId exists (though Apify usually provides imageUrl)
		if l.ImageURL == "" {
			imageId := getString(item, "imageId")
			if imageId != "" {
				l.ImageURL = fmt.Sprintf("https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_300,h_300,c_fill/%s", imageId)
			}
		}

		if l.Price > 0 {
			listings = append(listings, l)
		}
	}
	return listings
}

func ResolveCity(lat, lng float64) string {
	// Simple lookup for major Indian cities based on coordinates
	// Defaults to Bangalore if near 12.9, 77.5
	if lat > 12.8 && lat < 13.1 && lng > 77.4 && lng < 77.8 {
		return "Bangalore"
	}
	// Chennai
	if lat > 12.9 && lat < 13.2 && lng > 80.1 && lng < 80.4 {
		return "Chennai"
	}
	// Mumbai
	if lat > 18.8 && lat < 19.3 && lng > 72.7 && lng < 73.0 {
		return "Mumbai"
	}
	// Delhi/NCR
	if lat > 28.4 && lat < 28.8 && lng > 76.8 && lng < 77.4 {
		return "Delhi"
	}
	// Hyderabad
	if lat > 17.2 && lat < 17.6 && lng > 78.3 && lng < 78.6 {
		return "Hyderabad"
	}
	// Default to Bangalore as it's the primary market
	return "Bangalore"
}
