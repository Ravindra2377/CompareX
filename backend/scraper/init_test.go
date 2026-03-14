package scraper

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestInitializeDoesNotPanic(t *testing.T) {
	content := `{"blinkit":{"base_url":"https://blinkit.com"}}`
	_ = os.WriteFile("platform_config.json", []byte(content), 0o644)
	t.Cleanup(func() { _ = os.Remove("platform_config.json") })

	assert.NotPanics(t, func() {
		Initialize()
	})
}
