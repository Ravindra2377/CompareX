package models

import (
	"time"
)

type SearchRequest struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Query     string    `gorm:"not null" json:"query"`
	Status    string    `gorm:"default:'pending'" json:"status"` // pending, processing, completed, failed
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
