package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Fallback for local dev if env not set, though docker-compose sets it.
		dsn = "host=localhost user=user password=password dbname=pricepilot port=5432 sslmode=disable"
	}

	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	}

	// Retry up to 3 times — cloud DBs may take a moment to accept connections
	var connErr error
	var localDB *gorm.DB

	for attempt := 1; attempt <= 3; attempt++ {
		localDB, connErr = gorm.Open(postgres.Open(dsn), gormConfig)
		if connErr == nil {
			break
		}
		log.Printf("⚠️  Database connection attempt %d/3 failed: %v", attempt, connErr)
		if attempt < 3 {
			time.Sleep(time.Duration(attempt*2) * time.Second)
		}
	}

	if connErr != nil {
		log.Printf("⚠️  Database connection failed after 3 attempts: %v", connErr)
		DB = nil // Explicitly set to nil so app knows it failed
		return
	}

	DB = localDB // Successfully connected

	// Connection pool tuning for cloud-hosted PostgreSQL (Supabase, Neon, etc.)
	sqlDB, poolErr := DB.DB()
	if poolErr == nil {
		sqlDB.SetMaxOpenConns(10)                  // Max simultaneous connections
		sqlDB.SetMaxIdleConns(5)                   // Keep 5 warm connections
		sqlDB.SetConnMaxLifetime(5 * time.Minute)  // Recycle connections every 5 mins
		sqlDB.SetConnMaxIdleTime(3 * time.Minute)  // Close idle connections after 3 mins
	}

	fmt.Println("🚀 Connected to Database")
}

