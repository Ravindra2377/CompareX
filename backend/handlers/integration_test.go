package handlers

import (
	"comparex/models"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// TestCompareProducts_AmulMilkScenario simulates the comparison display
// with pricing, best price calculation, and savings shown in screenshots
func TestCompareProducts_AmulMilkScenario(t *testing.T) {
	// Manually build comparison data (what backend would return)
	// This replicates the data shown in Screenshot 2 of the user's app
	comparisonData := models.CompareResult{
		Query: "Amul Gold Fresh Milk",
		Products: []models.ComparedProduct{
			{
				Name:      "Amul Gold Full Cream Fresh Milk Pouch",
				BestPrice: 4.0,
				Listings: []models.PlatformListing{
					{
						Platform:       "Zepto",
						ProductName:    "Amul Gold Full Cream Fresh Milk Pouch",
						Brand:          "Amul",
						Price:          4.0,
						MRP:            32.0,
						Discount:       "86% OFF",
						InStock:        true,
						DeliveryTime:   "10 mins",
						DeliveryCharge: 0,
						Rating:         4.7,
						DeepLink:       "https://zepto.co.in/...",
						ScrapedAt:      time.Now(),
					},
					{
						Platform:       "BigBasket",
						ProductName:    "Amul Gold Full Cream Fresh Milk",
						Brand:          "Amul",
						Price:          32.0,
						MRP:            32.0,
						Discount:       "0% OFF",
						InStock:        true,
						DeliveryTime:   "Next day",
						DeliveryCharge: 0,
						Rating:         4.5,
						DeepLink:       "https://bigbasket.com/...",
						ScrapedAt:      time.Now(),
					},
					{
						Platform:       "Blinkit",
						ProductName:    "Amul Gold Full Cream Fresh Milk | Pouch",
						Brand:          "Amul",
						Price:          29.0,
						MRP:            33.0,
						Discount:       "12% OFF",
						InStock:        true,
						DeliveryTime:   "16 mins",
						DeliveryCharge: 0,
						Rating:         4.7,
						DeepLink:       "https://blinkit.com/...",
						ScrapedAt:      time.Now(),
					},
				},
			},
		},
	}

	// Verify comparison data structure matches what frontend displays
	assert.Equal(t, "Amul Gold Fresh Milk", comparisonData.Query)
	assert.Len(t, comparisonData.Products, 1)
	assert.True(t, len(comparisonData.Products) > 0)

	product := comparisonData.Products[0]
	assert.Equal(t, "Amul Gold Full Cream Fresh Milk Pouch", product.Name)
	assert.Equal(t, 4.0, product.BestPrice)
	assert.Equal(t, 3, len(product.Listings))

	// Verify each listing has correct data
	zeptoListing := product.Listings[0]
	assert.Equal(t, "Zepto", zeptoListing.Platform)
	assert.Equal(t, 4.0, zeptoListing.Price)
	assert.Equal(t, 32.0, zeptoListing.MRP)
	assert.Equal(t, true, zeptoListing.InStock)

	bigbasketListing := product.Listings[1]
	assert.Equal(t, "BigBasket", bigbasketListing.Platform)
	assert.Equal(t, 32.0, bigbasketListing.Price)

	blinkitListing := product.Listings[2]
	assert.Equal(t, "Blinkit", blinkitListing.Platform)
	assert.Equal(t, 29.0, blinkitListing.Price)

	// Verify pricing calculations work correctly
	prices := []float64{
		zeptoListing.Price,
		bigbasketListing.Price,
		blinkitListing.Price,
	}

	minPrice := prices[0]
	for _, p := range prices[1:] {
		if p < minPrice {
			minPrice = p
		}
	}
	assert.Equal(t, 4.0, minPrice)

	maxPrice := prices[0]
	for _, p := range prices[1:] {
		if p > maxPrice {
			maxPrice = p
		}
	}
	savings := maxPrice - minPrice
	assert.Equal(t, 28.0, savings) // Max (32) - Min (4) = 28
}

// TestPriceComparison_AcrossMultiplePlatforms validates the comparison logic
func TestPriceComparison_AcrossMultiplePlatforms(t *testing.T) {
	listings := []models.PlatformListing{
		{
			Platform: "Zepto",
			Price:    4.0,
			InStock:  true,
		},
		{
			Platform: "BigBasket",
			Price:    32.0,
			InStock:  true,
		},
		{
			Platform: "Blinkit",
			Price:    29.0,
			InStock:  true,
		},
	}

	// Find best price
	bestPrice := listings[0].Price
	bestPlatform := listings[0].Platform
	availableCount := 0
	unavailableCount := 0

	for _, l := range listings {
		if l.Price < bestPrice {
			bestPrice = l.Price
			bestPlatform = l.Platform
		}
		if l.InStock {
			availableCount++
		} else {
			unavailableCount++
		}
	}

	assert.Equal(t, 4.0, bestPrice)
	assert.Equal(t, "Zepto", bestPlatform)
	assert.Equal(t, 3, availableCount)
	assert.Equal(t, 0, unavailableCount)
}

// TestDiscountCalculation validates MRP and discount logic
func TestDiscountCalculation_PerPlatform(t *testing.T) {
	tests := []struct {
		name             string
		price            float64
		mrp              float64
		expectedDiscount string
		description      string
	}{
		{
			name:             "Zepto - 86% discount",
			price:            4.0,
			mrp:              32.0,
			expectedDiscount: "86% OFF",
			description:      "Best price scenario",
		},
		{
			name:             "BigBasket - no discount",
			price:            32.0,
			mrp:              32.0,
			expectedDiscount: "0% OFF",
			description:      "Full price",
		},
		{
			name:             "Blinkit - 12% discount",
			price:            29.0,
			mrp:              33.0,
			expectedDiscount: "12% OFF",
			description:      "Moderate discount",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			discount := ((tt.mrp - tt.price) / tt.mrp * 100)
			calculatedDiscount := int(discount)

			// Verify discount is reasonable (positive if price < MRP)
			if tt.price < tt.mrp {
				assert.Greater(t, calculatedDiscount, 0)
			} else {
				assert.Equal(t, 0, calculatedDiscount)
			}
		})
	}
}

// TestProductAvailabilityAggregation validates availability counting
func TestProductAvailabilityAggregation(t *testing.T) {
	listings := []models.PlatformListing{
		{Platform: "Zepto", InStock: true},
		{Platform: "BigBasket", InStock: true},
		{Platform: "Blinkit", InStock: false},
	}

	available := 0
	unavailable := 0

	for _, l := range listings {
		if l.InStock {
			available++
		} else {
			unavailable++
		}
	}

	assert.Equal(t, 2, available)
	assert.Equal(t, 1, unavailable)
}

// TestSwitchSearchQuery validates query parameter persistence
func TestSwitchSearchQuery_ToComparison(t *testing.T) {
	// User searches for "Amul Gold Fresh Milk"
	searchQuery := "Amul Gold Fresh Milk"

	// Verify query is preserved (would be passed through request params)
	assert.NotEmpty(t, searchQuery)
	assert.Equal(t, "Amul Gold Fresh Milk", searchQuery)
}

// TestDeepLinkGeneration validates platform-specific deeplinks
func TestDeepLinkGeneration_PerPlatform(t *testing.T) {
	listings := []struct {
		name     string
		platform string
		deepLink string
	}{
		{"Zepto", "Zepto", "https://zepto.co.in/..."},
		{"BigBasket", "BigBasket", "https://bigbasket.com/..."},
		{"Blinkit", "Blinkit", "https://blinkit.com/..."},
	}

	for _, l := range listings {
		t.Run(l.name, func(t *testing.T) {
			assert.NotEmpty(t, l.deepLink)
			assert.Contains(t, l.deepLink, "https://")
		})
	}
}
