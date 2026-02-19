package scraper

import (
	"comparex/models"
	"time"
)

// MockData returns sample product listings for testing without API access
func MockData(query string) []models.PlatformListing {
	// Common products for testing
	mockProducts := map[string][]models.PlatformListing{
		"eggs": {
			{Platform: "Blinkit", ProductName: "White Eggs (10pcs)", Price: 79.0, MRP: 95.0, InStock: true, DeliveryTime: "10 mins", Brand: "Keggs", DeepLink: "https://blinkit.com", ScrapedAt: time.Now()},
			{Platform: "Zepto", ProductName: "Farm Fresh Eggs (10pcs)", Price: 75.0, MRP: 95.0, InStock: true, DeliveryTime: "10 mins", Brand: "Country Eggs", DeepLink: "https://zeptonow.com", ScrapedAt: time.Now()},
			{Platform: "BigBasket", ProductName: "White Eggs (10pcs)", Price: 82.0, MRP: 95.0, InStock: true, DeliveryTime: "2 hours", Brand: "Fresho", DeepLink: "https://bigbasket.com", ScrapedAt: time.Now()},
			{Platform: "Instamart", ProductName: "Fresh White Eggs (10pcs)", Price: 80.0, MRP: 95.0, InStock: true, DeliveryTime: "15 mins", Brand: "Daily Farm", DeepLink: "https://swiggy.com", ScrapedAt: time.Now()},
		},
		"milk": {
			{Platform: "Blinkit", ProductName: "Amul Taaza Toned Milk 1L", Price: 54.0, MRP: 58.0, InStock: true, DeliveryTime: "10 mins", Brand: "Amul", DeepLink: "https://blinkit.com", ScrapedAt: time.Now()},
			{Platform: "Zepto", ProductName: "Amul Taaza Milk 1L", Price: 52.0, MRP: 58.0, InStock: true, DeliveryTime: "10 mins", Brand: "Amul", DeepLink: "https://zeptonow.com", ScrapedAt: time.Now()},
			{Platform: "BigBasket", ProductName: "Amul Taaza Toned Milk 1L", Price: 56.0, MRP: 58.0, InStock: true, DeliveryTime: "2 hours", Brand: "Amul", DeepLink: "https://bigbasket.com", ScrapedAt: time.Now()},
			{Platform: "Instamart", ProductName: "Amul Taaza Milk 1L", Price: 55.0, MRP: 58.0, InStock: true, DeliveryTime: "15 mins", Brand: "Amul", DeepLink: "https://swiggy.com", ScrapedAt: time.Now()},
		},
		"bread": {
			{Platform: "Blinkit", ProductName: "Britannia Bread 400g", Price: 35.0, MRP: 40.0, InStock: true, DeliveryTime: "10 mins", Brand: "Britannia", DeepLink: "https://blinkit.com", ScrapedAt: time.Now()},
			{Platform: "Zepto", ProductName: "Britannia Whole Wheat Bread 400g", Price: 38.0, MRP: 40.0, InStock: true, DeliveryTime: "10 mins", Brand: "Britannia", DeepLink: "https://zeptonow.com", ScrapedAt: time.Now()},
			{Platform: "BigBasket", ProductName: "Britannia Bread 400g", Price: 36.0, MRP: 40.0, InStock: false, DeliveryTime: "2 hours", Brand: "Britannia", DeepLink: "https://bigbasket.com", ScrapedAt: time.Now()},
			{Platform: "Instamart", ProductName: "Britannia Bread 400g", Price: 37.0, MRP: 40.0, InStock: true, DeliveryTime: "15 mins", Brand: "Britannia", DeepLink: "https://swiggy.com", ScrapedAt: time.Now()},
		},
		"atta": {
			{Platform: "Blinkit", ProductName: "Aashirvaad Atta 5kg", Price: 275.0, MRP: 299.0, InStock: true, DeliveryTime: "10 mins", Brand: "Aashirvaad", DeepLink: "https://blinkit.com", ScrapedAt: time.Now()},
			{Platform: "Zepto", ProductName: "Aashirvaad Whole Wheat Atta 5kg", Price: 270.0, MRP: 299.0, InStock: true, DeliveryTime: "10 mins", Brand: "Aashirvaad", DeepLink: "https://zeptonow.com", ScrapedAt: time.Now()},
			{Platform: "BigBasket", ProductName: "Aashirvaad Atta 5kg", Price: 278.0, MRP: 299.0, InStock: true, DeliveryTime: "2 hours", Brand: "Aashirvaad", DeepLink: "https://bigbasket.com", ScrapedAt: time.Now()},
			{Platform: "Instamart", ProductName: "Aashirvaad Select Atta 5kg", Price: 285.0, MRP: 299.0, InStock: true, DeliveryTime: "15 mins", Brand: "Aashirvaad", DeepLink: "https://swiggy.com", ScrapedAt: time.Now()},
		},
		"rice": {
			{Platform: "Blinkit", ProductName: "India Gate Basmati Rice 5kg", Price: 425.0, MRP: 499.0, InStock: true, DeliveryTime: "10 mins", Brand: "India Gate", DeepLink: "https://blinkit.com", ScrapedAt: time.Now()},
			{Platform: "Zepto", ProductName: "India Gate Basmati 5kg", Price: 420.0, MRP: 499.0, InStock: true, DeliveryTime: "10 mins", Brand: "India Gate", DeepLink: "https://zeptonow.com", ScrapedAt: time.Now()},
			{Platform: "BigBasket", ProductName: "India Gate Basmati Rice 5kg", Price: 430.0, MRP: 499.0, InStock: true, DeliveryTime: "2 hours", Brand: "India Gate", DeepLink: "https://bigbasket.com", ScrapedAt: time.Now()},
		},
	}

	// Try to find matching product
	for key, listings := range mockProducts {
		// Simple substring match
		if contains(query, key) {
			return listings
		}
	}

	// Default mock data if no match
	return []models.PlatformListing{
		{Platform: "Blinkit", ProductName: query + " (Mock)", Price: 99.0, MRP: 120.0, InStock: true, DeliveryTime: "10 mins", DeepLink: "https://blinkit.com", ScrapedAt: time.Now()},
		{Platform: "Zepto", ProductName: query + " (Mock)", Price: 95.0, MRP: 120.0, InStock: true, DeliveryTime: "10 mins", DeepLink: "https://zeptonow.com", ScrapedAt: time.Now()},
		{Platform: "BigBasket", ProductName: query + " (Mock)", Price: 105.0, MRP: 120.0, InStock: true, DeliveryTime: "2 hours", DeepLink: "https://bigbasket.com", ScrapedAt: time.Now()},
	}
}

func contains(s, substr string) bool {
	// Case-insensitive contains
	s = toLower(s)
	substr = toLower(substr)
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func toLower(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			result[i] = c + 32
		} else {
			result[i] = c
		}
	}
	return string(result)
}
