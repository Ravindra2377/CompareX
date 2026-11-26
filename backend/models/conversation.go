package models

import (
	"time"
)

// Conversation represents a multi-turn AI research and search session.
type Conversation struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	UserID    string    `gorm:"index;not null" json:"user_id"`
	Title     string    `gorm:"size:255;not null" json:"title"`
	Mode      string    `gorm:"size:32;default:'all'" json:"mode"` // 'all', 'research', 'compare', 'buying'
	Messages  []Message `gorm:"foreignKey:ConversationID;constraint:OnDelete:CASCADE" json:"messages,omitempty"`
}

// Message represents an individual turn in a conversation.
type Message struct {
	ID             uint                     `gorm:"primaryKey" json:"id"`
	CreatedAt      time.Time                `json:"created_at"`
	ConversationID uint                     `gorm:"index;not null" json:"conversation_id"`
	Role           string                   `gorm:"size:20;not null" json:"role"` // 'user', 'assistant', 'system'
	Content        string                   `gorm:"type:text;not null" json:"content"`
	Sources        []Source                 `gorm:"foreignKey:MessageID;constraint:OnDelete:CASCADE" json:"sources,omitempty"`
	Comparison     *ProductComparisonRecord `gorm:"foreignKey:MessageID;constraint:OnDelete:CASCADE" json:"comparison,omitempty"`
}

// Source represents verified web evidence/citations attached to an assistant message.
type Source struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	MessageID uint      `gorm:"index;not null" json:"message_id"`
	Number    int       `json:"number"`
	Title     string    `gorm:"size:512;not null" json:"title"`
	URL       string    `gorm:"size:2048;not null" json:"url"`
	Domain    string    `gorm:"size:128" json:"domain"`
	Snippet   string    `gorm:"type:text" json:"snippet"`
}

// ProductComparisonRecord stores quick-commerce/e-commerce price comparison data for a message.
type ProductComparisonRecord struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	CreatedAt      time.Time `json:"created_at"`
	MessageID      uint      `gorm:"uniqueIndex;not null" json:"message_id"`
	Query          string    `gorm:"size:255;not null" json:"query"`
	BestPlatform   string    `gorm:"size:64" json:"best_platform"`
	BestPrice      float64   `json:"best_price"`
	ComparisonJSON string    `gorm:"type:text" json:"comparison_json"` // JSON encoded platform items
}
