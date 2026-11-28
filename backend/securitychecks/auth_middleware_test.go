package securitychecks

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"comparez/handlers"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

const testSecret = "comparez-test-secret-with-at-least-32-characters"

type testClaims struct {
	UserID string `json:"id"`
	jwt.RegisteredClaims
}

func signedToken(t *testing.T, expiresAt time.Time) string {
	t.Helper()
	userID := "507f1f77bcf86cd799439011"
	claims := testClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "comparez-api",
			Audience:  jwt.ClaimStrings{"comparez-app"},
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now().Add(-time.Minute)),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(testSecret))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return token
}

func securedEcho() *echo.Echo {
	e := echo.New()
	e.GET("/private", func(c echo.Context) error {
		return c.NoContent(http.StatusNoContent)
	}, handlers.RequireAuth)
	return e
}

func TestRequireAuthRejectsMissingToken(t *testing.T) {
	t.Setenv("JWT_SECRET", testSecret)
	rec := httptest.NewRecorder()
	securedEcho().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/private", nil))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestRequireAuthAcceptsValidToken(t *testing.T) {
	t.Setenv("JWT_SECRET", testSecret)
	req := httptest.NewRequest(http.MethodGet, "/private", nil)
	req.Header.Set(echo.HeaderAuthorization, "Bearer "+signedToken(t, time.Now().Add(time.Hour)))
	rec := httptest.NewRecorder()
	securedEcho().ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestRequireAuthRejectsExpiredToken(t *testing.T) {
	t.Setenv("JWT_SECRET", testSecret)
	req := httptest.NewRequest(http.MethodGet, "/private", nil)
	req.Header.Set(echo.HeaderAuthorization, "Bearer "+signedToken(t, time.Now().Add(-time.Hour)))
	rec := httptest.NewRecorder()
	securedEcho().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestSecurityConfigRejectsWeakSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "short")
	if err := handlers.ValidateSecurityConfig(); err == nil {
		t.Fatal("expected weak JWT secret to be rejected")
	}
}

func optionalEcho() *echo.Echo {
	e := echo.New()
	e.GET("/public-or-private", func(c echo.Context) error {
		userID, ok := c.Get("user_id").(string)
		if ok && userID != "" {
			return c.String(http.StatusOK, "user:"+userID)
		}
		return c.String(http.StatusOK, "guest")
	}, handlers.OptionalAuth)
	return e
}

func TestOptionalAuthAcceptsGuestWithoutHeader(t *testing.T) {
	t.Setenv("JWT_SECRET", testSecret)
	rec := httptest.NewRecorder()
	optionalEcho().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/public-or-private", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Body.String() != "guest" {
		t.Fatalf("expected 'guest', got %q", rec.Body.String())
	}
}

func TestOptionalAuthIdentifiesUserWithValidToken(t *testing.T) {
	t.Setenv("JWT_SECRET", testSecret)
	req := httptest.NewRequest(http.MethodGet, "/public-or-private", nil)
	req.Header.Set(echo.HeaderAuthorization, "Bearer "+signedToken(t, time.Now().Add(time.Hour)))
	rec := httptest.NewRecorder()
	optionalEcho().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Body.String() != "user:507f1f77bcf86cd799439011" {
		t.Fatalf("expected authenticated user string, got %q", rec.Body.String())
	}
}

func TestOptionalAuthRejectsInvalidToken(t *testing.T) {
	t.Setenv("JWT_SECRET", testSecret)
	req := httptest.NewRequest(http.MethodGet, "/public-or-private", nil)
	req.Header.Set(echo.HeaderAuthorization, "Bearer invalid-token-string")
	rec := httptest.NewRecorder()
	optionalEcho().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

