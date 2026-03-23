package handlers

import (
	"comparez/scraper"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

// ScraperSvc is the global scraper service instance
var ScraperSvc *scraper.Service

// CompareProducts handles GET /compare?q=eggs&lat=12.97&lng=77.59
func CompareProducts(c echo.Context) error {
	query := c.QueryParam("q")
	if query == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Query parameter 'q' is required",
		})
	}

	// Default location: Bangalore center
	lat := 12.9716
	lng := 77.5946

	if latStr := c.QueryParam("lat"); latStr != "" {
		if parsed, err := strconv.ParseFloat(latStr, 64); err == nil {
			lat = parsed
		}
	}
	if lngStr := c.QueryParam("lng"); lngStr != "" {
		if parsed, err := strconv.ParseFloat(lngStr, 64); err == nil {
			lng = parsed
		}
	}

	if ScraperSvc == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Scraper service not initialized",
		})
	}

	// Parse X-User-Tokens header
	var userTokens map[string]map[string]string
	userTokensStr := c.Request().Header.Get("X-User-Tokens")
	if userTokensStr != "" {
		log.Printf("📨 Received X-User-Tokens header (%d bytes)", len(userTokensStr))
		if err := json.Unmarshal([]byte(userTokensStr), &userTokens); err != nil {
			// Log error but proceed without tokens
			log.Printf("⚠️  Token header present but not parseable: %v", err)
			preview := userTokensStr
			if len(preview) > 200 {
				preview = preview[:200]
			}
			log.Printf("⚠️  Token header preview: %s", preview)
		} else {
			// Log which platforms have tokens (without exposing actual tokens)
			platformsWithTokens := []string{}
			for platform, tokens := range userTokens {
				platformsWithTokens = append(platformsWithTokens, platform)
				// Log token keys for debugging (not values)
				tokenKeys := []string{}
				for key := range tokens {
					tokenKeys = append(tokenKeys, key)
				}
				log.Printf("🔑 Header tokens for %s: keys=%v", platform, tokenKeys)
			}
			if len(platformsWithTokens) > 0 {
				log.Printf("✅ Using header tokens for platforms: %v", platformsWithTokens)
			}
		}
	} else {
		log.Printf("❌ No X-User-Tokens header found.")
		log.Printf("📱 Link your accounts in the app (Accounts tab) to get live data!")
	}

	// Fallback: use server-stored tokens uploaded via POST /tokens
	if len(userTokens) == 0 {
		log.Printf("🔍 No tokens in header, checking server-stored tokens...")
		stored := GetTokensForRequest(c)
		if len(stored) > 0 {
			userTokens = stored
			platforms := make([]string, 0, len(userTokens))
			for p, kv := range userTokens {
				platforms = append(platforms, p)
				keys := make([]string, 0, len(kv))
				for k := range kv {
					keys = append(keys, k)
				}
				log.Printf("🔑 Using stored tokens for %s (keys=%v)", p, keys)
			}
			log.Printf("✅ Using stored tokens for platforms: %v", platforms)
		} else {
			log.Printf("❌ No stored tokens found for this device")
		}
	}

	result, err := ScraperSvc.Compare(c.Request().Context(), query, lat, lng, userTokens)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Comparison failed: " + err.Error(),
		})
	}

	return c.JSON(http.StatusOK, result)
}
