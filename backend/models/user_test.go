package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUserStructure(t *testing.T) {
	u := User{ID: 10, Email: "test@example.com", Password: "hashed"}

	assert.Equal(t, uint(10), u.ID)
	assert.Equal(t, "test@example.com", u.Email)
	assert.Equal(t, "hashed", u.Password)
}

func TestUserZeroValues(t *testing.T) {
	var u User
	assert.Equal(t, uint(0), u.ID)
	assert.Equal(t, "", u.Email)
	assert.Equal(t, "", u.Password)
}
