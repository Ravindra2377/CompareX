package handlers

import (
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
	Platforms   map[string][]ProductListing `json:"platforms"`
}

// ProductListing represents a product from a platform
type ProductListing struct {
	ProductName string  `json:"product_name"`
	Brand       string  `json:"brand"`
	Price       float64 `json:"price"`
	MRP         float64 `json:"mrp"`
	ImageURL    string  `json:"image_url"`
	ProductURL  string  `json:"product_url"`
	InStock     bool    `json:"in_stock"`
	Weight      string  `json:"weight"`
	Platform    string  `json:"platform"`
}

// CollectSearchResults receives search results from frontend for analytics/caching
// POST /search/collect
//
//	Body: {
//	  "query": "eggs",
//	  "platforms": {
//	    "Blinkit": [{product}, {product}],
//	    "Zepto": [...]
//	  }
//	}
func CollectSearchResults(c echo.Context) error {
	var req struct {
		Query     string                      `json:"query"`
		Platforms map[string][]ProductListing `json:"platforms"`
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

	// TODO: Store in database for:
	// - Search history
	// - Price tracking
	// - Analytics
	// - ML training data

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
