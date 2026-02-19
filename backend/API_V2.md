# Backend API Documentation - V2

## Overview

The backend has been restructured to support the **frontend-first scraping architecture**. The backend now serves as:

- ✅ Token storage & validation
- ✅ Search result collection for analytics
- ✅ Price history tracking
- ✅ Optional fallback scraping

## Architecture Changes

### Before (V1)

```
Mobile App → Backend API → Scraper → Platform APIs ❌ (Cloudflare blocked)
```

### After (V2)

```
Mobile App WebViews → Platform APIs → Backend (collect results) → Database
```

---

## API Endpoints

### 1. Account Management

#### **POST /accounts/connect**

Connect a single platform with authentication tokens.

**Request:**

```json
{
  "platform": "Blinkit",
  "tokens": {
    "auth": "{\"accessToken\":\"v2::xxx\"}",
    "authKey": "xxx",
    "cookie": "gr_1_accessToken=xxx; gr_1_deviceId=xxx",
    "location": "{\"coords\":{\"lat\":12.9290396,\"lon\":77.6754847}}",
    "user": "{...}"
  }
}
```

**Response:**

```json
{
  "status": "connected",
  "platform": "Blinkit",
  "tokens": 5
}
```

**Status Codes:**

- `200` - Success
- `400` - Invalid request format
- `500` - Server error

---

#### **POST /accounts/bulk-connect**

Connect multiple platforms at once.

**Request:**

```json
{
  "Blinkit": {
    "auth": "...",
    "cookie": "..."
  },
  "Zepto": {
    "user": "...",
    "cookie": "..."
  }
}
```

**Response:**

```json
{
  "status": "connected",
  "platforms": ["Blinkit", "Zepto"],
  "count": 2
}
```

---

#### **DELETE /accounts/disconnect/:platform**

Disconnect a specific platform.

**Example:** `DELETE /accounts/disconnect/Blinkit`

**Response:**

```json
{
  "status": "disconnected",
  "platform": "Blinkit"
}
```

---

#### **GET /accounts/status**

Get connection status for all platforms.

**Response:**

```json
{
  "connected": ["Blinkit", "Zepto", "BigBasket"],
  "count": 3,
  "updatedAt": "2026-02-15T01:30:00Z",
  "lastUsed": "2026-02-15T01:35:00Z"
}
```

---

### 2. Search & Analytics

#### **POST /search/collect**

Collect search results from frontend for analytics.

**Request:**

```json
{
  "query": "eggs",
  "platforms": {
    "Blinkit": [
      {
        "product_name": "Farm Fresh Eggs (6 pcs)",
        "brand": "Farm Fresh",
        "price": 45.0,
        "mrp": 50.0,
        "image_url": "https://...",
        "product_url": "https://...",
        "in_stock": true,
        "weight": "6 pcs",
        "platform": "Blinkit"
      }
    ],
    "Zepto": [
      {...}
    ]
  }
}
```

**Response:**

```json
{
  "status": "collected",
  "query": "eggs",
  "platforms": 2,
  "total_results": 25
}
```

**Use Cases:**

- Price history tracking
- Search analytics
- ML training data
- Popular product trends

---

#### **GET /search/history?limit=10**

Get recent search history for the user.

**Response:**

```json
{
  "searches": [
    {
      "query": "eggs",
      "timestamp": "2026-02-15T01:30:00Z",
      "platforms": 3,
      "results": 12
    }
  ],
  "count": 1
}
```

_Note: Currently returns empty array - implement database queries to enable._

---

#### **GET /search/validate**

Validate if stored tokens are still functional.

**Response:**

```json
{
  "valid": ["Blinkit", "Zepto"],
  "invalid": ["BigBasket"],
  "message": "Token validation completed",
  "timestamp": "2026-02-15T01:30:00Z"
}
```

**Validation Logic:**

- **Blinkit:** Checks for `auth` or `cookie`
- **Zepto:** Checks for `user` or `cookie`
- **BigBasket:** Checks for `cookie`
- **Instamart:** Checks for `cookie`

---

### 3. Legacy Endpoints (V1)

These endpoints are kept for backward compatibility but should not be used by new clients.

#### **GET /compare?q=eggs&lat=12.97&lng=77.59**

_(Deprecated)_ Backend scraping endpoint - likely to fail due to Cloudflare.

#### **POST /tokens**

_(Deprecated)_ Redirects to `/accounts/bulk-connect`

---

## Data Flow

### 1. User Connects Account

```mermaid
sequenceDiagram
    User->>WebView: Logs into Blinkit
    WebView->>JavaScript: Capture localStorage/cookies
    JavaScript->>ReactNative: Send tokens
    ReactNative->>AsyncStorage: Save locally
    ReactNative->>Backend: POST /accounts/connect
    Backend->>Memory: Store tokens by deviceKey
```

### 2. User Searches Product

```mermaid
sequenceDiagram
    User->>SearchScreen: Types "eggs"
    SearchScreen->>WebView(Blinkit): Inject fetch script
    WebView(Blinkit)->>Blinkit API: Authenticated request
    Blinkit API->>WebView(Blinkit): JSON response
    WebView(Blinkit)->>SearchScreen: Products data
    SearchScreen->>Backend: POST /search/collect
    SearchScreen->>User: Display results
```

---

## Token Storage

### Device Identification

Tokens are stored per-device using a unique key:

```go
func deviceKey(c echo.Context) string {
    // Priority 1: X-Device-Id header (recommended)
    if id := c.Request().Header.Get("X-Device-Id"); id != "" {
        return id
    }
    // Priority 2: IP + User-Agent (fallback)
    return c.RealIP() + "|" + c.Request().UserAgent()
}
```

**Recommendation:** Send `X-Device-Id` header from mobile app for reliable device tracking.

### Data Structure

```go
type DeviceTokens struct {
    Platforms  map[string]map[string]string // platform -> key-value tokens
    UpdatedAt  time.Time                    // Last token update
    LastUsedAt time.Time                    // Last token usage
}
```

**Example:**

```json
{
  "192.168.1.8|okhttp/4.12.0": {
    "Platforms": {
      "Blinkit": {
        "auth": "{\"accessToken\":\"v2::xxx\"}",
        "cookie": "gr_1_accessToken=xxx"
      }
    },
    "UpdatedAt": "2026-02-15T01:30:00Z",
    "LastUsedAt": "2026-02-15T01:35:00Z"
  }
}
```

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Error description"
}
```

**Common Status Codes:**

- `200` - Success
- `400` - Bad request (invalid format, missing fields)
- `401` - Unauthorized (not implemented yet)
- `404` - Not found
- `500` - Internal server error

---

## Security Considerations

### Current Implementation

- ✅ Tokens stored in memory (not persisted to disk)
- ✅ CORS enabled for mobile app access
- ✅ Device-based isolation
- ⚠️ No authentication on endpoints (MVP)

### Production Recommendations

1. **Add user authentication** - JWT tokens for API access
2. **Encrypt sensitive data** - Encrypt tokens at rest
3. **Rate limiting** - Prevent abuse
4. **Token expiry** - Auto-delete old tokens (TTL)
5. **HTTPS only** - Enforce TLS
6. **Database persistence** - Store tokens in PostgreSQL instead of memory

---

## Database Schema (Future)

```sql
CREATE TABLE user_tokens (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    tokens JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(device_id, platform)
);

CREATE TABLE search_history (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    query VARCHAR(255) NOT NULL,
    platforms JSONB NOT NULL,
    results JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE price_history (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    mrp DECIMAL(10,2),
    in_stock BOOLEAN DEFAULT true,
    recorded_at TIMESTAMP DEFAULT NOW()
);
```

---

## Environment Variables

```bash
# Server
PORT=8080

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/comparex

# Redis (for caching)
REDIS_ADDR=localhost:6379

# Meilisearch (optional)
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_KEY=masterKey

# CORS
ALLOWED_ORIGINS=http://localhost:8081,exp://192.168.1.8:8081
```

---

## Testing the API

### Using cURL

```bash
# 1. Connect Blinkit account
curl -X POST http://localhost:8080/accounts/connect \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "Blinkit",
    "tokens": {
      "auth": "{\"accessToken\":\"test123\"}",
      "cookie": "sessionid=abc123"
    }
  }'

# 2. Check status
curl http://localhost:8080/accounts/status

# 3. Collect search results
curl -X POST http://localhost:8080/search/collect \
  -H "Content-Type: application/json" \
  -d '{
    "query": "eggs",
    "platforms": {
      "Blinkit": [
        {
          "product_name": "Farm Fresh Eggs",
          "price": 45,
          "platform": "Blinkit"
        }
      ]
    }
  }'

# 4. Validate tokens
curl http://localhost:8080/accounts/validate

# 5. Disconnect platform
curl -X DELETE http://localhost:8080/accounts/disconnect/Blinkit
```

### Using the Mobile App

The mobile app automatically calls these endpoints:

1. **After login:** POST `/accounts/connect`
2. **After search:** POST `/search/collect`
3. **On app start:** GET `/accounts/status`

---

## Monitoring & Logs

### Log Format

```
2026/02/15 01:30:00 📊 Collected search results:
   Query: eggs
   Platforms: 2
   Total Products: 15
   - Blinkit: 8 products
   - Zepto: 7 products
```

### Metrics to Track

- Searches per day
- Most searched products
- Platform performance (success rate, avg products)
- Token refresh frequency
- API response times

---

## Future Enhancements

1. **Real-time price alerts** - Notify when price drops
2. **Price prediction** - ML model for price trends
3. **Product recommendations** - Based on search history
4. **Wishlists** - Save favorite products
5. **Share deals** - Share best prices with friends
6. **Web dashboard** - Analytics portal
7. **Admin panel** - Manage platforms, users

---

## Migration from V1 to V2

If you have existing V1 code:

**Old:**

```javascript
await api.post("/tokens", allTokens);
```

**New:**

```javascript
await api.post("/accounts/bulk-connect", allTokens);
// OR
await api.post("/accounts/connect", {
  platform: "Blinkit",
  tokens: blinkitTokens,
});
```

---

## Support

For issues or questions:

- Check logs: `go run main.go` (backend console)
- Check frontend logs: React Native metro console
- Verify token capture: Check `[WebView]` logs
- Test endpoints: Use cURL or Postman

---

**Last Updated:** February 15, 2026  
**API Version:** 2.0.0  
**Documentation Version:** 1.0
