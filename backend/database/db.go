package database

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Fallback for local dev if env not set, though docker-compose sets it.
		dsn = "host=localhost user=user password=password dbname=pricepilot port=5432 sslmode=disable"
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Printf("⚠️  Database connection failed (Auth/History features disabled): %v", err)
		return
	}

	fmt.Println("🚀 Connected to Database")
}
