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

type ZomatoScraper struct {
	client *http.Client
}

func NewZomatoScraper() *ZomatoScraper {
	return &ZomatoScraper{
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (z *ZomatoScraper) Name() string { return "Zomato" }

func (z *ZomatoScraper) Search(ctx context.Context, query string, lat, lng float64, userTokens map[string]string) ([]models.PlatformListing, error) {
	cfg := config.AppConfig.Zomato

	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://www.zomato.com/webroutes/search/search"
	}

	endpoint := fmt.Sprintf("%s?q=%s&lat=%f&lon=%f", baseURL, url.QueryEscape(query), lat, lng)

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

		// Set any other tokens as headers
		for k, v := range userTokens {
			if v != "" && k != "cookie" {
				req.Header.Set(k, v)
			}
		}
	}

	resp, err := z.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("zomato api status: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	body, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	var listings []models.PlatformListing

	// Logic to parse Zomato webroutes response
	// This is highly specific and requires a valid response to map

	log.Printf("✅ Zomato API found %d items", len(listings))
	return listings, nil
}
