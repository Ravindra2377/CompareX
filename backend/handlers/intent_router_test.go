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
		// Code Review Review-Specific Test Cases
		{
			name:     "Tech Comparison (Not Shopping)",
			query:    "Python vs Java",
			mode:     "all",
			expected: IntentDirectAnswer,
		},
		{
			name:     "Health Nutrition (Not Shopping)",
			query:    "Is milk healthy?",
			mode:     "all",
			expected: IntentDirectAnswer,
		},
		{
			name:     "Commodity Rate (Web Search, Not Shopping)",
			query:    "Today's gold price",
			mode:     "all",
			expected: IntentWebSearch,
		},
		{
			name:     "Product Launch News (Web Search, Not Shopping)",
			query:    "Latest iPhone launch news",
			mode:     "all",
			expected: IntentWebSearch,
		},
		{
			name:     "Home Loan EMI Calculation",
			query:    "Calculate home loan EMI",
			mode:     "all",
			expected: IntentCalculation,
		},

		// Standard Operational Cases
		{
			name:     "Direct Coding Explanation",
			query:    "Explain Python inheritance with code example",
			mode:     "all",
			expected: IntentDirectAnswer,
		},
		{
			name:     "Financial EMI Calculation Detailed",
			query:    "Calculate EMI for 10 lakhs home loan at 8.5% for 15 years",
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
			name:     "Live News Headlines",
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
