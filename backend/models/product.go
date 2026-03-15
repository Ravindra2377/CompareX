package models

import "time"

// Product represents a generic product across all platforms
type Product struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Brand    string  `json:"brand,omitempty"`
	Category string  `json:"category,omitempty"`
	ImageURL string  `json:"image_url,omitempty"`
	Weight   string  `json:"weight,omitempty"` // e.g. "500g", "1kg", "12 pcs"
	Rating   float64 `json:"rating,omitempty"`
}

// PlatformListing represents a product listing on a specific platform
type PlatformListing struct {
	Platform       string    `json:"platform"`
	ProductName    string    `json:"product_name"`
	Brand          string    `json:"brand,omitempty"`
	ImageURL       string    `json:"image_url,omitempty"`
	Price          float64   `json:"price"`
	MRP            float64   `json:"mrp,omitempty"`      // Original/MRP price
	Discount       string    `json:"discount,omitempty"` // e.g. "10% OFF"
	InStock        bool      `json:"in_stock"`
	DeliveryTime   string    `json:"delivery_time,omitempty"` // e.g. "10 mins", "2 hours"
	DeliveryCharge float64   `json:"delivery_charge"`
	Rating         float64   `json:"rating,omitempty"`
	Offers         []string  `json:"offers,omitempty"`    // e.g. ["10% cashback", "Use code SAVE20"]
	DeepLink       string    `json:"deep_link,omitempty"` // URL or app deep link
	ScrapedAt      time.Time `json:"scraped_at"`
	Quantity       string    `json:"quantity,omitempty"`
}

// CompareResult is the API response for a comparison query
type CompareResult struct {
	Query    string            `json:"query"`
	Products []ComparedProduct `json:"products"`
}

// ComparedProduct groups listings for the same/similar product
type ComparedProduct struct {
	Name      string            `json:"name"`
	Category  string            `json:"category,omitempty"`
	BestPrice float64           `json:"best_price"`
	Listings  []PlatformListing `json:"listings"`
}
