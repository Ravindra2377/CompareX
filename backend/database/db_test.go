package database

import (
	"testing"

	"comparex/models"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestDatabaseMigration(t *testing.T) {
	// Use in-memory sqlite for testing
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)
	assert.NotNil(t, db)

	// Test migration for all models
	err = db.AutoMigrate(&models.User{})
	assert.NoError(t, err)

	// Verify table exists
	assert.True(t, db.Migrator().HasTable(&models.User{}))
}

func TestDatabaseOperations(t *testing.T) {
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	db.AutoMigrate(&models.User{})

	// Test Create
	user := models.User{Email: "test@example.com", Password: "hashedpassword"}
	result := db.Create(&user)
	assert.NoError(t, result.Error)
	assert.NotZero(t, user.ID)

	// Test Read
	var foundUser models.User
	result = db.First(&foundUser, user.ID)
	assert.NoError(t, result.Error)
	assert.Equal(t, "test@example.com", foundUser.Email)

	// Test Update
	db.Model(&foundUser).Update("Email", "updated@example.com")
	db.First(&foundUser, user.ID)
	assert.Equal(t, "updated@example.com", foundUser.Email)

	// Test Delete
	db.Delete(&foundUser)
	result = db.First(&foundUser, user.ID)
	assert.Error(t, result.Error) // Should be record not found
}
