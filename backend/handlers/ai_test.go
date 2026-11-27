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
	reqBody := `{"query": "Amul milk price comparison", "mode": "compare"}`
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
	// Sources should either be real retrieved sources or empty if offline
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

func TestListConversationsUnauthenticated(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/ai/conversations", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := ListConversations(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}
