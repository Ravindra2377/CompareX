package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCollectSearchResultsValidation(t *testing.T) {
	e := echo.New()
	payload := map[string]interface{}{"query": "", "platforms": map[string]interface{}{}}
	b, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/search/collect", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := CollectSearchResults(c)
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestCollectSearchResultsSuccess(t *testing.T) {
	e := echo.New()
	payload := map[string]interface{}{
		"query": "milk",
		"platforms": map[string]interface{}{
			"Blinkit": []map[string]interface{}{{"product_name": "Milk", "price": 30}},
		},
	}
	b, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/search/collect", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := CollectSearchResults(c)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestGetSearchHistory(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/search/history", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := GetSearchHistory(c)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestValidateTokensNoStoredTokens(t *testing.T) {
	Store.byKey = map[string]*DeviceTokens{}
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/search/validate", nil)
	req.Header.Set("X-Device-Id", "dev-x")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := ValidateTokens(c)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestValidateTokensWithStoredTokens(t *testing.T) {
	Store.byKey = map[string]*DeviceTokens{
		"dev-y": {
			Platforms: map[string]map[string]string{
				"Blinkit": {"auth": "a"},
				"Zepto":   {"cookie": "z"},
			},
			UpdatedAt:  time.Now(),
			LastUsedAt: time.Now(),
		},
	}

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/search/validate", nil)
	req.Header.Set("X-Device-Id", "dev-y")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := ValidateTokens(c)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
}
