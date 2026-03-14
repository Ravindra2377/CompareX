package models

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestProductStructure(t *testing.T) {
	product := Product{
		ID:       "test-123",
		Name:     "Test Product",
		Brand:    "Test Brand",
		Category: "Groceries",
		ImageURL: "https://example.com/image.jpg",
		Weight:   "500g",
		Rating:   4.5,
	}

	assert.Equal(t, "test-123", product.ID)
	assert.Equal(t, "Test Product", product.Name)
	assert.Equal(t, "Test Brand", product.Brand)
	assert.Equal(t, "Groceries", product.Category)
	assert.Equal(t, "https://example.com/image.jpg", product.ImageURL)
	assert.Equal(t, "500g", product.Weight)
	assert.Equal(t, 4.5, product.Rating)
}

func TestPlatformListingStructure(t *testing.T) {
	listing := PlatformListing{
		Platform:       "Blinkit",
		ProductName:    "Test Product",
		Brand:          "Test Brand",
		ImageURL:       "https://example.com/image.jpg",
		Price:          99.99,
		MRP:            199.99,
		Discount:       "50% OFF",
		InStock:        true,
		DeliveryTime:   "10 mins",
		DeliveryCharge: 0,
		Rating:         4.2,
		Offers:         []string{"10% cashback"},
		DeepLink:       "https://blinkit.com/product/123",
		ScrapedAt:      time.Now(),
	}

	assert.Equal(t, "Blinkit", listing.Platform)
	assert.Equal(t, "Test Product", listing.ProductName)
	assert.Equal(t, "Test Brand", listing.Brand)
	assert.Equal(t, "https://example.com/image.jpg", listing.ImageURL)
	assert.Equal(t, 99.99, listing.Price)
	assert.Equal(t, 199.99, listing.MRP)
	assert.Equal(t, "50% OFF", listing.Discount)
	assert.True(t, listing.InStock)
	assert.Equal(t, "10 mins", listing.DeliveryTime)
	assert.Equal(t, 0.0, listing.DeliveryCharge)
	assert.Equal(t, 4.2, listing.Rating)
	assert.Len(t, listing.Offers, 1)
	assert.Equal(t, "https://blinkit.com/product/123", listing.DeepLink)
	assert.False(t, listing.ScrapedAt.IsZero())
}

func TestCompareResultStructure(t *testing.T) {
	listings := []PlatformListing{
		{
			Platform: "Blinkit",
			Price:    99.99,
		},
		{
			Platform: "Zepto",
			Price:    89.99,
		},
	}

	comparedProduct := ComparedProduct{
		Name:      "Test Product",
		BestPrice: 89.99,
		Listings:  listings,
	}

	result := CompareResult{
		Query:    "rice",
		Products: []ComparedProduct{comparedProduct},
	}

	assert.Equal(t, "rice", result.Query)
	assert.Len(t, result.Products, 1)
	assert.Equal(t, 89.99, result.Products[0].BestPrice)
}

func TestEmptyProduct(t *testing.T) {
	product := Product{}

	assert.Equal(t, "", product.ID)
	assert.Equal(t, "", product.Name)
	assert.Equal(t, 0.0, product.Rating)
}

func TestPlatformListingWithMinimalData(t *testing.T) {
	listing := PlatformListing{
		Platform: "Blinkit",
		Price:    50.0,
	}

	assert.Equal(t, "Blinkit", listing.Platform)
	assert.Equal(t, 50.0, listing.Price)
	assert.False(t, listing.InStock) // default false
	assert.Len(t, listing.Offers, 0) // default empty slice
}
