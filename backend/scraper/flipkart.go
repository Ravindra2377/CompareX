package scraper

import (
	"comparex/config"
	"comparex/models"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

type FlipkartScraper struct {
	client      *http.Client
	apifyClient *ApifyClient
}

func NewFlipkartScraper() *FlipkartScraper {
	return &FlipkartScraper{
		client:      &http.Client{Timeout: 15 * time.Second},
		apifyClient: NewApifyClient(config.AppConfig.ApifyApiKey),
	}
}

func (f *FlipkartScraper) Name() string { return "Flipkart" }

func (f *FlipkartScraper) Search(ctx context.Context, query string, lat, lng float64, userTokens map[string]string) ([]models.PlatformListing, error) {
	cfg := config.AppConfig.Flipkart
	
	actorID := cfg.ActorID
	if actorID == "" {
		actorID = "apify/flipkart-scraper"
	}

	input := map[string]interface{}{
		"searchQuery": query,
		"maxResults":  20,
	}

	// Use Apify if API key is provided
	if config.AppConfig.ApifyApiKey != "" && config.AppConfig.ApifyApiKey != "PASTE_YOUR_APIFY_API_KEY_HERE" {
		log.Printf("🔍 Using Apify for Flipkart search: %s", query)
		items, err := f.apifyClient.RunActorSync(ctx, actorID, input)
		if err != nil {
			log.Printf("⚠️  Apify Flipkart error: %v. Falling back to direct HTTP.", err)
		} else {
			return f.mapApifyResults(items), nil
		}
	}

	log.Printf("🔍 Using direct HTTP fallback for Flipkart search: %s", query)
	return f.scrapeDirect(ctx, query)
}

func (f *FlipkartScraper) scrapeDirect(ctx context.Context, query string) ([]models.PlatformListing, error) {
	searchURL := fmt.Sprintf("https://www.flipkart.com/search?q=%s", url.QueryEscape(query))
	req, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
	if err != nil {
		return nil, err
	}

	// Set standard headers to mimic a mobile browser
	req.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")

	resp, err := f.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("flipkart direct search status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	html := string(body)
	var listings []models.PlatformListing

	// Simple regex-based extraction for name, price, and link
	// Note: This is fragile and only a last-resort fallback.
	// Titles are often in div[class="KzDlHZ"] or similar
	reTitle := regexp.MustCompile(`<div[^>]*class="[^"]*KzDlHZ[^"]*"[^>]*>([^<]+)</div>`)
	rePrice := regexp.MustCompile(`<div[^>]*class="[^"]*Nx9Wp0[^"]*"[^>]*>₹([0-9,]+)</div>`)
	
	titles := reTitle.FindAllStringSubmatch(html, -1)
	prices := rePrice.FindAllStringSubmatch(html, -1)

	for i := 0; i < len(titles) && i < len(prices); i++ {
		name := titles[i][1]
		priceStr := strings.ReplaceAll(prices[i][1], ",", "")
		price := parsePrice(priceStr)

		if price > 0 {
			listings = append(listings, models.PlatformListing{
				Platform:    "Flipkart",
				ProductName: name,
				Price:       price,
				MRP:         price,
				InStock:     true,
				DeepLink:    searchURL,
				ScrapedAt:   time.Now(),
			})
		}
	}

	// Also try grid layout classes if list classes failed
	if len(listings) == 0 {
		reTitleGrid := regexp.MustCompile(`<a[^>]*class="[^"]*IRpwTa[^"]*"[^>]*>([^<]+)</a>`)
		rePriceGrid := regexp.MustCompile(`<div[^>]*class="[^"]*_30jeq3[^"]*"[^>]*>₹([0-9,]+)</div>`)
		
		titlesGrid := reTitleGrid.FindAllStringSubmatch(html, -1)
		pricesGrid := rePriceGrid.FindAllStringSubmatch(html, -1)

		for i := 0; i < len(titlesGrid) && i < len(pricesGrid); i++ {
			name := titlesGrid[i][1]
			priceStr := strings.ReplaceAll(pricesGrid[i][1], ",", "")
			price := parsePrice(priceStr)

			if price > 0 {
				listings = append(listings, models.PlatformListing{
					Platform:    "Flipkart",
					ProductName: name,
					Price:       price,
					MRP:         price,
					InStock:     true,
					DeepLink:    searchURL,
					ScrapedAt:   time.Now(),
				})
			}
		}
	}

	log.Printf("✅ Flipkart direct HTTP found %d items", len(listings))
	return listings, nil
}

func (f *FlipkartScraper) mapApifyResults(items []map[string]interface{}) []models.PlatformListing {
	var listings []models.PlatformListing
	for _, item := range items {
		name := getString(item, "title")
		if name == "" {
			name = getString(item, "productName")
		}
		if name == "" {
			continue
		}

		price := getFloat(item, "price")
		mrp := getFloat(item, "mrp")
		if mrp == 0 {
			mrp = getFloat(item, "originalPrice")
		}
		if mrp == 0 {
			mrp = price
		}

		imageURL := getString(item, "thumbnail")
		if imageURL == "" {
			thumbnails := extractArray(item, "thumbnails")
			if len(thumbnails) > 0 {
				imageURL, _ = thumbnails[0].(string)
			}
		}

		l := models.PlatformListing{
			Platform:    "Flipkart",
			ProductName: name,
			Price:       price,
			MRP:         mrp,
			ImageURL:    imageURL,
			InStock:     true, // Default to true if not specified
			DeepLink:    getString(item, "url"),
			ScrapedAt:   time.Now(),
		}

		if l.Price > 0 {
			listings = append(listings, l)
		}
	}
	return listings
}
