package config

import (
	"encoding/json"
	"io"
	"os"
)

type PlatformConfig struct {
	BaseURL string            `json:"base_url"`
	Headers map[string]string `json:"headers"`
	Params  map[string]string `json:"params"`
	Payload map[string]string `json:"payload"`
	ActorID string            `json:"actor_id"`
}

type Config struct {
	Blinkit     PlatformConfig `json:"blinkit"`
	Zepto       PlatformConfig `json:"zepto"`
	Instamart   PlatformConfig `json:"instamart"`
	BigBasket   PlatformConfig `json:"bigbasket"`
	ApifyApiKey string         `json:"apify_api_key"`
}

var AppConfig Config

func LoadConfig() error {
	path := "platform_config.json"
	// fallback for running from cmd/test_scrape
	if _, err := os.Stat(path); os.IsNotExist(err) {
		path = "../../platform_config.json"
	}

	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	byteValue, _ := io.ReadAll(f)
	return json.Unmarshal(byteValue, &AppConfig)
}
