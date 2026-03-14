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

func TestZeptoScraper_Search(t *testing.T) {
	// Mock Zepto API response
	mockResponse := map[string]interface{}{
		"layout": []interface{}{
			map[string]interface{}{
				"data": map[string]interface{}{
					"resolver": map[string]interface{}{
						"items": []interface{}{
							map[string]interface{}{
								"productResponse": map[string]interface{}{
									"name":         "Fresh Tomatoes",
									"id":           "z123",
									"mrp":          5000, // 50.00
									"sellingPrice": 4500, // 45.00
									"isAvailable":  true,
									"slug":         "fresh-tomatoes",
								},
							},
						},
					},
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
	config.AppConfig.Zepto.BaseURL = server.URL
	
	scraper := NewZeptoScraper()
	results, err := scraper.Search(context.Background(), "tomato", 12.9716, 77.5946, nil)
	
	require.NoError(t, err)
	assert.Len(t, results, 1)
	assert.Equal(t, "Fresh Tomatoes", results[0].ProductName)
	assert.Equal(t, 45.0, results[0].Price)
	assert.Equal(t, 50.0, results[0].MRP)
	assert.Equal(t, "10% OFF", results[0].Discount)
	assert.True(t, results[0].InStock)
}

func TestZeptoScraper_RobustPriceExtraction(t *testing.T) {
	// Mock Zepto API response where sellingPrice is 0 and discountedSellingPrice is set
	mockResponse := map[string]interface{}{
		"layout": []interface{}{
			map[string]interface{}{
				"data": map[string]interface{}{
					"resolver": map[string]interface{}{
						"items": []interface{}{
							map[string]interface{}{
								"productResponse": map[string]interface{}{
									"name":                   "Discounted Milk",
									"id":                     "z456",
									"mrp":                    6000,
									"sellingPrice":           0,
									"discountedSellingPrice": 5000,
									"isAvailable":            true,
									"slug":                   "discounted-milk",
								},
							},
						},
					},
				},
			},
		},
	}
	
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(mockResponse)
	}))
	defer server.Close()

	config.AppConfig.Zepto.BaseURL = server.URL
	
	scraper := NewZeptoScraper()
	results, _ := scraper.Search(context.Background(), "milk", 0, 0, nil)
	
	assert.Len(t, results, 1)
	assert.Equal(t, 50.0, results[0].Price)
}
