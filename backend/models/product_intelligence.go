package models

// SpecificationItem represents a structured technical specification feature and its verified value.
type SpecificationItem struct {
	Feature  string `json:"feature"`
	Value    string `json:"value"`
	Category string `json:"category,omitempty"`
}

// SourceReference points to verified manufacturer documentation or benchmark registries.
type SourceReference struct {
	Title            string `json:"title"`
	URL              string `json:"url"`
	Domain           string `json:"domain"`
	VerificationType string `json:"verification_type"`
	VerifiedAt       string `json:"verified_at"`
}

// ProductIntelligenceRecord holds comprehensive verified intelligence for an exact product model.
type ProductIntelligenceRecord struct {
	ID                 string              `json:"id"`
	Name               string              `json:"name"`
	Brand              string              `json:"brand"`
	Category           string              `json:"category"`
	ImageURL           string              `json:"image_url"`
	BenchmarkPrice     float64             `json:"benchmark_price"`
	PriceLabel         string              `json:"price_label"`
	VerificationStatus string              `json:"verification_status"`
	Overview           string              `json:"overview"`
	Specifications     []SpecificationItem `json:"specifications"`
	Pros               []string            `json:"pros"`
	Cons               []string            `json:"cons"`
	SuitableUseCases   []string            `json:"suitable_use_cases"`
	Alternatives       []string            `json:"alternatives"`
	SourceLinks        []SourceReference   `json:"source_links"`
	ScoreRatings       map[string]float64  `json:"score_ratings"` // Dimension -> Score (0-10)
	VerifiedAt         string              `json:"verified_at"`
}

// ProductDiscoveryRequest specifies multi-criteria filters for dynamic product finding.
type ProductDiscoveryRequest struct {
	Query         string   `json:"query"`
	Category      string   `json:"category"`
	BudgetMin     float64  `json:"budget_min"`
	BudgetMax     float64  `json:"budget_max"`
	IntendedUsage string   `json:"intended_usage"`
	Brand         string   `json:"brand"`
	Specs         []string `json:"specs"`
}

// ProductComparisonRequest represents request to compare 2-4 products dynamically.
type ProductComparisonRequest struct {
	Category   string   `json:"category"`
	ProductIDs []string `json:"product_ids"`
	Query      string   `json:"query,omitempty"`
}

// ComparisonAttributeRow is an attribute row in a multi-product comparison matrix.
type ComparisonAttributeRow struct {
	Feature       string            `json:"feature"`
	Category      string            `json:"category,omitempty"`
	Values        map[string]string `json:"values"` // product ID -> spec value
	WinnerProduct string            `json:"winner_product,omitempty"`
}

// ProductComparisonMatrix holds full side-by-side data for 2-4 products.
type ProductComparisonMatrix struct {
	Category      string                      `json:"category"`
	Products      []ProductIntelligenceRecord `json:"products"`
	Attributes    []ComparisonAttributeRow    `json:"attributes"`
	Verdict       string                      `json:"verdict"`
	BestValueID   string                      `json:"best_value_id,omitempty"`
	BestOverallID string                      `json:"best_overall_id,omitempty"`
}

// RecommendationWeightsRequest accepts user preference weights for personalized scoring.
type RecommendationWeightsRequest struct {
	Category   string             `json:"category"`
	ProductIDs []string           `json:"product_ids,omitempty"`
	Weights    map[string]float64 `json:"weights"` // e.g. "battery": 40, "performance": 35, "comfort": 25
}

// RankedRecommendationItem represents a product ranked by weighted user preferences.
type RankedRecommendationItem struct {
	Product        ProductIntelligenceRecord `json:"product"`
	OverallScore   float64                   `json:"overall_score"` // 0.0 - 10.0 scale
	ScoreBreakdown map[string]float64        `json:"score_breakdown"`
	FitVerdict     string                    `json:"fit_verdict"`
}

// RecommendationResponse returns personalized ranked recommendations.
type RecommendationResponse struct {
	Category       string                     `json:"category"`
	RankedProducts []RankedRecommendationItem `json:"ranked_products"`
	Explanation    string                     `json:"explanation"`
}
