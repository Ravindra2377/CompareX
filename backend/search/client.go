package search

import (
	"log"
	"os"

	"github.com/meilisearch/meilisearch-go"
)

var Client meilisearch.ServiceManager

func Connect() {
	host := os.Getenv("MEILI_HOST")
	if host == "" {
		host = "http://localhost:7700"
	}

	key := os.Getenv("MEILI_MASTER_KEY")
	if key == "" {
		key = "masterKey"
	}

	Client = meilisearch.New(host, meilisearch.WithAPIKey(key))

	// Create index if not exists
	_, err := Client.CreateIndex(&meilisearch.IndexConfig{
		Uid:        "products",
		PrimaryKey: "id",
	})
	if err != nil {
		// Index might already exist or connection failed
		log.Println("Meilisearch index creation/check:", err)
	} else {
		log.Println("🚀 Connected to Meilisearch and ensured 'products' index")
	}

	// Add filterable attributes
	filterableAttributes := []interface{}{"category", "brand"}
	_, err = Client.Index("products").UpdateFilterableAttributes(&filterableAttributes)
	if err != nil {
		log.Println("Failed to update filterable attributes:", err)
	}
}
