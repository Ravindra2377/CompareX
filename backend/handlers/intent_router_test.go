package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestClassifyQueryIntent(t *testing.T) {
	tests := []struct {
		name     string
		query    string
		mode     string
		expected QueryIntent
	}{
		{
			name:     "Direct Coding Explanation",
			query:    "Explain Python inheritance with code example",
			mode:     "all",
			expected: IntentDirectAnswer,
		},
		{
			name:     "Direct Conceptual Question",
			query:    "How does photosynthesis work in plants?",
			mode:     "all",
			expected: IntentDirectAnswer,
		},
		{
			name:     "Financial EMI Calculation",
			query:    "Calculate EMI for 10 lakhs home loan at 8.5% for 15 years",
			mode:     "all",
			expected: IntentCalculation,
		},
		{
			name:     "Mathematical Arithmetic",
			query:    "1500 * 18%",
			mode:     "all",
			expected: IntentCalculation,
		},
		{
			name:     "Grocery Price Comparison",
			query:    "Amul Gold Milk vs Nandini GoodLife price",
			mode:     "all",
			expected: IntentShopping,
		},
		{
			name:     "Tech Price Shopping",
			query:    "Find the cheapest laptop under 60000",
			mode:     "all",
			expected: IntentShopping,
		},
		{
			name:     "Explicit Compare Mode",
			query:    "Sony WH-1000XM5",
			mode:     "compare",
			expected: IntentShopping,
		},
		{
			name:     "Live News and Current Events",
			query:    "Today's latest news headline updates in India",
			mode:     "all",
			expected: IntentWebSearch,
		},
		{
			name:     "Explicit Research Mode",
			query:    "Renewable energy policy in India",
			mode:     "research",
			expected: IntentWebSearch,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ClassifyQueryIntent(tt.query, tt.mode)
			assert.Equal(t, tt.expected, got)
		})
	}
}
