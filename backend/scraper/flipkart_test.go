package scraper

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFlipkartMapApifyResults(t *testing.T) {
	s := NewFlipkartScraper()

	mockItems := []map[string]interface{}{
		{
			"title": "Milk 1L",
			"price": 85.0,
			"mrp":   95.0,
			"url":   "https://flipkart.com/p/milk-1l",
			"thumbnail": "https://example.com/milk.jpg",
		},
		{
			"productName": "Eggs 12pcs",
			"price": 70.0,
			"originalPrice": 80.0,
			"url": "https://flipkart.com/p/eggs-12",
			"thumbnails": []interface{}{"https://example.com/eggs.jpg"},
		},
	}

	listings := s.mapApifyResults(mockItems)

	assert.Len(t, listings, 2)
	
	assert.Equal(t, "Milk 1L", listings[0].ProductName)
	assert.Equal(t, 85.0, listings[0].Price)
	assert.Equal(t, 95.0, listings[0].MRP)
	assert.Equal(t, "https://example.com/milk.jpg", listings[0].ImageURL)
	assert.Equal(t, "Flipkart", listings[0].Platform)

	assert.Equal(t, "Eggs 12pcs", listings[1].ProductName)
	assert.Equal(t, 70.0, listings[1].Price)
	assert.Equal(t, 80.0, listings[1].MRP)
	assert.Equal(t, "https://example.com/eggs.jpg", listings[1].ImageURL)
}
