package handlers

import (
	"comparez/database"
	"comparez/models"
	"log"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

// SearchResult represents a product search result from frontend
type SearchResult struct {
	Query       string                      `json:"query"`
	Timestamp   time.Time                   `json:"timestamp"`
	ResultCount int                         `json:"result_count"`
	Platforms   map[string][]models.PlatformListing `json:"platforms"`
}

// CollectSearchResults receives search results from frontend for analytics/caching
// POST /search/collect
func CollectSearchResults(c echo.Context) error {
	log.Printf("📥 Received search collection request from frontend")
	var req struct {
		Query     string                               `json:"query"`
		UserID    uint                                 `json:"user_id"`
		Platforms map[string][]models.PlatformListing `json:"platforms"`
	}

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	if req.Query == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Query is required",
		})
	}

	// Count total results
	totalResults := 0
	for _, products := range req.Platforms {
		totalResults += len(products)
	}

	// Log the collected data
	log.Printf("📊 Collected search results:")
	log.Printf("   Query: %s", req.Query)
	log.Printf("   Platforms: %d", len(req.Platforms))
	log.Printf("   Total Products: %d", totalResults)
	for platform, products := range req.Platforms {
		log.Printf("   - %s: %d products", platform, len(products))
	}

	// Store in database for testing and history
	if database.DB != nil {
		history := models.SearchHistory{
			Query:       req.Query,
			UserID:      req.UserID,
			ResultCount: totalResults,
			CreatedAt:   time.Now(),
		}

		// Determine best price and platform
		var bestPrice float64
		var bestPlatform string
		var platforms []string

		allListings := []models.PlatformListing{}
		for platform, listings := range req.Platforms {
			platforms = append(platforms, platform)
			for _, l := range listings {
				l.Platform = platform // Ensure platform is set
				l.ScrapedAt = time.Now()
				if l.DeepLink == "" && l.ProductURL != "" {
					l.DeepLink = l.ProductURL
				}
				allListings = append(allListings, l)

				if l.Price > 0 && (bestPrice == 0 || l.Price < bestPrice) {
					bestPrice = l.Price
					bestPlatform = platform
				}
			}
		}

		history.BestPrice = bestPrice
		history.BestPlatform = bestPlatform
		// history.PlatformsUsed = strings.Join(platforms, ", ") // Simple CSV for now

		if err := database.DB.Create(&history).Error; err != nil {
			log.Printf("❌ Failed to save search history: %v", err)
		} else {
			// Save individual listings
			for i := range allListings {
				allListings[i].SearchHistoryID = history.ID
			}
			if len(allListings) > 0 {
				if err := database.DB.Create(&allListings).Error; err != nil {
					log.Printf("❌ Failed to save product listings: %v", err)
				}
			}
			log.Printf("✅ Saved search history (ID: %d) with %d listings", history.ID, len(allListings))
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status":        "collected",
		"query":         req.Query,
		"platforms":     len(req.Platforms),
		"total_results": totalResults,
	})
}

// GetSearchHistory returns recent searches for the user
// GET /search/history?limit=10
func GetSearchHistory(c echo.Context) error {
	// TODO: Implement database query
	// For now, return empty
	return c.JSON(http.StatusOK, map[string]interface{}{
		"searches": []interface{}{},
		"count":    0,
	})
}

// ValidateTokens checks if stored tokens are still valid by testing each platform
// GET /search/validate
func ValidateTokens(c echo.Context) error {
	key := deviceKey(c)

	Store.mu.RLock()
	deviceTokens, exists := Store.byKey[key]
	Store.mu.RUnlock()

	if !exists {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"valid":    []string{},
			"invalid":  []string{},
			"untested": []string{},
			"message":  "No tokens stored",
		})
	}

	// For each platform, check if tokens exist
	valid := make([]string, 0)
	invalid := make([]string, 0)

	for platform, tokens := range deviceTokens.Platforms {
		if len(tokens) > 0 {
			// Basic validation: check if required keys exist
			hasTokens := false
			switch platform {
			case "Blinkit":
				hasTokens = tokens["auth"] != "" || tokens["cookie"] != ""
			case "Zepto":
				hasTokens = tokens["user"] != "" || tokens["cookie"] != ""
			case "BigBasket":
				hasTokens = tokens["cookie"] != ""
			default:
				hasTokens = len(tokens) > 0
			}

			if hasTokens {
				valid = append(valid, platform)
			} else {
				invalid = append(invalid, platform)
			}
		} else {
			invalid = append(invalid, platform)
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"valid":     valid,
		"invalid":   invalid,
		"message":   "Token validation completed",
		"timestamp": time.Now(),
	})
}
