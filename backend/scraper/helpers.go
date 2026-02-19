package scraper

import (
	"strconv"
	"strings"
)

// Helper functions for safely extracting values from JSON maps

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func getFloat(m map[string]interface{}, key string) float64 {
	if v, ok := m[key]; ok {
		switch n := v.(type) {
		case float64:
			return n
		case int:
			return float64(n)
		case int64:
			return float64(n)
		}
	}
	return 0
}

func getBool(m map[string]interface{}, key string) bool {
	if v, ok := m[key]; ok {
		if b, ok := v.(bool); ok {
			return b
		}
	}
	return false
}

func extractArray(m map[string]interface{}, key string) []interface{} {
	if v, ok := m[key]; ok {
		if arr, ok := v.([]interface{}); ok {
			return arr
		}
	}
	return nil
}

// parsePrice extracts a numeric price from strings like "₹85", "₹1,299", etc.
func parsePrice(s string) float64 {
	s = strings.TrimSpace(s)
	s = strings.Replace(s, "₹", "", -1)
	s = strings.Replace(s, ",", "", -1)
	s = strings.Replace(s, "MRP", "", -1)
	s = strings.TrimSpace(s)
	val, _ := strconv.ParseFloat(s, 64)
	return val
}

// maskString shows first/last 4 chars of a string, masking the middle
func maskString(s string) string {
	if s == "" {
		return "<empty>"
	}
	if len(s) <= 12 {
		return "[" + strconv.Itoa(len(s)) + " chars]"
	}
	return s[:6] + "..." + s[len(s)-6:]
}
