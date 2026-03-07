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

type SwiggyScraper struct {
	client *http.Client
}

func NewSwiggyScraper() *SwiggyScraper {
	return &SwiggyScraper{
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (s *SwiggyScraper) Name() string { return "Swiggy" }

func (s *SwiggyScraper) Search(ctx context.Context, query string, lat, lng float64, userTokens map[string]string) ([]models.PlatformListing, error) {
	cfg := config.AppConfig.Swiggy

	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://www.swiggy.com/dapi/restaurants/search/v3"
	}

	endpoint := fmt.Sprintf("%s?lat=%f&lng=%f&str=%s&submitAction=ENTER", baseURL, lat, lng, url.QueryEscape(query))

	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, err
	}

	for k, v := range cfg.Headers {
		req.Header.Set(k, v)
	}

	// Override with user tokens if present
	if userTokens != nil {
		// Handle cookie first
		if cookie, ok := userTokens["cookie"]; ok && cookie != "" {
			req.Header.Set("Cookie", cookie)
		}

		// Handle Swiggy authHeaders (which is a JSON string)
		if authStr, ok := userTokens["authHeaders"]; ok && authStr != "" {
			var authMap map[string]string
			if err := json.Unmarshal([]byte(authStr), &authMap); err == nil {
				for k, v := range authMap {
					if k != "cookie" { // Don't override standard ones if needed
						req.Header.Set(k, v)
					}
				}
			}
		}

		// Set any other tokens as headers
		for k, v := range userTokens {
			if v != "" && k != "cookie" && k != "authHeaders" && k != "swiggyUserInfo" && k != "verifiedInstamartApi" && k != "verifiedInstamartVariant" && k != "swiggyUserId" {
				req.Header.Set(k, v)
			}
		}
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("swiggy api status: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var listings []models.PlatformListing

	data, _ := result["data"].(map[string]interface{})
	cards, _ := data["cards"].([]interface{})

	for _, c := range cards {
		cardGroup, _ := c.(map[string]interface{})
		groupedCard, _ := cardGroup["groupedCard"].(map[string]interface{})
		cardGroupV2, _ := groupedCard["cardGroupMap"].(map[string]interface{})
		dish, _ := cardGroupV2["DISH"].(map[string]interface{})

		if dish != nil {
			cards2, _ := dish["cards"].([]interface{})
			for _, card2 := range cards2 {
				c2, _ := card2.(map[string]interface{})
				card3, _ := c2["card"].(map[string]interface{})
				card4, _ := card3["card"].(map[string]interface{})

				info, _ := card4["info"].(map[string]interface{})
				restaurant, _ := card4["restaurant"].(map[string]interface{})
				rInfo, _ := restaurant["info"].(map[string]interface{})

				name := getString(info, "name")
				price := getFloat(info, "price") / 100
				if price == 0 {
					price = getFloat(info, "defaultPrice") / 100
				}

				restaurantName := getString(rInfo, "name")
				rating := getString(rInfo, "avgRating")

				slug := getString(rInfo, "slugs/city")
				rid := getString(rInfo, "id")
				deepLink := fmt.Sprintf("https://www.swiggy.com/restaurants/%s-%s", slug, rid)

				if name != "" && price > 0 {
					l := models.PlatformListing{
						Platform:     "Swiggy",
						ProductName:  name,
						Brand:        restaurantName,
						Price:        price,
						InStock:      true,
						DeliveryTime: "30-45 mins",
						Rating:       parsePrice(rating),
						DeepLink:     deepLink,
						ScrapedAt:    time.Now(),
					}
					listings = append(listings, l)
				}
			}
		}
	}

	log.Printf("✅ Swiggy API found %d items", len(listings))
	return listings, nil
}
