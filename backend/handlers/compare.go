package handlers

import (
	"comparez/scraper"
	"net/http"

	"github.com/labstack/echo/v4"
)

// ScraperSvc is the global scraper service instance (retired in V5.1)
var ScraperSvc *scraper.Service

// CompareProducts handles GET /compare?q=eggs&lat=12.97&lng=77.59
// NOTE: Retired in AI Platform V5.1 in favor of Universal Web Intelligence.
func CompareProducts(c echo.Context) error {
	query := c.QueryParam("q")
	if query == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Query parameter 'q' is required",
		})
	}

	c.Response().Header().Set("X-CompareZ-Deprecated", "Legacy retailer scraper comparison is retired in AI Platform V5.1")
	return c.JSON(http.StatusGone, map[string]string{
		"error":   "scraper_comparison_retired",
		"message": "Legacy retailer scraper comparison is retired in CompareZ AI Platform. Use /ai/research or Universal Product Intelligence.",
	})
}

