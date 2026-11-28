package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
)

func TestAIResearchEmptyQuery(t *testing.T) {
	e := echo.New()
	reqBody := `{"query": "   ", "mode": "all"}`
	req := httptest.NewRequest(http.MethodPost, "/ai/research", bytes.NewReader([]byte(reqBody)))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := AIResearch(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestAIResearchShoppingQuery(t *testing.T) {
	e := echo.New()
	reqBody := `{"query": "Amul milk price comparison", "mode": "compare", "location": "Bengaluru", "pincode": "560034"}`
	req := httptest.NewRequest(http.MethodPost, "/ai/research", bytes.NewReader([]byte(reqBody)))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := AIResearch(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var resp ResearchResponse
	err = json.Unmarshal(rec.Body.Bytes(), &resp)
	assert.NoError(t, err)

	assert.NotEmpty(t, resp.Summary)
	assert.NotEmpty(t, resp.KeyTakeaways)
	assert.Equal(t, "compare", resp.Mode)
	assert.Equal(t, "shopping", resp.Intent)
	if len(resp.Sources) > 0 {
		for _, s := range resp.Sources {
			assert.NotEmpty(t, s.Domain)
			assert.NotEmpty(t, s.URL)
		}
	}
}

func TestAIResearchGeneralQuery(t *testing.T) {
	e := echo.New()
	reqBody := `{"query": "How does quick commerce inventory work in Bengaluru?", "mode": "research"}`
	req := httptest.NewRequest(http.MethodPost, "/ai/research", bytes.NewReader([]byte(reqBody)))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := AIResearch(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var resp ResearchResponse
	err = json.Unmarshal(rec.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotEmpty(t, resp.Summary)
	assert.Equal(t, "research", resp.Mode)
}

func TestAIResearchMultiTurnHistory(t *testing.T) {
	e := echo.New()
	reqBody := `{
		"query": "Which of those has longer battery backup?",
		"mode": "all",
		"history": [
			{"role": "user", "content": "Compare Lenovo IdeaPad Slim 3 vs ASUS Vivobook 15"},
			{"role": "assistant", "content": "Lenovo IdeaPad Slim 3 has a 45Wh battery while ASUS Vivobook 15 features a 42Wh unit."}
		]
	}`
	req := httptest.NewRequest(http.MethodPost, "/ai/research", bytes.NewReader([]byte(reqBody)))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := AIResearch(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var resp ResearchResponse
	err = json.Unmarshal(rec.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotEmpty(t, resp.Summary)
	assert.NotEmpty(t, resp.KeyTakeaways)
}

func TestAIResearchDirectCalculation(t *testing.T) {
	e := echo.New()
	reqBody := `{"query": "Calculate EMI for 5 lakhs at 9% for 3 years", "mode": "all"}`
	req := httptest.NewRequest(http.MethodPost, "/ai/research", bytes.NewReader([]byte(reqBody)))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := AIResearch(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var resp ResearchResponse
	err = json.Unmarshal(rec.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "calculation", resp.Intent)
	assert.NotEmpty(t, resp.Summary)
}

func TestValidateAndSanitizeCitations(t *testing.T) {
	// When 2 sources exist, [1] and [2] are preserved, but [3] and [9] must be stripped
	raw := "Amul milk costs ₹32 [1] and Nandini costs ₹28 [2]. Zepto has extra discount [3] and bulk savings [9]."
	cleaned := validateAndSanitizeCitations(raw, 2)
	assert.Contains(t, cleaned, "[1]")
	assert.Contains(t, cleaned, "[2]")
	assert.NotContains(t, cleaned, "[3]")
	assert.NotContains(t, cleaned, "[9]")

	// When 0 sources exist, all citations must be stripped
	cleanedNoSources := validateAndSanitizeCitations(raw, 0)
	assert.NotContains(t, cleanedNoSources, "[1]")
	assert.NotContains(t, cleanedNoSources, "[2]")
}

func TestListConversationsUnauthenticated(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/ai/conversations", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := ListConversations(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestAIResearchConversationOwnership_Unauthenticated(t *testing.T) {
	e := echo.New()
	// Unauthenticated request attempting to pass a conversation_id must be rejected with 401
	reqBody := `{"query": "Follow up question", "conversation_id": 999, "mode": "all"}`
	req := httptest.NewRequest(http.MethodPost, "/ai/research", bytes.NewReader([]byte(reqBody)))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := AIResearch(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)

	var errResp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &errResp)
	assert.Contains(t, errResp["error"], "Authentication required")
}

func TestAIResearchStream_Basic(t *testing.T) {
	e := echo.New()
	reqBody := `{"query": "Calculate EMI for 10 lakhs at 8.5% for 15 years", "mode": "all"}`
	req := httptest.NewRequest(http.MethodPost, "/ai/research/stream", bytes.NewReader([]byte(reqBody)))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := AIResearchStream(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "text/event-stream", rec.Header().Get("Content-Type"))

	streamOutput := rec.Body.String()
	assert.Contains(t, streamOutput, "event: intent")
	assert.Contains(t, streamOutput, "event: done")
}

func TestSummaryExtractor(t *testing.T) {
	var tokens []string
	extractor := newSummaryExtractor(func(token string) {
		tokens = append(tokens, token)
	})

	// Feed in chunks simulating Groq SSE streaming
	chunks := []string{
		`{"summary"`,
		`: "Python is `,
		`a popular language.\n`,
		`It is \"versatile\" and easy.", `,
		`"key_takeaways": ["Easy", "Popular"]}`,
	}

	for _, chunk := range chunks {
		extractor.feed(chunk)
	}

	result := ""
	for _, tk := range tokens {
		result += tk
	}

	expected := "Python is a popular language.\nIt is \"versatile\" and easy."
	assert.Equal(t, expected, result)
	assert.NotContains(t, result, "key_takeaways")
	assert.NotContains(t, result, `{"summary":`)
}
