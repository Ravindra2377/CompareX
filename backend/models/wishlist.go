package models

import (
	"time"

	"gorm.io/gorm"
)

// WishlistItem represents a product a user has saved for tracking
type WishlistItem struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	UserID      uint           `gorm:"index;not null" json:"user_id"`
	ProductName string         `gorm:"not null;size:512" json:"product_name"`
	Brand       string         `gorm:"size:255" json:"brand,omitempty"`
	ImageURL    string         `gorm:"size:1024" json:"image_url,omitempty"`
	BestPrice   float64        `json:"best_price"`                         // Price when wishlisted
	Platform    string         `gorm:"size:64" json:"platform,omitempty"`  // Where best price was found
	ProductURL  string         `gorm:"size:1024" json:"product_url,omitempty"`
	TargetPrice float64        `json:"target_price,omitempty"`             // Alert when price drops below this
	Notes       string         `gorm:"size:512" json:"notes,omitempty"`
}
