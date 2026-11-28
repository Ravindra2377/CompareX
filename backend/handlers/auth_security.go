package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	jwtIssuer        = "comparez-api"
	jwtAudience      = "comparez-app"
	userIDContextKey = "user_id"
	minJWTSecretSize = 32
)

type authClaims struct {
	UserID string `json:"id"`
	jwt.RegisteredClaims
}

func jwtSecret() ([]byte, error) {
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < minJWTSecretSize {
		return nil, fmt.Errorf("JWT_SECRET must contain at least %d characters", minJWTSecretSize)
	}
	return []byte(secret), nil
}

// ValidateSecurityConfig is called before the server accepts traffic.
func ValidateSecurityConfig() error {
	_, err := jwtSecret()
	return err
}

func issueToken(userID string) (string, error) {
	secret, err := jwtSecret()
	if err != nil {
		return "", err
	}

	now := time.Now()
	claims := authClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			Audience:  jwt.ClaimStrings{jwtAudience},
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now.Add(-30 * time.Second)),
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
		},
	}

	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
}

// RequireAuth validates the bearer token and places its user id in the request context.
func RequireAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		header := strings.TrimSpace(c.Request().Header.Get(echo.HeaderAuthorization))
		parts := strings.Fields(header)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Authentication required"})
		}

		secret, err := jwtSecret()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Authentication is not configured"})
		}

		claims := new(authClaims)
		token, err := jwt.ParseWithClaims(
			parts[1],
			claims,
			func(token *jwt.Token) (interface{}, error) {
				if token.Method != jwt.SigningMethodHS256 {
					return nil, errors.New("unexpected signing algorithm")
				}
				return secret, nil
			},
			jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
			jwt.WithIssuer(jwtIssuer),
			jwt.WithAudience(jwtAudience),
			jwt.WithExpirationRequired(),
			jwt.WithLeeway(30*time.Second),
		)
		if err != nil || !token.Valid || claims.UserID == "" || claims.Subject != claims.UserID {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid or expired token"})
		}
		if _, err := primitive.ObjectIDFromHex(claims.UserID); err != nil {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid token subject"})
		}

		c.Set(userIDContextKey, claims.UserID)
		return next(c)
	}
}

// OptionalAuth validates the bearer token if provided, placing the user id in the request context.
// If no Authorization header is present, the request proceeds as an unauthenticated guest.
// If an invalid or expired token is presented, it returns 401 Unauthorized.
func OptionalAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		header := strings.TrimSpace(c.Request().Header.Get(echo.HeaderAuthorization))
		if header == "" {
			return next(c)
		}

		parts := strings.Fields(header)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid authorization format"})
		}

		secret, err := jwtSecret()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Authentication is not configured"})
		}

		claims := new(authClaims)
		token, err := jwt.ParseWithClaims(
			parts[1],
			claims,
			func(token *jwt.Token) (interface{}, error) {
				if token.Method != jwt.SigningMethodHS256 {
					return nil, errors.New("unexpected signing algorithm")
				}
				return secret, nil
			},
			jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
			jwt.WithIssuer(jwtIssuer),
			jwt.WithAudience(jwtAudience),
			jwt.WithExpirationRequired(),
			jwt.WithLeeway(30*time.Second),
		)
		if err != nil || !token.Valid || claims.UserID == "" || claims.Subject != claims.UserID {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid or expired token"})
		}
		if _, err := primitive.ObjectIDFromHex(claims.UserID); err != nil {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid token subject"})
		}

		c.Set(userIDContextKey, claims.UserID)
		return next(c)
	}
}

func authenticatedUserID(c echo.Context) (string, bool) {
	id, ok := c.Get(userIDContextKey).(string)
	if !ok || id == "" {
		return "", false
	}
	return id, true
}

func authenticatedUserObjectID(c echo.Context) (primitive.ObjectID, bool) {
	id, ok := authenticatedUserID(c)
	if !ok {
		return primitive.NilObjectID, false
	}
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return primitive.NilObjectID, false
	}
	return objectID, true
}
