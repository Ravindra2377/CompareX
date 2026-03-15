package scraper

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type ApifyClient struct {
	apiKey string
	client *http.Client
}

func NewApifyClient(apiKey string) *ApifyClient {
	return &ApifyClient{
		apiKey: apiKey,
		client: &http.Client{Timeout: 120 * time.Second}, // Apify actors can take time
	}
}

func (a *ApifyClient) RunActorSync(ctx context.Context, actorID string, input interface{}) ([]map[string]interface{}, error) {
	if a.apiKey == "" || a.apiKey == "PASTE_YOUR_APIFY_API_KEY_HERE" {
		return nil, fmt.Errorf("apify api key not configured")
	}

	// 1. Run the actor
	url := fmt.Sprintf("https://api.apify.com/v2/acts/%s/runs?token=%s&wait=120", actorID, a.apiKey)
	
	bodyData, err := json.Marshal(input)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(bodyData))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 201 && resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("apify run actor error: status=%d body=%s", resp.StatusCode, string(body))
	}

	var runResult struct {
		Data struct {
			DefaultDatasetId string `json:"defaultDatasetId"`
			Status           string `json:"status"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&runResult); err != nil {
		return nil, err
	}

	if runResult.Data.Status != "SUCCEEDED" && runResult.Data.Status != "RUNNING" {
		// If it's still running, it might have timed out waiting but we can still check the dataset
		if runResult.Data.Status == "TIMED-OUT" || runResult.Data.Status == "ABORTED" {
			return nil, fmt.Errorf("apify actor run failed with status: %s", runResult.Data.Status)
		}
	}

	// 2. Fetch results from dataset
	datasetID := runResult.Data.DefaultDatasetId
	if datasetID == "" {
		return nil, fmt.Errorf("no dataset id returned from apify")
	}

	return a.FetchDatasetItems(ctx, datasetID)
}

func (a *ApifyClient) FetchDatasetItems(ctx context.Context, datasetID string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("https://api.apify.com/v2/datasets/%s/items?token=%s", datasetID, a.apiKey)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("apify fetch dataset error: status=%d", resp.StatusCode)
	}

	var items []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&items); err != nil {
		return nil, err
	}

	return items, nil
}
