package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCalculateEMI(t *testing.T) {
	// Standard EMI check: ₹10,00,000 at 8.5% p.a. for 15 years (180 months)
	// Benchmark EMI ~ ₹9,847.40
	emi, interest, total := CalculateEMI(1000000, 8.5, 180)
	assert.True(t, emi > 9840 && emi < 9855, "EMI should be ~9847, got: %f", emi)
	assert.True(t, total > 1000000)
	assert.Equal(t, total-1000000, interest)
}

func TestCalculateGST(t *testing.T) {
	// ₹10,000 at 18% GST -> GST ₹1,800, Total ₹11,800
	gstAmt, total := CalculateGST(10000, 18.0)
	assert.Equal(t, 1800.0, gstAmt)
	assert.Equal(t, 11800.0, total)
}

func TestParseAndExecuteCalculation_EMI(t *testing.T) {
	query := "Calculate home loan EMI for 10 lakhs at 8.5% for 15 years"
	res, err := ParseAndExecuteCalculation(query)
	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, "emi", res.Type)
	assert.True(t, res.MonthlyEMI > 9800)
	assert.NotEmpty(t, res.FormattedSummary)
	assert.NotEmpty(t, res.Breakdown)
}

func TestParseAndExecuteCalculation_GST(t *testing.T) {
	query := "Calculate GST on 25000 at 18%"
	res, err := ParseAndExecuteCalculation(query)
	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, "gst", res.Type)
	assert.Equal(t, 4500.0, res.GSTAmount)
	assert.Equal(t, 29500.0, res.GrossAmount)
}

func TestFormatINR(t *testing.T) {
	assert.Equal(t, "1,000", formatINR(1000))
	assert.Equal(t, "10,000", formatINR(10000))
	assert.Equal(t, "1,00,000", formatINR(100000))
	assert.Equal(t, "10,00,000", formatINR(1000000))
}
