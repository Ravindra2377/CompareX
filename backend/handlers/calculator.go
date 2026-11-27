package handlers

import (
	"errors"
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
)

// CalculationResult holds verified deterministic mathematical and financial calculation metrics.
type CalculationResult struct {
	Type             string            `json:"type"` // "emi", "gst", "discount", "arithmetic"
	InputSummary     string            `json:"input_summary"`
	MonthlyEMI       float64           `json:"monthly_emi,omitempty"`
	TotalInterest    float64           `json:"total_interest,omitempty"`
	TotalPayment     float64           `json:"total_payment,omitempty"`
	Principal        float64           `json:"principal,omitempty"`
	RatePercent      float64           `json:"rate_percent,omitempty"`
	TenureMonths     int               `json:"tenure_months,omitempty"`
	GSTAmount        float64           `json:"gst_amount,omitempty"`
	GrossAmount      float64           `json:"gross_amount,omitempty"`
	Savings          float64           `json:"savings,omitempty"`
	ComputedValue    float64           `json:"computed_value,omitempty"`
	Breakdown        []string          `json:"breakdown"`
	FormattedSummary string            `json:"formatted_summary"`
}

var (
	// Number extractors with Indian denomination support (Lakhs, Crores, K)
	lakhRegex  = regexp.MustCompile(`(?i)([\d\.]+)\s*(?:lakhs?|lac|l)\b`)
	croreRegex = regexp.MustCompile(`(?i)([\d\.]+)\s*(?:crores?|cr)\b`)
	kRegex     = regexp.MustCompile(`(?i)([\d\.]+)\s*k\b`)
	rateRegex  = regexp.MustCompile(`(?i)([\d\.]+)\s*(?:%|percent)`)
	yearRegex  = regexp.MustCompile(`(?i)([\d\.]+)\s*(?:years?|yrs?|yr)\b`)
	monthRegex = regexp.MustCompile(`(?i)([\d\.]+)\s*(?:months?|mths?|m)\b`)
)

// CalculateEMI computes exact monthly EMI, total interest, and total payment.
func CalculateEMI(principal, annualRate float64, tenureMonths int) (monthlyEMI, totalInterest, totalPayment float64) {
	if principal <= 0 || tenureMonths <= 0 {
		return 0, 0, 0
	}

	monthlyRate := (annualRate / 100.0) / 12.0
	months := float64(tenureMonths)

	if monthlyRate == 0 {
		monthlyEMI = principal / months
	} else {
		factor := math.Pow(1.0+monthlyRate, months)
		monthlyEMI = principal * monthlyRate * factor / (factor - 1.0)
	}

	// Round to nearest integer (paisa precision)
	monthlyEMI = math.Round(monthlyEMI*100) / 100
	totalPayment = math.Round(monthlyEMI*months*100) / 100
	totalInterest = math.Round((totalPayment-principal)*100) / 100

	return monthlyEMI, totalInterest, totalPayment
}

// CalculateGST computes exact GST breakdown (CGST + SGST or IGST).
func CalculateGST(baseAmount, gstRate float64) (gstAmount, totalAmount float64) {
	gstAmount = math.Round((baseAmount*(gstRate/100.0))*100) / 100
	totalAmount = math.Round((baseAmount+gstAmount)*100) / 100
	return gstAmount, totalAmount
}

// ParseAndExecuteCalculation attempts to deterministically calculate financial and math inquiries.
func ParseAndExecuteCalculation(query string) (*CalculationResult, error) {
	lower := strings.ToLower(query)

	// 1. EMI Calculation
	if strings.Contains(lower, "emi") || strings.Contains(lower, "loan") || strings.Contains(lower, "mortgage") {
		principal := extractAmount(query)
		rate := 9.0 // default benchmark home/personal loan rate if unspecified
		if match := rateRegex.FindStringSubmatch(query); len(match) >= 2 {
			if r, err := strconv.ParseFloat(match[1], 64); err == nil && r > 0 && r < 100 {
				rate = r
			}
		}

		tenureMonths := 60 // default 5 years
		if match := yearRegex.FindStringSubmatch(query); len(match) >= 2 {
			if y, err := strconv.ParseFloat(match[1], 64); err == nil && y > 0 {
				tenureMonths = int(y * 12)
			}
		} else if match := monthRegex.FindStringSubmatch(query); len(match) >= 2 {
			if m, err := strconv.ParseFloat(match[1], 64); err == nil && m > 0 {
				tenureMonths = int(m)
			}
		}

		if principal > 0 {
			emi, interest, total := CalculateEMI(principal, rate, tenureMonths)
			years := float64(tenureMonths) / 12.0

			return &CalculationResult{
				Type:          "emi",
				InputSummary:  fmt.Sprintf("Principal: ₹%s | Rate: %.2f%% p.a. | Tenure: %d months (%.1f years)", formatINR(principal), rate, tenureMonths, years),
				MonthlyEMI:    emi,
				TotalInterest: interest,
				TotalPayment:  total,
				Principal:     principal,
				RatePercent:   rate,
				TenureMonths:  tenureMonths,
				Breakdown: []string{
					fmt.Sprintf("Monthly EMI: ₹%s", formatINR(emi)),
					fmt.Sprintf("Principal Amount: ₹%s", formatINR(principal)),
					fmt.Sprintf("Total Interest Payable: ₹%s", formatINR(interest)),
					fmt.Sprintf("Total Amount Paid (P + I): ₹%s", formatINR(total)),
				},
				FormattedSummary: fmt.Sprintf("Your monthly EMI is **₹%s** for a loan of ₹%s at %.2f%% over %d months. Total interest payable will be ₹%s, making the total repayment ₹%s.",
					formatINR(emi), formatINR(principal), rate, tenureMonths, formatINR(interest), formatINR(total)),
			}, nil
		}
	}

	// 2. GST Calculation
	if strings.Contains(lower, "gst") || strings.Contains(lower, "tax") {
		amount := extractAmount(query)
		rate := 18.0 // standard default GST in India
		if match := rateRegex.FindStringSubmatch(query); len(match) >= 2 {
			if r, err := strconv.ParseFloat(match[1], 64); err == nil {
				rate = r
			}
		}

		if amount > 0 {
			gstAmt, total := CalculateGST(amount, rate)
			cgst := gstAmt / 2.0
			sgst := gstAmt / 2.0

			return &CalculationResult{
				Type:         "gst",
				InputSummary: fmt.Sprintf("Base Amount: ₹%s | GST Rate: %.1f%%", formatINR(amount), rate),
				GSTAmount:    gstAmt,
				GrossAmount:  total,
				Principal:    amount,
				RatePercent:  rate,
				Breakdown: []string{
					fmt.Sprintf("Base Value: ₹%s", formatINR(amount)),
					fmt.Sprintf("CGST (%.1f%%): ₹%s", rate/2.0, formatINR(cgst)),
					fmt.Sprintf("SGST (%.1f%%): ₹%s", rate/2.0, formatINR(sgst)),
					fmt.Sprintf("Total GST: ₹%s", formatINR(gstAmt)),
					fmt.Sprintf("Final Payable Amount: ₹%s", formatINR(total)),
				},
				FormattedSummary: fmt.Sprintf("For a base value of ₹%s at %.1f%% GST, the total tax is **₹%s** (CGST ₹%s + SGST ₹%s), giving a gross total of **₹%s**.",
					formatINR(amount), rate, formatINR(gstAmt), formatINR(cgst), formatINR(sgst), formatINR(total)),
			}, nil
		}
	}

	// 3. Simple Percentage or Arithmetic (e.g. "1500 * 18%", "25000 - 4500")
	if strings.Contains(query, "%") {
		amt := extractAmount(query)
		if match := rateRegex.FindStringSubmatch(query); len(match) >= 2 && amt > 0 {
			if pct, err := strconv.ParseFloat(match[1], 64); err == nil {
				computed := math.Round((amt*(pct/100.0))*100) / 100
				return &CalculationResult{
					Type:          "arithmetic",
					InputSummary:  fmt.Sprintf("%.2f%% of ₹%s", pct, formatINR(amt)),
					ComputedValue: computed,
					Breakdown: []string{
						fmt.Sprintf("Original Amount: ₹%s", formatINR(amt)),
						fmt.Sprintf("Percentage: %.2f%%", pct),
						fmt.Sprintf("Calculated Value: ₹%s", formatINR(computed)),
					},
					FormattedSummary: fmt.Sprintf("%.2f%% of ₹%s is **₹%s**.", pct, formatINR(amt), formatINR(computed)),
				}, nil
			}
		}
	}

	return nil, errors.New("unsupported or ambiguous calculation query")
}

func extractAmount(text string) float64 {
	// Check Lakhs: e.g. "10 lakhs", "1.5L"
	if m := lakhRegex.FindStringSubmatch(text); len(m) >= 2 {
		if v, err := strconv.ParseFloat(m[1], 64); err == nil {
			return v * 100000.0
		}
	}

	// Check Crores: e.g. "1.5 crore", "2Cr"
	if m := croreRegex.FindStringSubmatch(text); len(m) >= 2 {
		if v, err := strconv.ParseFloat(m[1], 64); err == nil {
			return v * 10000000.0
		}
	}

	// Check K: e.g. "50k", "100k"
	if m := kRegex.FindStringSubmatch(text); len(m) >= 2 {
		if v, err := strconv.ParseFloat(m[1], 64); err == nil {
			return v * 1000.0
		}
	}

	// Check standard numbers (e.g. 500000, 50,000, ₹25000)
	numRe := regexp.MustCompile(`(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)`)
	matches := numRe.FindAllStringSubmatch(text, -1)
	for _, m := range matches {
		if len(m) >= 2 {
			cleanNum := strings.ReplaceAll(m[1], ",", "")
			if v, err := strconv.ParseFloat(cleanNum, 64); err == nil && v >= 10 {
				return v
			}
		}
	}

	return 0
}

func formatINR(val float64) string {
	rounded := math.Round(val*100) / 100
	intPart := int64(rounded)
	decPart := int64(math.Round((rounded - float64(intPart)) * 100))

	str := strconv.FormatInt(intPart, 10)
	if len(str) <= 3 {
		if decPart > 0 {
			return fmt.Sprintf("%s.%02d", str, decPart)
		}
		return str
	}

	// Indian numbering formatting: last 3 digits, then groups of 2 (e.g. 10,00,000)
	last3 := str[len(str)-3:]
	rem := str[:len(str)-3]
	var groups []string
	for len(rem) > 2 {
		groups = append([]string{rem[len(rem)-2:]}, groups...)
		rem = rem[:len(rem)-2]
	}
	if len(rem) > 0 {
		groups = append([]string{rem}, groups...)
	}

	formatted := strings.Join(groups, ",") + "," + last3
	if decPart > 0 {
		return fmt.Sprintf("%s.%02d", formatted, decPart)
	}
	return formatted
}
