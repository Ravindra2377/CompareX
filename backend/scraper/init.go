package scraper

import (
	"comparex/config"
	"log"
)

// Initialize loads the configuration on startup
func Initialize() {
	if err := config.LoadConfig(); err != nil {
		log.Printf("⚠️  Could not load platform_config.json: %v", err)
	} else {
		log.Println("✅ Loaded platform configuration from JSON")
	}
}
