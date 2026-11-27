package handlers

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"comparez/database"
	"comparez/models"
	"comparez/search"

	"github.com/labstack/echo/v4"
)

// ─── Constants & Configuration ───────────────────────────────────────────────

const (
	groqChatURL  = "https://api.groq.com/openai/v1/chat/completions"
	groqAudioURL = "https://api.groq.com/openai/v1/audio/transcriptions"
)

var aiHTTPClient = &http.Client{Timeout: 60 * time.Second}

var allowedChatModels = map[string]bool{
	"llama-3.1-8b-instant":    true,
	"llama-3.3-70b-versatile": true,
	"openai/gpt-oss-20b":       true,
	"openai/gpt-oss-120b":      true,
	"qwen/qwen3.8-27b":        true,
}

// checkGuestAIRateLimit enforces abuse prevention for guest users.
// Authenticated users bypass this or have much higher quotas.
func checkGuestAIRateLimit(c echo.Context, endpoint string, maxRequestsPerHour int) bool {
	_, isAuth := authenticatedUserID(c)
	if isAuth {
		return true // Authenticated users covered by middleware limiter
	}

	if database.RedisClient == nil {
		return true
	}

	clientIP := c.RealIP()
	if clientIP == "" {
		clientIP = c.Request().RemoteAddr
	}

	hourKey := fmt.Sprintf("rl_ai:%s:%s:%d", endpoint, clientIP, time.Now().Unix()/3600)
	ctx := c.Request().Context()

	count, err := database.RedisClient.Incr(ctx, hourKey).Result()
	if err != nil {
		return true
	}

	if count == 1 {
		database.RedisClient.Expire(ctx, hourKey, 2*time.Hour)
	}

	return count <= int64(maxRequestsPerHour)
}

func validateAIChatRequest(req *AIChatRequest) bool {
	if !allowedChatModels[req.Model] || len(req.Messages) == 0 || len(req.Messages) > 30 {
		return false
	}
	if req.MaxTokens < 1 || req.MaxTokens > 1000 || req.Temperature < 0 || req.Temperature > 1.5 {
		return false
	}

	totalContentSize := 0
	cleanMessages := make([]map[string]string, 0, len(req.Messages))
	for _, message := range req.Messages {
		role := message["role"]
		content := message["content"]
		if (role != "system" && role != "user" && role != "assistant") || content == "" || len(content) > 8*1024 {
			return false
		}
		totalContentSize += len(content)
		if totalContentSize > 32*1024 {
			return false
		}
		cleanMessages = append(cleanMessages, map[string]string{
			"role":    role,
			"content": content,
		})
	}
	req.Messages = cleanMessages
	return true
}

// ─── Request / Response types ────────────────────────────────────────────────

// AIChatRequest mirrors the Groq chat completions request shape.
type AIChatRequest struct {
	Model          string                 `json:"model"`
	Messages       []map[string]string    `json:"messages"`
	MaxTokens      int                    `json:"max_tokens"`
	Temperature    float64                `json:"temperature"`
	ResponseFormat map[string]interface{} `json:"response_format,omitempty"`
}

// ─── POST /ai/chat ───────────────────────────────────────────────────────────
// Proxies a chat completion request to Groq with the server-side API key.

func AIChat(c echo.Context) error {
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "AI service not configured",
		})
	}

	if !checkGuestAIRateLimit(c, "chat", 40) {
		return c.JSON(http.StatusTooManyRequests, map[string]string{
			"error": "Guest AI request limit reached. Please sign in or try again later.",
		})
	}

	var req AIChatRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request body",
		})
	}
	if !validateAIChatRequest(&req) {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid AI request parameters",
		})
	}

	body, err := json.Marshal(req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to encode request",
		})
	}

	groqReq, err := http.NewRequestWithContext(c.Request().Context(), "POST", groqChatURL, bytes.NewReader(body))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to create upstream request",
		})
	}
	groqReq.Header.Set("Content-Type", "application/json")
	groqReq.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := aiHTTPClient.Do(groqReq)
	if err != nil {
		return c.JSON(http.StatusBadGateway, map[string]string{
			"error": "Failed to reach AI service",
		})
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.JSON(http.StatusBadGateway, map[string]string{
			"error": "Failed to read AI response",
		})
	}

	return c.Blob(resp.StatusCode, "application/json", respBody)
}

// ─── POST /ai/transcribe ────────────────────────────────────────────────────
// Proxies an audio transcription (Whisper) request to Groq.

func AITranscribe(c echo.Context) error {
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "AI service not configured",
		})
	}

	if !checkGuestAIRateLimit(c, "transcribe", 20) {
		return c.JSON(http.StatusTooManyRequests, map[string]string{
			"error": "Voice transcription limit reached. Please sign in to continue.",
		})
	}

	contentType := c.Request().Header.Get("Content-Type")
	mediaType, params, err := mime.ParseMediaType(contentType)
	if err != nil || !strings.HasPrefix(mediaType, "multipart/") {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Expected multipart/form-data",
		})
	}

	mr := multipart.NewReader(c.Request().Body, params["boundary"])
	bodyBuf := &bytes.Buffer{}
	writer := multipart.NewWriter(bodyBuf)

	fileFound := false
	for {
		part, err := mr.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "Failed to parse multipart data",
			})
		}

		fieldName := part.FormName()
		if fieldName == "file" {
			if fileFound || part.FileName() == "" {
				part.Close()
				return c.JSON(http.StatusBadRequest, map[string]string{
					"error": "Exactly one audio file is required",
				})
			}
			contentType := strings.ToLower(part.Header.Get("Content-Type"))
			if contentType != "" && !strings.HasPrefix(contentType, "audio/") && contentType != "application/octet-stream" {
				part.Close()
				return c.JSON(http.StatusBadRequest, map[string]string{
					"error": "Unsupported audio type",
				})
			}
			fileFound = true
			destPart, err := writer.CreateFormFile("file", part.FileName())
			if err != nil {
				return c.JSON(http.StatusInternalServerError, map[string]string{
					"error": "Failed to create file part",
				})
			}
			if _, err := io.Copy(destPart, part); err != nil {
				return c.JSON(http.StatusInternalServerError, map[string]string{
					"error": "Failed to copy file data",
				})
			}
		} else if fieldName == "language" {
			val, _ := io.ReadAll(part)
			if len(val) > 16 {
				part.Close()
				return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid language"})
			}
			if err := writer.WriteField(fieldName, string(val)); err != nil {
				return c.JSON(http.StatusInternalServerError, map[string]string{
					"error": "Failed to write form field",
				})
			}
		}
		part.Close()
	}
	if !fileFound {
		writer.Close()
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Audio file is required"})
	}
	if err := writer.WriteField("model", "whisper-large-v3-turbo"); err != nil {
		writer.Close()
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to prepare audio request"})
	}
	writer.Close()

	groqReq, err := http.NewRequestWithContext(c.Request().Context(), "POST", groqAudioURL, bodyBuf)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to create transcription request",
		})
	}
	groqReq.Header.Set("Content-Type", writer.FormDataContentType())
	groqReq.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := aiHTTPClient.Do(groqReq)
	if err != nil {
		return c.JSON(http.StatusBadGateway, map[string]string{
			"error": "Failed to reach AI service",
		})
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.JSON(http.StatusBadGateway, map[string]string{
			"error": "Failed to read AI response",
		})
	}

	return c.Blob(resp.StatusCode, "application/json", respBody)
}

// ─── AI Research & Multi-Source Orchestration ───────────────────────────────

type ResearchRequest struct {
	Query          string `json:"query"`
	Mode           string `json:"mode"` // "all", "research", "compare", "buying"
	ConversationID uint   `json:"conversation_id,omitempty"`
	Location       string `json:"location,omitempty"`
	Pincode        string `json:"pincode,omitempty"`
}

type ResearchResponse struct {
	ConversationID    uint                            `json:"conversation_id"`
	MessageID         uint                            `json:"message_id"`
	Query             string                          `json:"query"`
	Summary           string                          `json:"summary"`
	KeyTakeaways      []string                        `json:"key_takeaways"`
	DetailedEvidence  string                          `json:"detailed_evidence"`
	Sources           []models.Source                 `json:"sources"`
	Comparison        *models.ProductComparisonRecord `json:"comparison,omitempty"`
	FollowUpQuestions []string                        `json:"follow_up_questions"`
	Mode              string                          `json:"mode"`
}

// AIResearch handles multi-source conversational research with cited web findings and quick commerce comparison.
// POST /ai/research
func AIResearch(c echo.Context) error {
	var req ResearchRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	query := strings.TrimSpace(req.Query)
	if query == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Query cannot be empty"})
	}
	if len(query) > 500 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Query exceeds maximum length of 500 characters"})
	}

	mode := strings.ToLower(strings.TrimSpace(req.Mode))
	if mode == "" {
		mode = "all"
	}

	if !checkGuestAIRateLimit(c, "research", 30) {
		return c.JSON(http.StatusTooManyRequests, map[string]string{
			"error": "Research limit reached. Please sign in to continue researching.",
		})
	}

	pincode := strings.TrimSpace(req.Pincode)
	if pincode == "" {
		pincode = c.Request().Header.Get("X-Pincode")
	}
	location := strings.TrimSpace(req.Location)
	if location == "" {
		location = c.Request().Header.Get("X-City")
	}

	ctx := c.Request().Context()
	cacheKey := fmt.Sprintf("ai_research:%s:%s:%x", location, pincode, sha256.Sum256([]byte(query+":"+mode)))

	// 1. Check Redis cache
	if database.RedisClient != nil {
		if cached, err := database.RedisClient.Get(ctx, cacheKey).Result(); err == nil && cached != "" {
			var resp ResearchResponse
			if err := json.Unmarshal([]byte(cached), &resp); err == nil {
				// Persist conversation messages even on cache HIT if user is authenticated
				userID, isAuth := authenticatedUserID(c)
				if isAuth && database.GormDB != nil {
					persistConversationTurn(userID, req.ConversationID, query, mode, &resp)
				}
				c.Response().Header().Set("X-Cache", "HIT")
				return c.JSON(http.StatusOK, resp)
			}
		}
	}

	// 2. Synthesize Grounded AI Research with real web search and verified product listings
	resp := synthesizeGroundedResearch(ctx, query, mode, location, pincode)

	// 3. Persist to PostgreSQL if authenticated and GORM is configured
	userID, isAuth := authenticatedUserID(c)
	if isAuth && database.GormDB != nil {
		persistConversationTurn(userID, req.ConversationID, query, mode, &resp)
	}

	// 4. Cache in Redis for 10 minutes
	if database.RedisClient != nil {
		if data, err := json.Marshal(resp); err == nil {
			database.RedisClient.Set(ctx, cacheKey, data, 10*time.Minute)
		}
	}

	return c.JSON(http.StatusOK, resp)
}

func isCommercialQuery(query, mode string) bool {
	lower := strings.ToLower(query)
	if mode == "compare" || mode == "buying" || mode == "shopping" {
		return true
	}
	commercialKeywords := []string{
		"price", "buy", "cost", "cheap", "deal", "discount", "compare", "vs", "which is better",
		"milk", "phone", "laptop", "eggs", "rice", "oil", "atta", "butter", "bread", "iphone",
	}
	for _, kw := range commercialKeywords {
		if strings.Contains(lower, kw) {
			return true
		}
	}
	return false
}

func synthesizeGroundedResearch(ctx context.Context, query, mode, location, pincode string) ResearchResponse {
	isCommercial := isCommercialQuery(query, mode)

	// 1. Real web search retrieval (DuckDuckGo Lite / Serper)
	sources, err := search.SearchWeb(ctx, query, 4)
	if err != nil || sources == nil {
		sources = []models.Source{}
	}

	// 2. Verified product comparison retrieval
	var comparison *models.ProductComparisonRecord
	if isCommercial && ScraperSvc != nil {
		lat, lng := 12.9716, 77.5946 // Default Bengaluru
		if pincode == "110001" {
			lat, lng = 28.6139, 77.2090 // Delhi
		} else if pincode == "400001" {
			lat, lng = 18.9388, 72.8354 // Mumbai
		}

		userTokens := map[string]map[string]string{}
		compResult, compErr := ScraperSvc.Compare(ctx, query, lat, lng, userTokens)
		if compErr == nil && compResult != nil && len(compResult.Products) > 0 {
			firstProd := compResult.Products[0]
			if firstProd.BestPrice > 0 && len(firstProd.Listings) > 0 {
				type platformJSON struct {
					Name          string  `json:"name"`
					Price         float64 `json:"price"`
					OriginalPrice float64 `json:"originalPrice"`
					DeliveryTime  string  `json:"deliveryTime"`
					InStock       bool    `json:"inStock"`
					URL           string  `json:"url"`
				}
				platforms := make([]platformJSON, 0, len(firstProd.Listings))
				bestPlatform := ""
				for _, l := range firstProd.Listings {
					if l.Price > 0 {
						if bestPlatform == "" || l.Price == firstProd.BestPrice {
							bestPlatform = l.Platform
						}
						platforms = append(platforms, platformJSON{
							Name:          l.Platform,
							Price:         l.Price,
							OriginalPrice: l.MRP,
							DeliveryTime:  l.DeliveryTime,
							InStock:       l.InStock,
							URL:           l.ProductURL,
						})
					}
				}
				if len(platforms) > 0 {
					rawJSON, _ := json.Marshal(map[string]interface{}{
						"query":     query,
						"platforms": platforms,
					})
					comparison = &models.ProductComparisonRecord{
						Query:          query,
						BestPlatform:   bestPlatform,
						BestPrice:      firstProd.BestPrice,
						ComparisonJSON: string(rawJSON),
					}
				}
			}
		}
	}

	// 3. Grounded Synthesis via Groq LLM using real retrieved sources
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey != "" {
		llmResp, llmErr := synthesizeViaGroq(ctx, apiKey, query, mode, location, sources, comparison)
		if llmErr == nil && llmResp.Summary != "" {
			llmResp.Sources = sources
			llmResp.Comparison = comparison
			llmResp.Query = query
			llmResp.Mode = mode
			return llmResp
		}
	}

	// 4. Deterministic fallback grounded on retrieved sources without hallucinations
	return buildDeterministicGroundedResponse(query, mode, sources, comparison)
}

type groqSynthesisJSON struct {
	Summary           string   `json:"summary"`
	KeyTakeaways      []string `json:"key_takeaways"`
	DetailedEvidence  string   `json:"detailed_evidence"`
	FollowUpQuestions []string `json:"follow_up_questions"`
}

func synthesizeViaGroq(ctx context.Context, apiKey, query, mode, location string, sources []models.Source, comparison *models.ProductComparisonRecord) (ResearchResponse, error) {
	var sourcesText strings.Builder
	for _, s := range sources {
		sourcesText.WriteString(fmt.Sprintf("[%d] Title: %s\nDomain: %s\nSnippet: %s\nURL: %s\n\n", s.Number, s.Title, s.Domain, s.Snippet, s.URL))
	}

	comparisonNote := "No verified live price listings available in local database for this specific SKU."
	if comparison != nil {
		comparisonNote = fmt.Sprintf("Verified product comparison available: Best Price ₹%.2f on %s.", comparison.BestPrice, comparison.BestPlatform)
	}

	prompt := fmt.Sprintf(`You are CompareZ AI Research Engine, providing trusted, verified information for Indian shoppers.
Query: "%s"
Mode: %s
Location: %s

REAL RETRIEVED SOURCES:
%s

PRODUCT DATA:
%s

RULES:
1. Synthesize a concise, authoritative answer based STRICTLY on the retrieved sources.
2. Use inline numerical citations like [1], [2] referencing the source numbers above.
3. If no verified prices exist in the PRODUCT DATA, explicitly state that live pricing is unavailable for this item. Do NOT invent prices or merchant listings.
4. Output valid JSON only with keys:
   - "summary": string (markdown with [1] citations)
   - "key_takeaways": array of 2-3 concise strings
   - "detailed_evidence": string (concise markdown evidence section)
   - "follow_up_questions": array of 3 actionable follow-up questions`, query, mode, location, sourcesText.String(), comparisonNote)

	payload := map[string]interface{}{
		"model": "openai/gpt-oss-20b",
		"messages": []map[string]string{
			{"role": "system", "content": "You are CompareZ AI Research Engine. Output valid JSON only with verified citations and grounded facts."},
			{"role": "user", "content": prompt},
		},
		"response_format": map[string]string{"type": "json_object"},
		"temperature":     0.2,
		"max_tokens":      750,
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return ResearchResponse{}, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", groqChatURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return ResearchResponse{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := aiHTTPClient.Do(req)
	if err != nil {
		return ResearchResponse{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return ResearchResponse{}, fmt.Errorf("groq returned status %d", resp.StatusCode)
	}

	var chatResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil || len(chatResp.Choices) == 0 {
		return ResearchResponse{}, fmt.Errorf("failed to decode groq response: %v", err)
	}

	rawContent := chatResp.Choices[0].Message.Content
	var parsed groqSynthesisJSON
	if err := json.Unmarshal([]byte(rawContent), &parsed); err != nil {
		return ResearchResponse{}, fmt.Errorf("failed to parse synthesis JSON: %v", err)
	}

	return ResearchResponse{
		Summary:           parsed.Summary,
		KeyTakeaways:      parsed.KeyTakeaways,
		DetailedEvidence:  parsed.DetailedEvidence,
		FollowUpQuestions: parsed.FollowUpQuestions,
	}, nil
}

func buildDeterministicGroundedResponse(query, mode string, sources []models.Source, comparison *models.ProductComparisonRecord) ResearchResponse {
	var summary strings.Builder
	var evidence strings.Builder
	var takeaways []string

	if len(sources) > 0 {
		summary.WriteString(fmt.Sprintf("Research for '%s' synthesized from %d verified web sources.", query, len(sources)))
		for _, s := range sources {
			if s.Snippet != "" {
				evidence.WriteString(fmt.Sprintf("- [%d] %s: %s\n", s.Number, s.Domain, s.Snippet))
			}
		}
		takeaways = append(takeaways, fmt.Sprintf("Retrieved live intelligence from %s [1].", sources[0].Domain))
		if len(sources) > 1 {
			takeaways = append(takeaways, fmt.Sprintf("Cross-referenced with findings from %s [2].", sources[1].Domain))
		}
	} else {
		summary.WriteString(fmt.Sprintf("Direct research synthesis for '%s'. Live web search returned no immediate external matches.", query))
		takeaways = append(takeaways, "No external verified sources returned for this specific search.")
	}

	if comparison != nil {
		takeaways = append(takeaways, fmt.Sprintf("Verified catalog price: ₹%.2f on %s.", comparison.BestPrice, comparison.BestPlatform))
	} else if isCommercialQuery(query, mode) {
		takeaways = append(takeaways, "Real-time pricing is unavailable for this item. Search directly or connect accounts to check live prices.")
	}

	followUps := []string{
		"Search live pricing on Compare tab",
		"Show me alternative products",
		"Compare delivery timeframes in my area",
	}

	return ResearchResponse{
		Query:             query,
		Summary:           summary.String(),
		KeyTakeaways:      takeaways,
		DetailedEvidence:  evidence.String(),
		Sources:           sources,
		Comparison:        comparison,
		FollowUpQuestions: followUps,
		Mode:              mode,
	}
}

func persistConversationTurn(userID string, conversationID uint, query, mode string, resp *ResearchResponse) {
	if database.GormDB == nil || userID == "" {
		return
	}

	var conv models.Conversation
	if conversationID > 0 {
		if err := database.GormDB.Where("id = ? AND user_id = ?", conversationID, userID).First(&conv).Error; err != nil {
			conv = models.Conversation{
				UserID: userID,
				Title:  truncateString(query, 50),
				Mode:   mode,
			}
			database.GormDB.Create(&conv)
		}
	} else {
		conv = models.Conversation{
			UserID: userID,
			Title:  truncateString(query, 50),
			Mode:   mode,
		}
		database.GormDB.Create(&conv)
	}

	resp.ConversationID = conv.ID

	userMsg := models.Message{
		ConversationID: conv.ID,
		Role:           "user",
		Content:        query,
	}
	database.GormDB.Create(&userMsg)

	asstMsg := models.Message{
		ConversationID: conv.ID,
		Role:           "assistant",
		Content:        resp.Summary + "\n\n" + resp.DetailedEvidence,
	}
	database.GormDB.Create(&asstMsg)
	resp.MessageID = asstMsg.ID

	for i := range resp.Sources {
		resp.Sources[i].MessageID = asstMsg.ID
		database.GormDB.Create(&resp.Sources[i])
	}

	if resp.Comparison != nil {
		resp.Comparison.MessageID = asstMsg.ID
		database.GormDB.Create(resp.Comparison)
	}
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// ListConversations returns a user's multi-turn research conversations.
// GET /ai/conversations
func ListConversations(c echo.Context) error {
	userID, ok := authenticatedUserID(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Authentication required"})
	}

	if database.GormDB == nil {
		return c.JSON(http.StatusOK, []models.Conversation{})
	}

	var conversations []models.Conversation
	if err := database.GormDB.Where("user_id = ?", userID).Order("updated_at DESC").Limit(50).Find(&conversations).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to load conversations"})
	}

	return c.JSON(http.StatusOK, conversations)
}

// GetConversation returns a full conversation session with messages and citations.
// GET /ai/conversations/:id
func GetConversation(c echo.Context) error {
	userID, ok := authenticatedUserID(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Authentication required"})
	}

	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid conversation ID"})
	}

	if database.GormDB == nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Conversation not found"})
	}

	var conv models.Conversation
	if err := database.GormDB.Preload("Messages.Sources").Preload("Messages.Comparison").Where("id = ? AND user_id = ?", id, userID).First(&conv).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Conversation not found"})
	}

	return c.JSON(http.StatusOK, conv)
}

// DeleteConversation removes a conversation session.
// DELETE /ai/conversations/:id
func DeleteConversation(c echo.Context) error {
	userID, ok := authenticatedUserID(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Authentication required"})
	}

	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid conversation ID"})
	}

	if database.GormDB == nil {
		return c.JSON(http.StatusOK, map[string]string{"status": "deleted"})
	}

	if err := database.GormDB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Conversation{}).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete conversation"})
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "deleted"})
}
