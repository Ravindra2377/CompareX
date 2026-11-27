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
// NOTE: Retired in AI Platform V5 in favor of Privacy & Verified Data Sources.
// Third-party retailer token extraction is deprecated and inactive.
// POST /accounts/connect
func ConnectAccount(c echo.Context) error {
	c.Response().Header().Set("X-CompareZ-Deprecated", "Retailer authentication retired in AI Platform V5")
	var req struct {
		Platform string            `json:"platform"`
		Tokens   map[string]string `json:"tokens"`
	}

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	platform, valid := validatePlatformTokens(req.Platform, req.Tokens)
	if !valid {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid platform credentials",
		})
	}
	req.Platform = platform

	key, ok := accountKey(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Authentication required"})
	}
	now := time.Now()

	Store.mu.Lock()
	defer Store.mu.Unlock()
	pruneExpiredLocked(now)

	// Get or create device tokens
	deviceTokens, exists := Store.byKey[key]
	if !exists {
		deviceTokens = &DeviceTokens{
			Platforms: make(map[string]map[string]string),
		}
		Store.byKey[key] = deviceTokens
	}

	// Store platform tokens
	deviceTokens.Platforms[req.Platform] = req.Tokens
	deviceTokens.UpdatedAt = now
	deviceTokens.LastUsedAt = now

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status":   "connected",
		"platform": req.Platform,
		"tokens":   len(req.Tokens),
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

// GetAccountStatus returns connection status for all platforms
// GET /accounts/status
func GetAccountStatus(c echo.Context) error {
	key, ok := accountKey(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Authentication required"})
	}
	now := time.Now()

	Store.mu.Lock()
	defer Store.mu.Unlock()
	pruneExpiredLocked(now)
	deviceTokens, exists := Store.byKey[key]
	if !exists {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"connected": []string{},
			"count":     0,
		})
	}
	deviceTokens.LastUsedAt = now

	// Build list of connected platforms
	connected := make([]string, 0, len(deviceTokens.Platforms))
	for platform := range deviceTokens.Platforms {
		connected = append(connected, platform)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"connected": connected,
		"count":     len(connected),
		"updatedAt": deviceTokens.UpdatedAt,
		"lastUsed":  deviceTokens.LastUsedAt,
	})
}

// BulkConnectAccounts handles bulk token submission.
// NOTE: Retired in AI Platform V5 in favor of Privacy & Verified Data Sources.
// POST /accounts/bulk-connect
func BulkConnectAccounts(c echo.Context) error {
	c.Response().Header().Set("X-CompareZ-Deprecated", "Retailer authentication retired in AI Platform V5")
	var payload map[string]map[string]string

	if err := c.Bind(&payload); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	if len(payload) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "No platforms provided",
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

	// Get or create device tokens
	deviceTokens, exists := Store.byKey[key]
	if !exists {
		deviceTokens = &DeviceTokens{
			Platforms: make(map[string]map[string]string),
		}
		Store.byKey[key] = deviceTokens
	}

	// Store all platform tokens
	connectedPlatforms := make([]string, 0, len(payload))
	for platform, tokens := range payload {
		normalizedPlatform, valid := validatePlatformTokens(platform, tokens)
		if !valid {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "Invalid platform credentials",
			})
		}
		deviceTokens.Platforms[normalizedPlatform] = tokens
		connectedPlatforms = append(connectedPlatforms, normalizedPlatform)
	}

	deviceTokens.UpdatedAt = now
	deviceTokens.LastUsedAt = now

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status":    "connected",
		"platforms": connectedPlatforms,
		"count":     len(connectedPlatforms),
	})
}

// GetTokensForRequest retrieves stored tokens for the current device
func GetTokensForRequest(c echo.Context) map[string]map[string]string {
	key, ok := accountKey(c)
	if !ok {
		return nil
	}
	now := time.Now()

	Store.mu.Lock()
	defer Store.mu.Unlock()
	pruneExpiredLocked(now)
	deviceTokens, exists := Store.byKey[key]
	if !exists {
		return nil
	}

	deviceTokens.LastUsedAt = now

	// Return a copy to prevent external modifications
	result := make(map[string]map[string]string)
	for platform, tokens := range deviceTokens.Platforms {
		platformCopy := make(map[string]string)
		for k, v := range tokens {
			platformCopy[k] = v
		}
		result[platform] = platformCopy
	}

	return result
}
