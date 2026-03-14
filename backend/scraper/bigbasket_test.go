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

func TestBigBasketScraper_Search(t *testing.T) {
	// Mock BigBasket API response
	mockResponse := map[string]interface{}{
		"tabs": []interface{}{
			map[string]interface{}{
				"product_info": map[string]interface{}{
					"products": []interface{}{
						map[string]interface{}{
							"p_desc":  "Orange Juice",
							"p_brand": "Real",
							"mrp":     100.0,
							"sp":      90.0,
							"sku":     "bb123",
							"slug":    "orange-juice",
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
	config.AppConfig.BigBasket.BaseURL = server.URL
	
	scraper := NewBigBasketScraper()
	results, err := scraper.Search(context.Background(), "juice", 0, 0, nil)
	
	require.NoError(t, err)
	assert.Len(t, results, 1)
	assert.Equal(t, "Orange Juice", results[0].ProductName)
	assert.Equal(t, 90.0, results[0].Price)
	assert.Equal(t, 100.0, results[0].MRP)
	assert.Equal(t, "10% OFF", results[0].Discount)
}

func TestBigBasketScraper_PricingFallback(t *testing.T) {
	// Mock BigBasket API response where sp is 0 and pricing sub-object is used
	mockResponse := map[string]interface{}{
		"tabs": []interface{}{
			map[string]interface{}{
				"product_info": map[string]interface{}{
					"products": []interface{}{
						map[string]interface{}{
							"p_desc": "Apple",
							"sp":     0.0,
							"pricing": map[string]interface{}{
								"discount": map[string]interface{}{
									"mrp":        50.0,
									"prim_price": 40.0,
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

	config.AppConfig.BigBasket.BaseURL = server.URL
	
	scraper := NewBigBasketScraper()
	results, _ := scraper.Search(context.Background(), "apple", 0, 0, nil)
	
	assert.Len(t, results, 1)
	assert.Equal(t, 40.0, results[0].Price)
}
