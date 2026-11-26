package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestUserStructure(t *testing.T) {
	id := primitive.NewObjectID()
	u := User{ID: id, Email: "test@example.com", Password: "hashed"}

	assert.Equal(t, id, u.ID)
	assert.Equal(t, "test@example.com", u.Email)
	assert.Equal(t, "hashed", u.Password)
}

func TestUserZeroValues(t *testing.T) {
	var u User
	assert.Equal(t, primitive.NilObjectID, u.ID)
	assert.Equal(t, "", u.Email)
	assert.Equal(t, "", u.Password)
}
