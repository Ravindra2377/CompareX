package scraper

import (
	"comparez/config"
	"comparez/models"
	"context"
	"fmt"
	"log"
	"net/http"
	"time"
)

type AmazonScraper struct {
	client      *http.Client
	apifyClient *ApifyClient
}

func NewAmazonScraper() *AmazonScraper {
	return &AmazonScraper{
		client:      &http.Client{Timeout: 15 * time.Second},
		apifyClient: NewApifyClient(config.AppConfig.ApifyApiKey),
	}
}

func (a *AmazonScraper) Name() string { return "Amazon" }

func (a *AmazonScraper) Search(ctx context.Context, query string, lat, lng float64, userTokens map[string]string) ([]models.PlatformListing, error) {
	cfg := config.AppConfig.Amazon
	
	actorID := cfg.ActorID
	if actorID == "" {
		actorID = "fast_scraper/amazon-product-scraper"
	}

	input := map[string]interface{}{
		"search": query,
		"maxResults":  20,
	}

	// Use Apify if API key is provided
	if config.AppConfig.ApifyApiKey != "" && config.AppConfig.ApifyApiKey != "PASTE_YOUR_APIFY_API_KEY_HERE" {
		log.Printf("🔍 Using Apify for Amazon search: %s", query)
		items, err := a.apifyClient.RunActorSync(ctx, actorID, input)
		if err != nil {
			log.Printf("⚠️  Apify Amazon error: %v", err)
			return nil, err
		}
		return a.mapApifyResults(items), nil
	}

	log.Printf("⚠️  Apify API Key missing for Amazon backend fallback")
	return nil, fmt.Errorf("apify api key not configured")
}

func (a *AmazonScraper) mapApifyResults(items []map[string]interface{}) []models.PlatformListing {
	var listings []models.PlatformListing
	for _, item := range items {
		name := getString(item, "title")
		if name == "" {
			name = getString(item, "name")
		}
		if name == "" {
			continue
		}

		price := getFloat(item, "priceValue")
		if price == 0 {
			price = getFloat(item, "price")
		}
		mrp := getFloat(item, "listPrice")
		if mrp == 0 {
			mrp = price
		}

		imageURL := getString(item, "image")
		if imageURL == "" {
			imageURL = getString(item, "imageUrl")
		}

		l := models.PlatformListing{
			Platform:    "Amazon",
			ProductName: name,
			Price:       price,
			MRP:         mrp,
			ImageURL:    imageURL,
			InStock:     true,
			DeepLink:    getString(item, "url"),
			ScrapedAt:   time.Now(),
		}

		if l.Price > 0 {
			listings = append(listings, l)
		}
	}
	return listings
}
