package models

import (
	"time"
)

// WishlistItem tracks saved items and price alerts for a user.
type WishlistItem struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	UserID       string    `gorm:"index;not null" json:"user_id"`
	ProductID    string    `gorm:"size:128" json:"product_id"`
	ProductName  string    `gorm:"size:255;not null" json:"product_name"`
	Brand        string    `gorm:"size:128" json:"brand"`
	ImageURL     string    `gorm:"size:2048" json:"image_url"`
	CurrentPrice float64   `json:"current_price"`
	TargetPrice  float64   `json:"target_price"`
	BestPlatform string    `gorm:"size:64" json:"best_platform"`
	IsAlertOn    bool      `gorm:"default:true" json:"is_alert_on"`
}
