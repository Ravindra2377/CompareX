package handlers

import (
	"comparez/search"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/meilisearch/meilisearch-go"
)

func SearchProducts(c echo.Context) error {
	query := c.QueryParam("q")
	if query == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Query parameter 'q' is required"})
	}

	searchRes, err := search.Client.Index("products").Search(query, &meilisearch.SearchRequest{
		Limit: 20,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Search failed"})
	}

	return c.JSON(http.StatusOK, searchRes.Hits)
}

// Temporary endpoint to seed data for testing
func SeedProducts(c echo.Context) error {
	documents := []map[string]interface{}{
		{"id": 1, "name": "Apple iPhone 15 Pro", "brand": "Apple", "category": "Smartphone", "price": 999},
		{"id": 2, "name": "Samsung Galaxy S24 Ultra", "brand": "Samsung", "category": "Smartphone", "price": 1199},
		{"id": 3, "name": "Sony WH-1000XM5", "brand": "Sony", "category": "Headphones", "price": 348},
		{"id": 4, "name": "MacBook Pro M3", "brand": "Apple", "category": "Laptop", "price": 1599},
		{"id": 5, "name": "Nintendo Switch OLED", "brand": "Nintendo", "category": "Gaming", "price": 349},
	}

	// Add to Meilisearch
	primaryKey := "id"
	task, err := search.Client.Index("products").AddDocuments(documents, &meilisearch.DocumentOptions{PrimaryKey: &primaryKey})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to add documents"})
	}

	return c.JSON(http.StatusOK, task)
}
