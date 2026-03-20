package scraper

import (
	"comparex/models"
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// MockScraper implements PlatformScraper for testing
type MockScraper struct {
	name     string
	listings []models.PlatformListing
	err      error
	delay    time.Duration
}

func (m *MockScraper) Name() string {
	return m.name
}

func (m *MockScraper) Search(ctx context.Context, query string, lat, lng float64, userTokens map[string]string) ([]models.PlatformListing, error) {
	if m.delay > 0 {
		time.Sleep(m.delay)
	}
	if m.err != nil {
		return nil, m.err
	}
	return m.listings, nil
}

func TestBuildTokenHashEmpty(t *testing.T) {
	hash := buildTokenHash(map[string]map[string]string{})
	assert.Equal(t, "", hash)
}

func TestBuildTokenHashSinglePlatform(t *testing.T) {
	tokens := map[string]map[string]string{
		"Blinkit": {
			"auth": "token123",
		},
	}

	hash := buildTokenHash(tokens)
	assert.NotEmpty(t, hash)
	assert.True(t, len(hash) > 1) // Should have ": " prefix
}

func TestBuildTokenHashConsistency(t *testing.T) {
	tokens := map[string]map[string]string{
		"Blinkit": {
			"auth": "token123",
		},
		"Zepto": {
			"auth": "token456",
		},
	}

	hash1 := buildTokenHash(tokens)
	hash2 := buildTokenHash(tokens)

	assert.Equal(t, hash1, hash2, "Hash should be consistent for same tokens")
}

func TestBuildTokenHashDifferent(t *testing.T) {
	tokens1 := map[string]map[string]string{
		"Blinkit": {"auth": "token123"},
	}

	tokens2 := map[string]map[string]string{
		"Blinkit": {"auth": "token456"},
	}

	hash1 := buildTokenHash(tokens1)
	hash2 := buildTokenHash(tokens2)

	assert.NotEqual(t, hash1, hash2, "Different tokens should produce different hashes")
}

func TestBuildTokenHashMultiplePlatforms(t *testing.T) {
	tokens := map[string]map[string]string{
		"Blinkit": {
			"auth":   "blinkit-token",
			"cookie": "blinkit-cookie",
		},
		"Zepto": {
			"auth": "zepto-token",
		},
		"BigBasket": {
			"auth": "basket-token",
		},
	}

	hash := buildTokenHash(tokens)
	assert.NotEmpty(t, hash)
	assert.True(t, len(hash) > 1)
}

func TestCompareWithoutRedis(t *testing.T) {
	service := &Service{
		redis:    nil,
		cacheTTL: 5 * time.Minute,
		scrapers: []PlatformScraper{
			&MockScraper{
				name: "Blinkit",
				listings: []models.PlatformListing{
					{
						Platform:    "Blinkit",
						ProductName: "Test Product",
						Price:       99.99,
						InStock:     true,
					},
				},
			},
			&MockScraper{
				name:     "Zepto",
				listings: []models.PlatformListing{},
				err:      nil,
			},
		},
	}

	ctx := context.Background()
	result, err := service.Compare(ctx, "test", 28.7041, 77.1025, map[string]map[string]string{})

	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "test", result.Query)
}

func TestServiceInitialization(t *testing.T) {
	service := &Service{
		redis:    nil,
		cacheTTL: 5 * time.Minute,
		scrapers: []PlatformScraper{},
	}

	assert.NotNil(t, service)
	assert.Nil(t, service.redis)
	assert.Equal(t, 5*time.Minute, service.cacheTTL)
}

func TestScrapeAllPlatformsConcurrency(t *testing.T) {
	service := &Service{
		redis:    nil,
		cacheTTL: 5 * time.Minute,
		scrapers: []PlatformScraper{
			&MockScraper{
				name: "Blinkit",
				listings: []models.PlatformListing{
					{Platform: "Blinkit", Price: 100},
					{Platform: "Blinkit", Price: 110},
				},
			},
			&MockScraper{
				name: "Zepto",
				listings: []models.PlatformListing{
					{Platform: "Zepto", Price: 95},
				},
			},
			&MockScraper{
				name:     "BigBasket",
				listings: []models.PlatformListing{},
			},
		},
	}

	ctx := context.Background()
	listings := service.scrapeAllPlatforms(ctx, "test", 0, 0, map[string]map[string]string{})

	assert.Len(t, listings, 3)
}

func TestGroupByPlatformWithImage(t *testing.T) {
	listings := []models.PlatformListing{
		{
			Platform:    "Blinkit",
			ProductName: "Milk",
			Price:       50,
			ImageURL:    "https://example.com/blinkit.jpg",
		},
		{
			Platform:    "Zepto",
			ProductName: "Milk",
			Price:       48,
			ImageURL:    "https://example.com/zepto.jpg",
		},
	}

	result := groupByPlatform(listings, "milk")

	require.NotEmpty(t, result)
	assert.Equal(t, "https://example.com/blinkit.jpg", result[0].ImageURL) // Picks first available
}

func TestEnsureAllPlatforms(t *testing.T) {
	listings := []models.PlatformListing{
		{
			Platform: "Blinkit",
			Price:    100,
		},
	}

	result := ensureAllPlatforms(listings, "test")

	platformsFound := make(map[string]bool)
	for _, listing := range result {
		platformsFound[listing.Platform] = true
	}

	// Should include all platforms
	for _, platform := range AllPlatforms {
		assert.True(t, platformsFound[platform], "Platform %s should be in result", platform)
	}
}

func TestProductListingWithZeroPrice(t *testing.T) {
	listings := []models.PlatformListing{
		{
			Platform:    "Blinkit",
			ProductName: "Test",
			Price:       0, // Placeholder/not available
			InStock:     false,
		},
	}

	assert.Equal(t, 0.0, listings[0].Price)
	assert.False(t, listings[0].InStock)
}

func TestCompareResultStructure(t *testing.T) {
	product := models.ComparedProduct{
		Name:      "Rice",
		BestPrice: 89.99,
		Listings: []models.PlatformListing{
			{Platform: "Zepto", Price: 89.99},
			{Platform: "Blinkit", Price: 99.99},
		},
	}

	result := models.CompareResult{
		Query:    "rice",
		Products: []models.ComparedProduct{product},
	}

	assert.Equal(t, "rice", result.Query)
	assert.Len(t, result.Products, 1)
	assert.Equal(t, 89.99, result.Products[0].BestPrice)
	assert.Len(t, result.Products[0].Listings, 2)
}

func TestBuildTokenHashWithMultipleKeys(t *testing.T) {
	tokens := map[string]map[string]string{
		"Blinkit": {
			"cookie1": "value1",
			"cookie2": "value2",
			"auth":    "token",
		},
	}

	hash1 := buildTokenHash(tokens)
	assert.NotEmpty(t, hash1)

	// Add more tokens
	tokens["Blinkit"]["cookie3"] = "value3"
	hash2 := buildTokenHash(tokens)

	assert.NotEqual(t, hash1, hash2, "Adding tokens should change hash")
}

func TestCompareContextTimeout(t *testing.T) {
	service := &Service{
		redis:    nil,
		cacheTTL: 5 * time.Minute,
		scrapers: []PlatformScraper{
			&MockScraper{
				name:  "SlowScraper",
				delay: 2 * time.Second, // Slow but within 30s timeout
				listings: []models.PlatformListing{
					{Platform: "SlowScraper", Price: 100},
				},
			},
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	result, err := service.Compare(ctx, "test", 0, 0, map[string]map[string]string{})

	require.NoError(t, err)
	assert.NotNil(t, result)
}
