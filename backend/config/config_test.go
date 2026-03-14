package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoadConfigSuccess(t *testing.T) {
	content := `{
		"blinkit": {"base_url":"https://blinkit.com","headers":{"accept":"application/json"}},
		"zepto": {"base_url":"https://zepto.com"},
		"swiggy": {"base_url":"https://swiggy.com"},
		"bigbasket": {"base_url":"https://bigbasket.com"},
		"zomato": {"base_url":"https://zomato.com"}
	}`

	err := os.WriteFile("platform_config.json", []byte(content), 0o644)
	require.NoError(t, err)
	t.Cleanup(func() { _ = os.Remove("platform_config.json") })

	err = LoadConfig()
	require.NoError(t, err)
	assert.Equal(t, "https://blinkit.com", AppConfig.Blinkit.BaseURL)
	assert.Equal(t, "https://zepto.com", AppConfig.Zepto.BaseURL)
}

func TestLoadConfigMissingFile(t *testing.T) {
	_ = os.Remove("platform_config.json")
	err := LoadConfig()
	assert.Error(t, err)
}
