package main

import (
	"comparez/database"
	"comparez/handlers"
	"comparez/search"
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"
)

func allowedOrigins() []string {
	raw := strings.TrimSpace(os.Getenv("CORS_ALLOWED_ORIGINS"))
	if raw == "" {
		return []string{"http://localhost:19006", "http://localhost:8081"}
	}
	origins := make([]string, 0)
	for _, origin := range strings.Split(raw, ",") {
		if trimmed := strings.TrimSpace(origin); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Printf("⚠️  No .env file found: %v", err)
	}
	if err := handlers.ValidateSecurityConfig(); err != nil {
		log.Fatalf("security configuration error: %v", err)
	}

	// Initialize Database
	database.Connect()

	// Initialize Meilisearch
	search.Connect()

	// Legacy Scraper Service disabled in AI Platform V5.1.
	// Backend scraper initialization and direct retailer scraping are retired
	// in favor of Universal Web Intelligence and Dynamic Product Intelligence.
	handlers.ScraperSvc = nil

	// Initialize Echo
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.RequestID())
	e.Use(middleware.SecureWithConfig(middleware.SecureConfig{
		XFrameOptions:         "DENY",
		ContentTypeNosniff:    "nosniff",
		HSTSMaxAge:            31536000,
		HSTSPreloadEnabled:    true,
		ReferrerPolicy:        "no-referrer",
		ContentSecurityPolicy: "default-src 'none'; frame-ancestors 'none'",
	}))
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: allowedOrigins(),
		AllowMethods: []string{
			http.MethodGet,
			http.MethodPost,
			http.MethodDelete,
			http.MethodOptions,
		},
		AllowHeaders: []string{
			echo.HeaderOrigin,
			echo.HeaderContentType,
			echo.HeaderAccept,
			echo.HeaderAuthorization,
			"X-Request-ID",
		},
		MaxAge: 600,
	}))

	authLimiter := middleware.RateLimiter(
		middleware.NewRateLimiterMemoryStoreWithConfig(
			middleware.RateLimiterMemoryStoreConfig{
				Rate:      rate.Limit(0.2),
				Burst:     5,
				ExpiresIn: 15 * time.Minute,
			},
		),
	)
	apiLimiter := middleware.RateLimiter(
		middleware.NewRateLimiterMemoryStoreWithConfig(
			middleware.RateLimiterMemoryStoreConfig{
				Rate:      rate.Limit(10),
				Burst:     30,
				ExpiresIn: 5 * time.Minute,
			},
		),
	)
	aiLimiter := middleware.RateLimiter(
		middleware.NewRateLimiterMemoryStoreWithConfig(
			middleware.RateLimiterMemoryStoreConfig{
				Rate:      rate.Limit(0.5),
				Burst:     5,
				ExpiresIn: 10 * time.Minute,
			},
		),
	)

	// Routes
	e.GET("/", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"message": "Welcome to CompareZ API",
			"status":  "healthy",
		})
	})

	e.GET("/health", func(c echo.Context) error {
		if database.Client == nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"status": "db_connection_error"})
		}
		if err := database.Client.Ping(context.Background(), nil); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"status": "db_ping_failed"})
		}
		return c.JSON(http.StatusOK, map[string]string{
			"status": "up",
			"db":     "connected",
		})
	})

	// Auth Routes
	e.POST("/register", handlers.Register, authLimiter, middleware.BodyLimit("64K"))
	e.POST("/login", handlers.Login, authLimiter, middleware.BodyLimit("32K"))

	protected := e.Group("", handlers.RequireAuth, apiLimiter)

	// Account Management Routes (V2 - Frontend-First Architecture)
	accounts := protected.Group("/accounts")
	{
		accounts.POST("/connect", handlers.ConnectAccount)           // Connect single platform
		accounts.POST("/bulk-connect", handlers.BulkConnectAccounts) // Connect multiple platforms
		accounts.DELETE("", handlers.DisconnectAllAccounts)
		accounts.DELETE("/disconnect/:platform", handlers.DisconnectAccount)
		accounts.GET("/status", handlers.GetAccountStatus)
	}

	// Search Routes (V2 - Collection & Analytics)
	searchV2 := protected.Group("/search")
	{
		searchV2.POST("/collect", handlers.CollectSearchResults) // Collect frontend search results
		searchV2.GET("/history", handlers.GetSearchHistory)      // Get search history
		searchV2.GET("/price-history", handlers.GetPriceHistory) // Real observed 30/90-day prices
		searchV2.GET("/validate", handlers.ValidateTokens)       // Validate stored tokens
	}

	// Legacy Routes (V1 - Backend Scraping - Deprecated but kept for fallback)
	protected.GET("/search", handlers.SearchProducts)
	protected.POST("/seed-products", handlers.SeedProducts, middleware.BodyLimit("1M"))
	protected.GET("/compare", handlers.CompareProducts)
	protected.POST("/tokens", handlers.BulkConnectAccounts, middleware.BodyLimit("1M"))

	// AI Assistant & Research Platform Routes (Supports guest access & authenticated persistence via OptionalAuth)
	e.POST("/ai/research", handlers.AIResearch, handlers.OptionalAuth, aiLimiter, middleware.BodyLimit("64K"))
	e.POST("/ai/research/stream", handlers.AIResearchStream, handlers.OptionalAuth, aiLimiter, middleware.BodyLimit("64K"))
	protected.GET("/ai/conversations", handlers.ListConversations)
	protected.GET("/ai/conversations/:id", handlers.GetConversation)
	protected.DELETE("/ai/conversations/:id", handlers.DeleteConversation)

	// AI Proxy Routes (Groq key stays server-side, accessible to guest & authenticated users)
	e.POST("/ai/chat", handlers.AIChat, handlers.OptionalAuth, aiLimiter, middleware.BodyLimit("256K"))
	e.POST("/ai/transcribe", handlers.AITranscribe, handlers.OptionalAuth, aiLimiter, middleware.BodyLimit("26M"))

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	// Legacy Background Worker disabled during MongoDB Migration
	// go startSearchWorker(scraperService)

	// Start Echo server
	e.Logger.Fatal(e.Start("0.0.0.0:" + port))
}
