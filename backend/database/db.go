package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"comparez/models"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	// Client is the legacy MongoDB client.
	Client *mongo.Client
	// DB is the legacy MongoDB database reference.
	DB *mongo.Database
	// GormDB is the primary PostgreSQL persistent relational store.
	GormDB *gorm.DB
	// RedisClient is the distributed cache and session store.
	RedisClient *redis.Client
)

// Connect initializes persistent databases and the Redis cache layer.
func Connect() {
	initPostgres()
	initRedis()
	initMongo()
}

func initPostgres() {
	pgURI := strings.TrimSpace(os.Getenv("POSTGRES_URL"))
	if pgURI == "" {
		dbURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
		if strings.HasPrefix(dbURL, "postgres://") || strings.HasPrefix(dbURL, "postgresql://") {
			pgURI = dbURL
		}
	}

	if pgURI == "" {
		log.Println("ℹ️  No POSTGRES_URL or postgres DATABASE_URL provided. PostgreSQL disabled.")
		return
	}

	log.Println("🐘 Connecting to PostgreSQL database...")
	db, err := gorm.Open(postgres.Open(pgURI), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Printf("⚠️  PostgreSQL connection failed: %v", err)
		return
	}

	// AutoMigrate all relational platform entities
	err = db.AutoMigrate(
		&models.UserSQL{},
		&models.Conversation{},
		&models.Message{},
		&models.Source{},
		&models.ProductComparisonRecord{},
		&models.SearchHistorySQL{},
		&models.WishlistItem{},
	)
	if err != nil {
		log.Printf("⚠️  PostgreSQL AutoMigrate warning: %v", err)
	}

	GormDB = db
	fmt.Println("🚀 Connected to PostgreSQL and migrated relational schemas successfully")
}

func initRedis() {
	redisAddr := strings.TrimSpace(os.Getenv("REDIS_ADDR"))
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	rdb := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("⚠️  Redis not reachable at %s (in-memory fallback active): %v", redisAddr, err)
		RedisClient = nil
		return
	}

	RedisClient = rdb
	fmt.Printf("🚀 Connected to Redis at %s for sessions and caching\n", redisAddr)
}

func initMongo() {
	mongoURI := strings.TrimSpace(os.Getenv("MONGO_URI"))
	if mongoURI == "" {
		dbURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
		if strings.HasPrefix(dbURL, "mongodb://") || strings.HasPrefix(dbURL, "mongodb+srv://") {
			mongoURI = dbURL
		}
	}

	if mongoURI == "" {
		// If PostgreSQL is already connected, MongoDB is optional.
		if GormDB != nil {
			log.Println("ℹ️  PostgreSQL active, MongoDB not configured.")
			return
		}
		mongoURI = "mongodb://localhost:27017"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(mongoURI)
	localClient, connErr := mongo.Connect(ctx, clientOptions)
	if connErr == nil {
		connErr = localClient.Ping(ctx, nil)
	}

	if connErr != nil {
		log.Printf("ℹ️  MongoDB connection skipped or unavailable: %v\n", connErr)
		Client = nil
		DB = nil
		return
	}

	Client = localClient
	DB = Client.Database("comparez")

	indexCtx, indexCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer indexCancel()

	_, _ = DB.Collection("users").Indexes().CreateOne(
		indexCtx,
		mongo.IndexModel{
			Keys:    bson.D{{Key: "email", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("unique_user_email"),
		},
	)
	_, _ = DB.Collection("search_history").Indexes().CreateOne(
		indexCtx,
		mongo.IndexModel{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "created_at", Value: -1},
			},
			Options: options.Index().SetName("user_search_history"),
		},
	)

	fmt.Println("🚀 Connected to MongoDB")
}
