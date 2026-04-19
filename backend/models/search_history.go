package models

import (
	"time"

	"gorm.io/gorm"
)

// SearchHistory persists a user's search queries and result summaries
type SearchHistory struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
	UserID        uint           `gorm:"index;not null" json:"user_id"`
	Query         string         `gorm:"not null;size:255" json:"query"`
	ResultCount   int            `json:"result_count"`           // Total products found
	BestPrice     float64        `json:"best_price,omitempty"`   // Lowest price across platforms
	BestPlatform  string         `json:"best_platform,omitempty"` // Platform with lowest price
	PlatformsUsed string         `gorm:"size:512" json:"platforms_used,omitempty"` // JSON array of platform names
}
