package handlers

import (
	"comparez/database"
	"comparez/models"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

// AddToWishlist saves a product to the user's wishlist
func AddToWishlist(c echo.Context) error {
	if database.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "Database not available"})
	}

	var item models.WishlistItem
	if err := c.Bind(&item); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	if item.ProductName == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "product_name is required"})
	}
	if item.UserID == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "user_id is required"})
	}

	if err := database.DB.Create(&item).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to save wishlist item"})
	}

	return c.JSON(http.StatusCreated, item)
}

// GetWishlist returns all wishlist items for a user
func GetWishlist(c echo.Context) error {
	if database.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "Database not available"})
	}

	userID := c.QueryParam("user_id")
	if userID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "user_id query parameter is required"})
	}

	var items []models.WishlistItem
	if err := database.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&items).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch wishlist"})
	}

	return c.JSON(http.StatusOK, items)
}

// RemoveFromWishlist deletes a wishlist item by ID
func RemoveFromWishlist(c echo.Context) error {
	if database.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "Database not available"})
	}

	id := c.Param("id")
	itemID, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid wishlist item ID"})
	}

	result := database.DB.Delete(&models.WishlistItem{}, itemID)
	if result.Error != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to remove item"})
	}
	if result.RowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Item not found"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Item removed from wishlist"})
}

// SaveSearchHistory records a search query for a user
func SaveSearchHistory(c echo.Context) error {
	if database.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "Database not available"})
	}

	var entry models.SearchHistory
	if err := c.Bind(&entry); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	if entry.Query == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "query is required"})
	}
	if entry.UserID == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "user_id is required"})
	}

	if err := database.DB.Create(&entry).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to save search history"})
	}

	return c.JSON(http.StatusCreated, entry)
}

// GetUserSearchHistory returns the last 50 searches for a user
func GetUserSearchHistory(c echo.Context) error {
	if database.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "Database not available"})
	}

	userID := c.QueryParam("user_id")
	if userID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "user_id query parameter is required"})
	}

	var entries []models.SearchHistory
	if err := database.DB.Where("user_id = ?", userID).Order("created_at desc").Limit(50).Find(&entries).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch search history"})
	}

	return c.JSON(http.StatusOK, entries)
}
