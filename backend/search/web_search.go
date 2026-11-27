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

	pageFetchClient = &http.Client{
		Timeout: 4 * time.Second,
	}

	linkRegex    = regexp.MustCompile(`<a[^>]+class=['"]result-link['"][^>]+href=['"]([^'"]+)['"][^>]*>([\s\S]*?)</a>`)
	snippetRegex = regexp.MustCompile(`<td[^>]+class=['"]result-snippet['"][^>]*>([\s\S]*?)</td>`)
	htmlTagRegex = regexp.MustCompile(`<[^>]+>`)
	scriptRegex  = regexp.MustCompile(`(?is)<(script|style|nav|header|footer)[^>]*>.*?</(script|style|nav|header|footer)>`)

	promptInjectionRegex = regexp.MustCompile(`(?i)(ignore\s+(all\s+)?(previous|prior)\s+instructions|system\s*prompt|you\s+are\s+now\s+a|output\s+the\s+secret)`)
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

	var sources []models.Source
	var err error

	// 1. Try Serper API if key is provided in environment
	if serperKey := os.Getenv("SERPER_API_KEY"); serperKey != "" {
		sources, err = searchSerper(ctx, cleanQuery, serperKey, maxResults)
	}

	// 2. Query DuckDuckGo Lite search if Serper not configured or returned empty
	if len(sources) == 0 {
		sources, err = searchDuckDuckGoLite(ctx, cleanQuery, maxResults)
	}

	if err != nil && len(sources) == 0 {
		return []models.Source{}, err
	}

	// 3. Enrich top result with full page text if snippet is brief
	for i := range sources {
		if i >= 2 {
			break
		}
		if len(sources[i].Snippet) < 100 && sources[i].URL != "" {
			pageText, fetchErr := FetchPageContent(ctx, sources[i].URL, 400)
			if fetchErr == nil && len(pageText) > len(sources[i].Snippet) {
				sources[i].Snippet = pageText
			}
		}
	}

	return sources, nil
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
		cleanTitle := SanitizePromptInjection(cleanHTMLText(rawTitle))

		cleanSnippet := ""
		if i < len(snippetMatches) && len(snippetMatches[i]) >= 2 {
			cleanSnippet = SanitizePromptInjection(cleanHTMLText(snippetMatches[i][1]))
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
		cleanTitle := SanitizePromptInjection(strings.TrimSpace(item.Title))
		cleanSnippet := SanitizePromptInjection(strings.TrimSpace(item.Snippet))

		sources = append(sources, models.Source{
			Number:  len(sources) + 1,
			Title:   cleanTitle,
			URL:     item.Link,
			Domain:  domain,
			Snippet: cleanSnippet,
		})
	}

	return sources, nil
}

var safePageFetchClient = NewSafeHTTPClient(3 * time.Second)

// FetchPageContent retrieves the readable text of an external web page, protected against SSRF and prompt injection.
func FetchPageContent(ctx context.Context, pageURL string, maxChars int) (string, error) {
	if maxChars <= 0 {
		maxChars = 600
	}

	// 1. Strict SSRF destination validation (blocks loopback, private ranges, cloud metadata)
	if err := ValidateSafeURL(pageURL); err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "GET", pageURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,text/plain;q=0.9")

	resp, err := safePageFetchClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", nil
	}

	// Limit reader to 256KB to avoid memory exhaustion
	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 256*1024))
	if err != nil {
		return "", err
	}

	rawHTML := string(bodyBytes)
	strippedScripts := scriptRegex.ReplaceAllString(rawHTML, " ")
	plainText := cleanHTMLText(strippedScripts)
	safeText := SanitizePromptInjection(plainText)

	if len(safeText) > maxChars {
		safeText = safeText[:maxChars] + "..."
	}

	return safeText, nil
}

// SanitizePromptInjection filters known injection patterns from external content.
func SanitizePromptInjection(text string) string {
	return promptInjectionRegex.ReplaceAllString(text, "[filtered safety pattern]")
}

func cleanHTMLText(raw string) string {
	stripped := htmlTagRegex.ReplaceAllString(raw, " ")
	unescaped := html.UnescapeString(stripped)
	fields := strings.Fields(unescaped)
	return strings.Join(fields, " ")
}
