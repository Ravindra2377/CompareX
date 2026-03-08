package scraper

import (
	"comparex/models"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// PlatformScraper is the interface all platform adapters must implement
type PlatformScraper interface {
	Name() string
	Search(ctx context.Context, query string, lat, lng float64, userTokens map[string]string) ([]models.PlatformListing, error)
}

// Service manages all platform scrapers and handles caching
type Service struct {
	scrapers []PlatformScraper
	redis    *redis.Client
	cacheTTL time.Duration
}

// AllPlatforms lists all supported platforms for the "Not Available" display
var AllPlatforms = []string{"Blinkit", "Zepto", "BigBasket"}

// NewService creates a new scraper service
func NewService(redisAddr string) *Service {
	rdb := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("⚠️  Redis not available (caching disabled): %v", err)
		rdb = nil
	} else {
		log.Println("✅ Redis connected for scraper caching")
	}

	s := &Service{
		redis:    rdb,
		cacheTTL: 5 * time.Minute,
	}

	// Register all platform scrapers
	s.scrapers = []PlatformScraper{
		NewBlinkitScraper(),
		NewZeptoScraper(),
		NewBigBasketScraper(),
	}

	log.Printf("✅ Scraper service initialized with %d platforms (HTTP mode)", len(s.scrapers))
	return s
}

// Compare returns real product listings from all platforms.
// Scrapes all platforms concurrently using HTTP requests.
// Caches results in Redis for subsequent calls.
// userTokens is a map of platform -> header_key -> header_value
func (s *Service) Compare(ctx context.Context, query string, lat, lng float64, userTokens map[string]map[string]string) (*models.CompareResult, error) {
	// Note: Mock mode removed - always uses real API calls
	// To get live data, link your accounts in the mobile app

	tokenHash := ""
	if len(userTokens) > 0 {
		tokenBytes, _ := json.Marshal(userTokens)
		tokenHash = fmt.Sprintf(":%x", tokenBytes)
	}

	cacheKey := fmt.Sprintf("compare:%s:%.2f:%.2f%s", query, lat, lng, tokenHash)

	// Check Redis cache first
	if s.redis != nil {
		cached, err := s.redis.Get(ctx, cacheKey).Result()
		if err == nil {
			var result models.CompareResult
			if json.Unmarshal([]byte(cached), &result) == nil {
				log.Printf("🔄 Cache hit for '%s' — returning cached data", query)
				return &result, nil
			}
		}
	}

	// Scrape all platforms concurrently
	log.Printf("🔍 Scraping all platforms for '%s'...", query)

	// Warn if no tokens provided
	if len(userTokens) == 0 {
		log.Printf("⚠️  WARNING: No authentication tokens provided!")
		log.Printf("📱 Open the app → Accounts tab → Connect platforms to get live data")
		log.Printf("   API requests will fail with 403/404 errors without authentication")
	}

	// Pass the specific tokens for each platform
	allListings := s.scrapeAllPlatforms(ctx, query, lat, lng, userTokens)

	// Determine if we actually got any real listings (Price > 0)
	hasReal := false
	for _, l := range allListings {
		if l.Price > 0 {
			hasReal = true
			break
		}
	}

	// Ensure ALL platforms are represented (show "Not Available" for missing)
	allListings = ensureAllPlatforms(allListings, query)

	result := &models.CompareResult{
		Query:    query,
		Products: groupByPlatform(allListings, query),
	}

	// Cache the results ONLY if we have at least one real listing.
	// (ensureAllPlatforms adds placeholder entries with Price=0; those should not be cached.)
	if s.redis != nil && hasReal {
		data, _ := json.Marshal(result)
		s.redis.Set(ctx, cacheKey, string(data), s.cacheTTL)
		log.Printf("✅ Cached scraped data for '%s'", query)
	} else if s.redis != nil && !hasReal {
		// Avoid keeping stale "all unavailable" cache entries
		s.redis.Del(ctx, cacheKey)
	}

	return result, nil
}

// scrapeAllPlatforms runs all scrapers concurrently using HTTP requests
func (s *Service) scrapeAllPlatforms(ctx context.Context, query string, lat, lng float64, allTokens map[string]map[string]string) []models.PlatformListing {
	var mu sync.Mutex
	var wg sync.WaitGroup
	allListings := make([]models.PlatformListing, 0)

	// Create a timeout context for all scrapers
	scrapeCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	for _, sc := range s.scrapers {
		wg.Add(1)
		go func(scraper PlatformScraper) {
			defer wg.Done()

			// Get specific tokens for this platform
			platformTokens := allTokens[scraper.Name()]
			if platformTokens == nil {
				platformTokens = allTokens[strings.ToLower(scraper.Name())]
			}
			start := time.Now()
			listings, err := scraper.Search(scrapeCtx, query, lat, lng, platformTokens)
			elapsed := time.Since(start)

			if err != nil {
				log.Printf("⚠️  %s error (%.1fs): %v", scraper.Name(), elapsed.Seconds(), err)
				return
			}

			mu.Lock()
			allListings = append(allListings, listings...)
			mu.Unlock()
			log.Printf("✅ %s returned %d results for '%s' (%.1fs)", scraper.Name(), len(listings), query, elapsed.Seconds())
		}(sc)
	}

	wg.Wait()
	return allListings
}

// ensureAllPlatforms adds "Not Available" entries for platforms missing from results
func ensureAllPlatforms(listings []models.PlatformListing, query string) []models.PlatformListing {
	// Track which platforms have results
	hasPlatform := make(map[string]bool)
	for _, l := range listings {
		hasPlatform[l.Platform] = true
	}

	// Add "Not Available" entries for missing platforms
	for _, platform := range AllPlatforms {
		if !hasPlatform[platform] {
			listings = append(listings, models.PlatformListing{
				Platform:    platform,
				ProductName: query + " (Not Available)",
				Price:       0,
				InStock:     false,
				DeepLink:    getPlatformURL(platform, query),
				ScrapedAt:   time.Now(),
			})
		}
	}

	return listings
}

// getPlatformURL returns the search URL for a platform
func getPlatformURL(platform, query string) string {
	switch platform {
	case "Blinkit":
		return fmt.Sprintf("https://blinkit.com/s/?q=%s", query)
	case "Zepto":
		return fmt.Sprintf("https://www.zeptonow.com/search?query=%s", query)
	case "BigBasket":
		return fmt.Sprintf("https://www.bigbasket.com/ps/?q=%s", query)
	case "Swiggy":
		return fmt.Sprintf("https://www.swiggy.com/search?query=%s", query)
	case "Zomato":
		return fmt.Sprintf("https://www.zomato.com/bangalore/delivery?q=%s", query)
	default:
		return ""
	}
}

// groupByPlatform groups all listings into a single ComparedProduct
// showing the product across all platforms
func groupByPlatform(listings []models.PlatformListing, query string) []models.ComparedProduct {
	if len(listings) == 0 {
		return []models.ComparedProduct{}
	}

	// Group listings by platform (best listing per platform)
	bestByPlatform := make(map[string]models.PlatformListing)
	for _, l := range listings {
		existing, ok := bestByPlatform[l.Platform]
		if !ok || (l.Price > 0 && (existing.Price == 0 || l.Price < existing.Price)) {
			bestByPlatform[l.Platform] = l
		}
	}

	// Build ordered platform listings
	var orderedListings []models.PlatformListing
	for _, platform := range AllPlatforms {
		if listing, ok := bestByPlatform[platform]; ok {
			orderedListings = append(orderedListings, listing)
		}
	}

	// Find best price (among available items)
	bestPrice := 0.0
	bestName := query
	for _, l := range orderedListings {
		if l.Price > 0 {
			if bestPrice == 0 || l.Price < bestPrice {
				bestPrice = l.Price
				bestName = l.ProductName
			}
		}
	}

	product := models.ComparedProduct{
		Name:      bestName,
		BestPrice: bestPrice,
		Listings:  orderedListings,
	}

	return []models.ComparedProduct{product}
}
