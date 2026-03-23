package scraper

import (
	"comparez/models"
	"context"
	"fmt"
	"testing"
	"time"
)

// ──────────────────────────────────────────────────────────────────────────────
// Helpers / fixtures
// ──────────────────────────────────────────────────────────────────────────────

func makeMockListings(n int) []models.PlatformListing {
	platforms := []string{"Blinkit", "Zepto", "BigBasket"}
	listings := make([]models.PlatformListing, n)
	for i := range listings {
		listings[i] = models.PlatformListing{
			Platform:    platforms[i%len(platforms)],
			ProductName: fmt.Sprintf("Product %d Amul Gold Full Cream Milk 500ml", i),
			Brand:       "Amul",
			Price:       float64(20 + i%200),
			MRP:         float64(30 + i%200),
			InStock:     true,
			DeepLink:    fmt.Sprintf("https://blinkit.com/p/%d", i),
			ScrapedAt:   time.Now(),
		}
	}
	return listings
}

func benchmarkService(scrapers []PlatformScraper) *Service {
	return &Service{
		scrapers: scrapers,
		redis:    nil,
		cacheTTL: 5 * time.Minute,
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper function benchmarks
// ──────────────────────────────────────────────────────────────────────────────

func BenchmarkGetString(b *testing.B) {
	m := map[string]interface{}{
		"product_name": "Amul Gold Full Cream Milk 500ml",
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		getString(m, "product_name")
	}
}

func BenchmarkGetFloat(b *testing.B) {
	m := map[string]interface{}{
		"price": 29.0,
		"mrp":   33.0,
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		getFloat(m, "price")
		getFloat(m, "mrp")
	}
}

func BenchmarkParsePrice(b *testing.B) {
	cases := []string{"₹85", "₹1,299", "MRP 199", "₹29.50", "₹10,000"}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		parsePrice(cases[i%len(cases)])
	}
}

func BenchmarkParsePriceSimple(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		parsePrice("₹29")
	}
}

func BenchmarkParsePriceWithCommas(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		parsePrice("₹1,299")
	}
}

func BenchmarkMaskString(b *testing.B) {
	s := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature"
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		maskString(s)
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// Token hash benchmarks
// ──────────────────────────────────────────────────────────────────────────────

func BenchmarkBuildTokenHashEmpty(b *testing.B) {
	tokens := map[string]map[string]string{}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		buildTokenHash(tokens)
	}
}

func BenchmarkBuildTokenHashSingle(b *testing.B) {
	tokens := map[string]map[string]string{
		"Blinkit": {"auth": "abc123"},
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		buildTokenHash(tokens)
	}
}

func BenchmarkBuildTokenHashThreePlatforms(b *testing.B) {
	tokens := map[string]map[string]string{
		"Blinkit":   {"auth": "abc123", "access_token": "xyz"},
		"Zepto":     {"auth": "def456"},
		"BigBasket": {"cookie": "session=abc; csrftoken=xyz"},
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		buildTokenHash(tokens)
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// Aggregation / groupBy benchmarks
// ──────────────────────────────────────────────────────────────────────────────

func BenchmarkGroupByPlatform10(b *testing.B) {
	listings := makeMockListings(10)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		groupByPlatform(listings, "milk")
	}
}

func BenchmarkGroupByPlatform100(b *testing.B) {
	listings := makeMockListings(100)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		groupByPlatform(listings, "milk")
	}
}

func BenchmarkGroupByPlatform500(b *testing.B) {
	listings := makeMockListings(500)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		groupByPlatform(listings, "milk")
	}
}

func BenchmarkEnsureAllPlatforms(b *testing.B) {
	listings := makeMockListings(20)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ensureAllPlatforms(listings, "milk")
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// Concurrent scrape benchmarks (with mock scrapers — no real HTTP)
// ──────────────────────────────────────────────────────────────────────────────

func BenchmarkScrapeAllPlatformsInstantResponse(b *testing.B) {
	scrapers := []PlatformScraper{
		&MockScraper{name: "Blinkit", listings: makeMockListings(20)},
		&MockScraper{name: "Zepto", listings: makeMockListings(15)},
		&MockScraper{name: "BigBasket", listings: makeMockListings(18)},
	}
	svc := benchmarkService(scrapers)
	tokens := map[string]map[string]string{}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		svc.scrapeAllPlatforms(context.Background(), "milk", 12.97, 77.59, tokens)
	}
}

func BenchmarkScrapeAllPlatformsWithDelay(b *testing.B) {
	scrapers := []PlatformScraper{
		&MockScraper{name: "Blinkit", listings: makeMockListings(20), delay: 5 * time.Millisecond},
		&MockScraper{name: "Zepto", listings: makeMockListings(15), delay: 8 * time.Millisecond},
		&MockScraper{name: "BigBasket", listings: makeMockListings(18), delay: 4 * time.Millisecond},
	}
	svc := benchmarkService(scrapers)
	tokens := map[string]map[string]string{}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		svc.scrapeAllPlatforms(context.Background(), "milk", 12.97, 77.59, tokens)
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// Full Compare pipeline benchmark (no Redis, mock scrapers)
// ──────────────────────────────────────────────────────────────────────────────

func BenchmarkComparePipelineSmall(b *testing.B) {
	scrapers := []PlatformScraper{
		&MockScraper{name: "Blinkit", listings: makeMockListings(5)},
		&MockScraper{name: "Zepto", listings: makeMockListings(5)},
		&MockScraper{name: "BigBasket", listings: makeMockListings(5)},
	}
	svc := benchmarkService(scrapers)
	tokens := map[string]map[string]string{}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = svc.Compare(context.Background(), "milk", 12.97, 77.59, tokens)
	}
}

func BenchmarkComparePipelineLarge(b *testing.B) {
	scrapers := []PlatformScraper{
		&MockScraper{name: "Blinkit", listings: makeMockListings(100)},
		&MockScraper{name: "Zepto", listings: makeMockListings(100)},
		&MockScraper{name: "BigBasket", listings: makeMockListings(100)},
	}
	svc := benchmarkService(scrapers)
	tokens := map[string]map[string]string{}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = svc.Compare(context.Background(), "milk", 12.97, 77.59, tokens)
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// Parallel benchmark — simulate concurrent user requests
// ──────────────────────────────────────────────────────────────────────────────

func BenchmarkComparePipelineParallel(b *testing.B) {
	scrapers := []PlatformScraper{
		&MockScraper{name: "Blinkit", listings: makeMockListings(20)},
		&MockScraper{name: "Zepto", listings: makeMockListings(20)},
		&MockScraper{name: "BigBasket", listings: makeMockListings(20)},
	}
	svc := benchmarkService(scrapers)
	tokens := map[string]map[string]string{}
	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			_, _ = svc.Compare(context.Background(), "milk", 12.97, 77.59, tokens)
		}
	})
}
