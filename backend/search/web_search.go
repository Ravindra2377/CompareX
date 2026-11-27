package search

import (
	"bytes"
	"context"
	"encoding/json"
	"html"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"

	"comparez/models"
)

var (
	webHTTPClient = &http.Client{
		Timeout: 10 * time.Second,
	}

	linkRegex    = regexp.MustCompile(`<a[^>]+class=['"]result-link['"][^>]+href=['"]([^'"]+)['"][^>]*>([\s\S]*?)</a>`)
	snippetRegex = regexp.MustCompile(`<td[^>]+class=['"]result-snippet['"][^>]*>([\s\S]*?)</td>`)
	htmlTagRegex = regexp.MustCompile(`<[^>]+>`)
)

// SearchWeb performs real, live web search using DuckDuckGo or Serper (if configured).
// Returns evidence-backed sources with real URLs, domains, titles, and snippets.
// It never manufactures or hallucinates fake sources.
func SearchWeb(ctx context.Context, query string, maxResults int) ([]models.Source, error) {
	cleanQuery := strings.TrimSpace(query)
	if cleanQuery == "" {
		return []models.Source{}, nil
	}
	if maxResults <= 0 {
		maxResults = 4
	}
	if maxResults > 10 {
		maxResults = 10
	}

	// 1. Try Serper API if key is provided in environment
	if serperKey := os.Getenv("SERPER_API_KEY"); serperKey != "" {
		sources, err := searchSerper(ctx, cleanQuery, serperKey, maxResults)
		if err == nil && len(sources) > 0 {
			return sources, nil
		}
	}

	// 2. Query DuckDuckGo Lite search
	return searchDuckDuckGoLite(ctx, cleanQuery, maxResults)
}

func searchDuckDuckGoLite(ctx context.Context, query string, maxResults int) ([]models.Source, error) {
	form := url.Values{}
	form.Set("q", query)

	req, err := http.NewRequestWithContext(ctx, "POST", "https://lite.duckduckgo.com/lite/", strings.NewReader(form.Encode()))
	if err != nil {
		return []models.Source{}, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	resp, err := webHTTPClient.Do(req)
	if err != nil {
		return []models.Source{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return []models.Source{}, nil
	}

	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))
	if err != nil {
		return []models.Source{}, err
	}

	htmlContent := string(bodyBytes)
	linkMatches := linkRegex.FindAllStringSubmatch(htmlContent, maxResults*2)
	snippetMatches := snippetRegex.FindAllStringSubmatch(htmlContent, maxResults*2)

	sources := make([]models.Source, 0, maxResults)
	for i, match := range linkMatches {
		if len(sources) >= maxResults {
			break
		}
		if len(match) < 3 {
			continue
		}

		rawURL := strings.TrimSpace(match[1])
		rawTitle := match[2]

		// Filter out internal / relative links
		if strings.HasPrefix(rawURL, "/") || strings.Contains(rawURL, "duckduckgo.com") {
			continue
		}

		parsedURL, err := url.Parse(rawURL)
		if err != nil || parsedURL.Host == "" {
			continue
		}

		domain := strings.TrimPrefix(parsedURL.Host, "www.")
		cleanTitle := cleanHTMLText(rawTitle)

		cleanSnippet := ""
		if i < len(snippetMatches) && len(snippetMatches[i]) >= 2 {
			cleanSnippet = cleanHTMLText(snippetMatches[i][1])
		}

		if cleanTitle == "" {
			cleanTitle = domain
		}

		sources = append(sources, models.Source{
			Number:  len(sources) + 1,
			Title:   cleanTitle,
			URL:     rawURL,
			Domain:  domain,
			Snippet: cleanSnippet,
		})
	}

	return sources, nil
}

type serperSearchResponse struct {
	Organic []struct {
		Title   string `json:"title"`
		Link    string `json:"link"`
		Snippet string `json:"snippet"`
	} `json:"organic"`
}

func searchSerper(ctx context.Context, query string, apiKey string, maxResults int) ([]models.Source, error) {
	payload := map[string]interface{}{
		"q":   query,
		"num": maxResults,
		"gl":  "in",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://google.serper.dev/search", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-API-KEY", apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := webHTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, nil
	}

	var serperResp serperSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&serperResp); err != nil {
		return nil, err
	}

	sources := make([]models.Source, 0, len(serperResp.Organic))
	for _, item := range serperResp.Organic {
		if len(sources) >= maxResults {
			break
		}
		parsedURL, err := url.Parse(item.Link)
		domain := ""
		if err == nil {
			domain = strings.TrimPrefix(parsedURL.Host, "www.")
		}
		sources = append(sources, models.Source{
			Number:  len(sources) + 1,
			Title:   strings.TrimSpace(item.Title),
			URL:     item.Link,
			Domain:  domain,
			Snippet: strings.TrimSpace(item.Snippet),
		})
	}

	return sources, nil
}

func cleanHTMLText(raw string) string {
	stripped := htmlTagRegex.ReplaceAllString(raw, "")
	unescaped := html.UnescapeString(stripped)
	fields := strings.Fields(unescaped)
	return strings.Join(fields, " ")
}
