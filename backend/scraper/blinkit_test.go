package scraper

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"comparex/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBlinkitScraper_Search(t *testing.T) {
	// Mock Blinkit API response
	mockResponse := map[string]interface{}{
		"products": []interface{}{
			map[string]interface{}{
				"name":       "Fresh Milk",
				"price":      3500, // 35.00
				"mrp":        4000, // 40.00
				"product_id": "p123",
				"inventory": map[string]interface{}{
					"available": true,
				},
			},
		},
	}
	
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(mockResponse)
	}))
	defer server.Close()

	// Update config to use mock server
	config.AppConfig.Blinkit.BaseURL = server.URL
	
	scraper := NewBlinkitScraper()
	results, err := scraper.Search(context.Background(), "milk", 12.9716, 77.5946, nil)
	
	require.NoError(t, err)
	assert.Len(t, results, 1)
	assert.Equal(t, "Fresh Milk", results[0].ProductName)
	assert.Equal(t, 35.0, results[0].Price)
	assert.Equal(t, 40.0, results[0].MRP)
	assert.Equal(t, "12% OFF", results[0].Discount)
	assert.True(t, results[0].InStock)
}

func TestBlinkitScraper_ErrorHandling(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer server.Close()

	config.AppConfig.Blinkit.BaseURL = server.URL
	
	scraper := NewBlinkitScraper()
	results, err := scraper.Search(context.Background(), "milk", 0, 0, nil)
	
	assert.Error(t, err)
	assert.Nil(t, results)
}
