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

const accountTestUserID = "507f1f77bcf86cd799439011"

func authenticateAccountTest(c echo.Context) {
	c.Set(userIDContextKey, accountTestUserID)
}

func TestTokenStoreBasics(t *testing.T) {
	// Reset the store before test
	Store.byKey = make(map[string]*DeviceTokens)

	assert.NotNil(t, Store)
	assert.NotNil(t, Store.byKey)
	assert.Len(t, Store.byKey, 0)
}

func TestAccountKeyUsesAuthenticatedUser(t *testing.T) {
	e := echo.New()

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	authenticateAccountTest(c)

	key, ok := accountKey(c)
	assert.True(t, ok)
	assert.Equal(t, accountTestUserID, key)
}

func TestAccountKeyRejectsAnonymousRequest(t *testing.T) {
	e := echo.New()

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	key, ok := accountKey(c)
	assert.False(t, ok)
	assert.Empty(t, key)
}

func TestConnectAccountPermanentlyRetired(t *testing.T) {
	Store.byKey = make(map[string]*DeviceTokens)
	e := echo.New()

	payload := map[string]interface{}{
		"platform": "Blinkit",
		"tokens": map[string]string{
			"auth":   "test-auth-token",
			"cookie": "test-cookie-value",
		},
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/accounts/connect", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	authenticateAccountTest(c)

	err := ConnectAccount(c)
	require.NoError(t, err)

	assert.Equal(t, http.StatusGone, rec.Code)

	var response map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &response)
	assert.Equal(t, "retailer_tokens_retired", response["error"])
	assert.Len(t, Store.byKey, 0, "No tokens should be stored in memory")
}

func TestGetAccountStatusReturnsZeroConnected(t *testing.T) {
	Store.byKey = make(map[string]*DeviceTokens)
	e := echo.New()

	req := httptest.NewRequest(http.MethodGet, "/accounts/status", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	authenticateAccountTest(c)

	err := GetAccountStatus(c)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var response map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &response)
	assert.Equal(t, float64(0), response["count"])
	connected := response["connected"].([]interface{})
	assert.Len(t, connected, 0)
}

func TestDisconnectAccount(t *testing.T) {
	Store.byKey = make(map[string]*DeviceTokens)
	e := echo.New()

	req := httptest.NewRequest(http.MethodDelete, "/accounts/disconnect/Blinkit", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	authenticateAccountTest(c)
	c.SetParamNames("platform")
	c.SetParamValues("Blinkit")

	err := DisconnectAccount(c)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var response map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &response)
	assert.Equal(t, "disconnected", response["status"])
}

func TestBulkConnectAccountsPermanentlyRetired(t *testing.T) {
	Store.byKey = make(map[string]*DeviceTokens)
	e := echo.New()

	payload := map[string]map[string]string{
		"Blinkit": {"auth": "blinkit-token"},
		"Zepto":   {"auth": "zepto-token"},
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/accounts/bulk-connect", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	authenticateAccountTest(c)

	err := BulkConnectAccounts(c)
	require.NoError(t, err)
	assert.Equal(t, http.StatusGone, rec.Code)

	var response map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &response)
	assert.Equal(t, "retailer_tokens_retired", response["error"])
	assert.Len(t, Store.byKey, 0, "No tokens should be stored in memory")
}

func TestGetTokensForRequestAlwaysReturnsNil(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	authenticateAccountTest(c)

	tokens := GetTokensForRequest(c)
	assert.Nil(t, tokens)
}

func TestPruneExpiredTokens(t *testing.T) {
	oldTime := time.Now().Add(-25 * time.Hour)

	Store.byKey = map[string]*DeviceTokens{
		"old-device": {
			Platforms: map[string]map[string]string{
				"PlatformA": {"auth": "token"},
			},
			LastUsedAt: oldTime,
		},
		"new-device": {
			Platforms: map[string]map[string]string{
				"PlatformB": {"auth": "token"},
			},
			LastUsedAt: time.Now(),
		},
	}

	now := time.Now()
	Store.mu.Lock()
	pruneExpiredLocked(now)
	Store.mu.Unlock()

	assert.NotContains(t, Store.byKey, "old-device")
	assert.Contains(t, Store.byKey, "new-device")
}

