package handlers

import (
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
)

const deviceTokenTTL = 24 * time.Hour

var platformNamePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9 _-]{0,39}$`)

func validatePlatformTokens(platform string, tokens map[string]string) (string, bool) {
	platform = strings.TrimSpace(platform)
	if !platformNamePattern.MatchString(platform) || len(tokens) == 0 || len(tokens) > 20 {
		return "", false
	}

	totalSize := 0
	for key, value := range tokens {
		if key == "" || len(key) > 64 || len(value) > 64*1024 {
			return "", false
		}
		totalSize += len(key) + len(value)
		if totalSize > 128*1024 {
			return "", false
		}
	}
	return platform, true
}

// TokenStore manages user authentication tokens per device
type TokenStore struct {
	mu    sync.RWMutex
	byKey map[string]*DeviceTokens
}

type DeviceTokens struct {
	Platforms  map[string]map[string]string // platform -> key-value tokens
	UpdatedAt  time.Time
	LastUsedAt time.Time
}

var Store = &TokenStore{
	byKey: make(map[string]*DeviceTokens),
}

func pruneExpiredLocked(now time.Time) {
	for key, deviceTokens := range Store.byKey {
		if now.Sub(deviceTokens.LastUsedAt) > deviceTokenTTL {
			delete(Store.byKey, key)
		}
	}
}

// accountKey binds linked-platform sessions to the authenticated CompareZ user.
func accountKey(c echo.Context) (string, bool) {
	return authenticatedUserID(c)
}

// ConnectAccount handles legacy platform credential connection.
// NOTE: Permanently retired in AI Platform V5.1 in favor of Privacy & Verified Data Sources.
// Third-party retailer token extraction, ingestion, and storage are permanently disabled.
// POST /accounts/connect
func ConnectAccount(c echo.Context) error {
	c.Response().Header().Set("X-CompareZ-Deprecated", "Retailer authentication permanently retired in AI Platform V5.1")
	return c.JSON(http.StatusGone, map[string]string{
		"error":   "retailer_tokens_retired",
		"message": "Retailer token connection has been permanently retired in CompareZ AI Platform. Third-party account credentials are no longer accepted or stored.",
	})
}

// DisconnectAccount removes tokens for a specific platform
// DELETE /accounts/disconnect/:platform
func DisconnectAccount(c echo.Context) error {
	platform := c.Param("platform")
	if platform == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Platform is required",
		})
	}

	key, ok := accountKey(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Authentication required"})
	}
	now := time.Now()

	Store.mu.Lock()
	defer Store.mu.Unlock()
	pruneExpiredLocked(now)

	if deviceTokens, exists := Store.byKey[key]; exists {
		delete(deviceTokens.Platforms, platform)
		deviceTokens.UpdatedAt = now
		deviceTokens.LastUsedAt = now
		if len(deviceTokens.Platforms) == 0 {
			delete(Store.byKey, key)
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status":   "disconnected",
		"platform": platform,
	})
}

// DisconnectAllAccounts removes every linked-platform session for the user.
// DELETE /accounts
func DisconnectAllAccounts(c echo.Context) error {
	key, ok := accountKey(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Authentication required"})
	}

	Store.mu.Lock()
	delete(Store.byKey, key)
	Store.mu.Unlock()

	return c.NoContent(http.StatusNoContent)
}

// GetAccountStatus returns connection status for all platforms.
// Always returns 0 connected platforms as retailer token storage is retired.
// GET /accounts/status
func GetAccountStatus(c echo.Context) error {
	_, ok := accountKey(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Authentication required"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"connected": []string{},
		"count":     0,
		"status":    "retired",
		"message":   "Retailer account connection is retired. CompareZ operates purely on verified web intelligence.",
	})
}

// BulkConnectAccounts handles bulk token submission.
// NOTE: Permanently retired in AI Platform V5.1 in favor of Privacy & Verified Data Sources.
// POST /accounts/bulk-connect
func BulkConnectAccounts(c echo.Context) error {
	c.Response().Header().Set("X-CompareZ-Deprecated", "Retailer authentication permanently retired in AI Platform V5.1")
	return c.JSON(http.StatusGone, map[string]string{
		"error":   "retailer_tokens_retired",
		"message": "Retailer token connection has been permanently retired in CompareZ AI Platform. Third-party account credentials are no longer accepted or stored.",
	})
}

// GetTokensForRequest retrieves stored tokens for the current device.
// Always returns nil as token ingestion and storage are retired.
func GetTokensForRequest(c echo.Context) map[string]map[string]string {
	return nil
}

