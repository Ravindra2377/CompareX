package scraper

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAmazonMapApifyResults(t *testing.T) {
	s := NewAmazonScraper()

	mockItems := []map[string]interface{}{
		{
			"title": "Rice 5kg",
			"priceValue": 450.0,
			"listPrice":  500.0,
			"url":   "https://amazon.in/p/rice-5kg",
			"image": "https://example.com/rice.jpg",
		},
		{
			"name": "Tea 250g",
			"price": 120.0,
			"url": "https://amazon.in/p/tea-250g",
			"imageUrl": "https://example.com/tea.jpg",
		},
	}

	listings := s.mapApifyResults(mockItems)

	assert.Len(t, listings, 2)
	
	assert.Equal(t, "Rice 5kg", listings[0].ProductName)
	assert.Equal(t, 450.0, listings[0].Price)
	assert.Equal(t, 500.0, listings[0].MRP)
	assert.Equal(t, "https://example.com/rice.jpg", listings[0].ImageURL)
	assert.Equal(t, "Amazon", listings[0].Platform)

	assert.Equal(t, "Tea 250g", listings[1].ProductName)
	assert.Equal(t, 120.0, listings[1].Price)
	assert.Equal(t, 120.0, listings[1].MRP)
	assert.Equal(t, "https://example.com/tea.jpg", listings[1].ImageURL)
}
