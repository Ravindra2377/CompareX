package database

import (
	"os"
	"testing"
	"time"

	"comparez/models"
	"github.com/stretchr/testify/assert"
)

func TestConnectGracefulFallback(t *testing.T) {
	// With no database configured, Connect should not panic
	os.Setenv("DATABASE_URL", "")
	os.Setenv("POSTGRES_URL", "")
	os.Setenv("MONGO_URI", "")
	os.Setenv("REDIS_ADDR", "localhost:59999") // unreachable port

	assert.NotPanics(t, func() {
		Connect()
	})
}

func TestRelationalModelsInstantiation(t *testing.T) {
	conv := models.Conversation{
		UserID:    "user_123",
		Title:     "iPhone 16 Best Price",
		Mode:      "compare",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	assert.Equal(t, "user_123", conv.UserID)
	assert.Equal(t, "compare", conv.Mode)

	msg := models.Message{
		ConversationID: 1,
		Role:           "assistant",
		Content:        "Best price found on Blinkit [1].",
	}
	assert.Equal(t, "assistant", msg.Role)

	source := models.Source{
		MessageID: 1,
		Number:    1,
		Title:     "Blinkit Store",
		URL:       "https://blinkit.com/item",
		Domain:    "blinkit.com",
	}
	assert.Equal(t, 1, source.Number)
	assert.Equal(t, "blinkit.com", source.Domain)

	comparison := models.ProductComparisonRecord{
		MessageID:      1,
		Query:          "Amul Milk",
		BestPlatform:   "Blinkit",
		BestPrice:      27.0,
		ComparisonJSON: `{"platforms":[{"name":"Blinkit","price":27}]}`,
	}
	assert.Equal(t, "Blinkit", comparison.BestPlatform)
	assert.Equal(t, 27.0, comparison.BestPrice)

	wishlist := models.WishlistItem{
		UserID:       "user_123",
		ProductName:  "Amul Taaza Milk 500ml",
		CurrentPrice: 27,
		TargetPrice:  25,
		BestPlatform: "Zepto",
		IsAlertOn:    true,
	}
	assert.Equal(t, "Zepto", wishlist.BestPlatform)
	assert.True(t, wishlist.IsAlertOn)
}
