package main

import (
	"comparez/database"
	"comparez/handlers"
	"comparez/models"
	"comparez/scraper"
	"comparez/search"
	"net/http"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	// Initialize Database
	database.Connect()
	if database.DB != nil {
		database.DB.AutoMigrate(
			&models.User{},
			&models.SearchHistory{},
			&models.WishlistItem{},
		)
	}

	// Initialize Meilisearch
	search.Connect()

	// Initialize Scraper Service
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	// Load platform config
	scraper.Initialize()

	scraperService := scraper.NewService(redisAddr)
	handlers.ScraperSvc = scraperService

	// Initialize Echo
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Routes
	e.GET("/", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"message": "Welcome to CompareZ API",
			"status":  "healthy",
		})
	})

	e.GET("/health", func(c echo.Context) error {
		sqlDB, err := database.DB.DB()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"status": "db_connection_error"})
		}
		if err := sqlDB.Ping(); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"status": "db_ping_failed"})
		}
		return c.JSON(http.StatusOK, map[string]string{
			"status": "up",
			"db":     "connected",
		})
	})

	// Auth Routes
	e.POST("/register", handlers.Register)
	e.POST("/login", handlers.Login)

	// Account Management Routes (V2 - Frontend-First Architecture)
	accounts := e.Group("/accounts")
	{
		accounts.POST("/connect", handlers.ConnectAccount)           // Connect single platform
		accounts.POST("/bulk-connect", handlers.BulkConnectAccounts) // Connect multiple platforms
		accounts.DELETE("/disconnect/:platform", handlers.DisconnectAccount)
		accounts.GET("/status", handlers.GetAccountStatus)
	}

	// Search Routes (V2 - Collection & Analytics)
	searchV2 := e.Group("/search")
	{
		searchV2.POST("/collect", handlers.CollectSearchResults) // Collect frontend search results
		searchV2.GET("/history", handlers.GetSearchHistory)      // Get search history
		searchV2.GET("/validate", handlers.ValidateTokens)       // Validate stored tokens
	}

	// Legacy Routes (V1 - Backend Scraping - Deprecated but kept for fallback)
	e.GET("/search", handlers.SearchProducts)
	e.POST("/seed-products", handlers.SeedProducts)
	e.GET("/compare", handlers.CompareProducts)     // Legacy scraper endpoint
	e.POST("/tokens", handlers.BulkConnectAccounts) // Redirect to new endpoint

	// Wishlist Routes
	wishlist := e.Group("/wishlist")
	{
		wishlist.POST("", handlers.AddToWishlist)
		wishlist.GET("", handlers.GetWishlist)
		wishlist.DELETE("/:id", handlers.RemoveFromWishlist)
	}

	// User Search History Routes
	history := e.Group("/history")
	{
		history.POST("", handlers.SaveSearchHistory)
		history.GET("", handlers.GetUserSearchHistory)
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	e.Logger.Fatal(e.Start(":" + port))
}
