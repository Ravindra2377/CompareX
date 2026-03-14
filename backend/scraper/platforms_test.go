package scraper

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestScraperNames(t *testing.T) {
	assert.Equal(t, "Blinkit", NewBlinkitScraper().Name())
	assert.Equal(t, "Zepto", NewZeptoScraper().Name())
	assert.Equal(t, "BigBasket", NewBigBasketScraper().Name())
}

func TestParsePrice(t *testing.T) {
	assert.Equal(t, 85.0, parsePrice("₹85"))
	assert.Equal(t, 1299.0, parsePrice("₹1,299"))
	assert.Equal(t, 199.0, parsePrice("MRP 199"))
	assert.Equal(t, 0.0, parsePrice(""))
}

func TestMaskString(t *testing.T) {
	assert.Equal(t, "<empty>", maskString(""))
	assert.Equal(t, "[5 chars]", maskString("12345"))
	masked := maskString("abcdefghijklmnopqrstuvwxyz")
	assert.Contains(t, masked, "...")
}

func TestGetPlatformURL(t *testing.T) {
	assert.Contains(t, getPlatformURL("Blinkit", "milk"), "blinkit")
	assert.Contains(t, getPlatformURL("Zepto", "milk"), "zepto")
	assert.Contains(t, getPlatformURL("BigBasket", "milk"), "bigbasket")
}

func TestPlatformSearchDoesNotPanic(t *testing.T) {
	ctx := context.Background()
	assert.NotPanics(t, func() {
		_, _ = NewBlinkitScraper().Search(ctx, "milk", 12.97, 77.59, map[string]string{})
	})
	assert.NotPanics(t, func() {
		_, _ = NewZeptoScraper().Search(ctx, "milk", 12.97, 77.59, map[string]string{})
	})
	assert.NotPanics(t, func() {
		_, _ = NewBigBasketScraper().Search(ctx, "milk", 12.97, 77.59, map[string]string{})
	})
}
