package search

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConnectSetsClient(t *testing.T) {
	assert.NotPanics(t, func() {
		Connect()
	})
	assert.NotNil(t, Client)
}
