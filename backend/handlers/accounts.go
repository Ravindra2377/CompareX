package handlers

import (
	"net/http"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
)

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

// deviceKey generates a unique identifier for the device
func deviceKey(c echo.Context) string {
	// Use X-Device-Id if provided by client
	if id := c.Request().Header.Get("X-Device-Id"); id != "" {
		return id
	}
	// Fallback: IP + User-Agent
	return c.RealIP() + "|" + c.Request().UserAgent()
}

// ConnectAccount stores authentication tokens for a platform
// POST /accounts/connect
// Body: {"platform": "Blinkit", "tokens": {"auth": "...", "cookie": "..."}}
func ConnectAccount(c echo.Context) error {
	var req struct {
		Platform string            `json:"platform"`
		Tokens   map[string]string `json:"tokens"`
	}

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	if req.Platform == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Platform is required",
		})
	}

	if len(req.Tokens) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Tokens are required",
		})
	}

	key := deviceKey(c)

	Store.mu.Lock()
	defer Store.mu.Unlock()

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
	deviceTokens.UpdatedAt = time.Now()
	deviceTokens.LastUsedAt = time.Now()

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

	key := deviceKey(c)

	Store.mu.Lock()
	defer Store.mu.Unlock()

	if deviceTokens, exists := Store.byKey[key]; exists {
		delete(deviceTokens.Platforms, platform)
		deviceTokens.UpdatedAt = time.Now()
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status":   "disconnected",
		"platform": platform,
	})
}

// GetAccountStatus returns connection status for all platforms
// GET /accounts/status
func GetAccountStatus(c echo.Context) error {
	key := deviceKey(c)

	Store.mu.RLock()
	defer Store.mu.RUnlock()

	deviceTokens, exists := Store.byKey[key]
	if !exists {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"connected": []string{},
			"count":     0,
		})
	}

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

// BulkConnectAccounts stores tokens for multiple platforms at once
// POST /accounts/bulk-connect
// Body: {"Blinkit": {"auth": "...", "cookie": "..."}, "Zepto": {...}}
func BulkConnectAccounts(c echo.Context) error {
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

	key := deviceKey(c)

	Store.mu.Lock()
	defer Store.mu.Unlock()

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
		if len(tokens) > 0 {
			deviceTokens.Platforms[platform] = tokens
			connectedPlatforms = append(connectedPlatforms, platform)
		}
	}

	deviceTokens.UpdatedAt = time.Now()
	deviceTokens.LastUsedAt = time.Now()

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status":    "connected",
		"platforms": connectedPlatforms,
		"count":     len(connectedPlatforms),
	})
}

// GetTokensForRequest retrieves stored tokens for the current device
func GetTokensForRequest(c echo.Context) map[string]map[string]string {
	key := deviceKey(c)

	Store.mu.RLock()
	defer Store.mu.RUnlock()

	deviceTokens, exists := Store.byKey[key]
	if !exists {
		return nil
	}

	// Update last used timestamp
	go func() {
		Store.mu.Lock()
		deviceTokens.LastUsedAt = time.Now()
		Store.mu.Unlock()
	}()

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
