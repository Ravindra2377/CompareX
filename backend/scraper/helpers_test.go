package scraper

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetString(t *testing.T) {
	m := map[string]interface{}{
		"name": "Test Product",
		"id":   123,
	}

	assert.Equal(t, "Test Product", getString(m, "name"))
	assert.Equal(t, "", getString(m, "id"))      // Not a string
	assert.Equal(t, "", getString(m, "missing")) // Missing key
}

func TestGetStringEdgeCases(t *testing.T) {
	m := map[string]interface{}{
		"empty":   "",
		"spaces":  "   ",
		"unicode": "🎉 Test",
	}

	assert.Equal(t, "", getString(m, "empty"))
	assert.Equal(t, "   ", getString(m, "spaces"))
	assert.Equal(t, "🎉 Test", getString(m, "unicode"))
}

func TestGetFloat(t *testing.T) {
	m := map[string]interface{}{
		"float":  99.99,
		"int":    100,
		"int64":  int64(200),
		"string": "not a number",
		"bool":   true,
	}

	assert.Equal(t, 99.99, getFloat(m, "float"))
	assert.Equal(t, 100.0, getFloat(m, "int"))
	assert.Equal(t, 200.0, getFloat(m, "int64"))
	assert.Equal(t, 0.0, getFloat(m, "string"))  // Invalid type
	assert.Equal(t, 0.0, getFloat(m, "bool"))    // Invalid type
	assert.Equal(t, 0.0, getFloat(m, "missing")) // Missing key
}

func TestGetFloatPrecision(t *testing.T) {
	m := map[string]interface{}{
		"price1": 99.99,
		"price2": 100.0,
		"price3": 0.01,
	}

	assert.Equal(t, 99.99, getFloat(m, "price1"))
	assert.Equal(t, 100.0, getFloat(m, "price2"))
	assert.Equal(t, 0.01, getFloat(m, "price3"))
}

func TestGetFloatZeroValues(t *testing.T) {
	m := map[string]interface{}{
		"zero": 0.0,
	}

	assert.Equal(t, 0.0, getFloat(m, "zero"))
	assert.Equal(t, 0.0, getFloat(m, "nonexistent"))
}

func TestGetBool(t *testing.T) {
	m := map[string]interface{}{
		"available": true,
		"stock":     false,
		"count":     1,
		"name":      "test",
	}

	assert.True(t, getBool(m, "available"))
	assert.False(t, getBool(m, "stock"))
	assert.False(t, getBool(m, "count"))   // Not a bool
	assert.False(t, getBool(m, "name"))    // Not a bool
	assert.False(t, getBool(m, "missing")) // Missing key
}

func TestExtractArray(t *testing.T) {
	m := map[string]interface{}{
		"items": []interface{}{
			"item1",
			"item2",
			"item3",
		},
		"prices": []interface{}{
			100.0,
			200.0,
		},
	}

	items := extractArray(m, "items")
	assert.Len(t, items, 3)
	assert.Equal(t, "item1", items[0])

	prices := extractArray(m, "prices")
	assert.Len(t, prices, 2)
	assert.Equal(t, 100.0, prices[0])
}

func TestExtractArrayInvalid(t *testing.T) {
	m := map[string]interface{}{
		"string": "not an array",
		"number": 123,
	}

	assert.Nil(t, extractArray(m, "string"))
	assert.Nil(t, extractArray(m, "number"))
	assert.Nil(t, extractArray(m, "missing"))
}

func TestExtractArrayEmpty(t *testing.T) {
	m := map[string]interface{}{
		"empty": []interface{}{},
	}

	arr := extractArray(m, "empty")
	assert.NotNil(t, arr)
	assert.Len(t, arr, 0)
}

func TestHelperFunctionsWithNilValues(t *testing.T) {
	m := map[string]interface{}{
		"nil": nil,
	}

	assert.Equal(t, "", getString(m, "nil"))
	assert.Equal(t, 0.0, getFloat(m, "nil"))
	assert.False(t, getBool(m, "nil"))
	assert.Nil(t, extractArray(m, "nil"))
}

func TestHelperFunctionsConsistency(t *testing.T) {
	// Ensure all helpers handle same edge cases consistently
	m := map[string]interface{}{}

	assert.Equal(t, "", getString(m, "key"))
	assert.Equal(t, 0.0, getFloat(m, "key"))
	assert.False(t, getBool(m, "key"))
	assert.Nil(t, extractArray(m, "key"))
}

func TestListingExtraction(t *testing.T) {
	// Realistic test case
	listing := map[string]interface{}{
		"platform":     "Blinkit",
		"price":        99.99,
		"inStock":      true,
		"rating":       4.5,
		"offers":       []interface{}{"10% OFF", "Free delivery"},
		"deliveryTime": "10 mins",
	}

	assert.Equal(t, "Blinkit", getString(listing, "platform"))
	assert.Equal(t, 99.99, getFloat(listing, "price"))
	assert.True(t, getBool(listing, "inStock"))
	assert.Equal(t, 4.5, getFloat(listing, "rating"))
	assert.Len(t, extractArray(listing, "offers"), 2)
	assert.Equal(t, "10 mins", getString(listing, "deliveryTime"))
}
