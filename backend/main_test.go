package main

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMainEntrypointFilePresent(t *testing.T) {
	_, err := os.Stat("main.go")
	assert.NoError(t, err)
}
