# CompareZ Setup Guide

## Why Search Returns No Results

The backend is successfully making requests to all platforms, but they're returning error codes:

- **403 Forbidden**: Platform detects bot/unauthorized access (Blinkit)
- **404 Not Found**: Endpoint requires authentication or doesn't exist (Zepto, Instamart, Zomato)
- **400 Bad Request**: Missing required parameters or authentication (BigBasket)

### Why This Happens

Modern e-commerce platforms have sophisticated anti-bot protection:

1. **Rate Limiting**: Block repeated requests from same IP
2. **Fingerprinting**: Detect non-browser clients
3. **Session Requirements**: Require valid login cookies
4. **Dynamic Endpoints**: API URLs change or require special tokens

## Solution: Link Your Accounts

The app has an **Accounts Screen** designed to capture authentication tokens by logging you in via WebView.

### Steps to Get Search Working:

#### 1. Launch the Mobile App

```bash
cd frontend
npx expo start
```

#### 2. Navigate to Accounts Tab

Open the app and go to the **Accounts** tab (bottom navigation)

#### 3. Link Each Platform

For each platform (Blinkit, Zepto, BigBasket, Instamart):

1. **Tap "Connect"** button
2. **Login normally** in the WebView (use your phone number/OTP)
3. **Wait for "Connected"** status
4. The app automatically captures:
   - Cookies
   - Authentication tokens
   - Session IDs
   - Location data

#### 4. Search Again

Once platforms are connected:

- Go to **Search** tab
- Search for any product (e.g., "Eggs", "Milk", "Bread")
- Backend will use your authentication tokens
- Results should appear with live prices

## Technical Details

### How Token Capture Works

The `AccountsScreen.js` includes injected JavaScript that:

```javascript
// Scans localStorage and cookies
const ls = { ...localStorage };
const cookies = document.cookie;

// Platform-specific extraction
if (host.includes("blinkit")) {
  payload["auth"] = ls.auth;
  payload["auth_key"] = ls.authKey;
  payload["cookie"] = cookies;
}
```

### Backend Token Usage

Scrapers use captured tokens:

```go
// Blinkit example
if cookie, ok := userTokens["cookie"]; ok {
  req.Header.Set("Cookie", cookie)
}
if authKey, ok := userTokens["auth_key"]; ok {
  req.Header.Set("auth_key", authKey)
}
```

## Testing Without App Login

If you want to test without mobile app, manually add tokens to `platform_config.json`:

### 1. Get Tokens from Browser

**For Blinkit:**

1. Open https://blinkit.com in Chrome
2. Login with your account
3. Open DevTools (F12) → Application → Local Storage
4. Copy `auth`, `authKey` values
5. Go to Cookies → Copy all cookies as string

**For Zepto:**

1. Open https://zeptonow.com
2. Login
3. Copy `user`, `header-store` from localStorage
4. Copy cookies

### 2. Update Config

Edit `backend/platform_config.json`:

```json
{
  "blinkit": {
    "headers": {
      "cookie": "YOUR_COOKIE_STRING_HERE",
      "auth_key": "YOUR_AUTH_KEY_HERE"
    }
  }
}
```

### 3. Restart Backend

```bash
cd backend
go run main.go
```

## Alternative: Use Mock Data

For development without real APIs, you can:

1. Create `backend/scraper/mock.go`:

```go
func (b *BlinkitScraper) Search(...) {
  // Return hardcoded data
  return []models.PlatformListing{
    {
      Platform: "Blinkit",
      ProductName: "White Eggs (10pcs)",
      Price: 79.0,
      MRP: 95.0,
      InStock: true,
    },
  }, nil
}
```

2. Or modify scrapers to return test data on error

## Current Status

✅ **Backend**: Running, making requests with proper headers
✅ **Frontend**: UI working, displays results correctly
✅ **Token Capture**: WebView injection working
❌ **API Access**: Blocked without authentication
❌ **Results**: Empty until accounts linked

## Next Steps

1. **Link at least one platform** (Blinkit recommended - easiest login)
2. **Search for common items** (Eggs, Milk, Bread)
3. **Monitor backend logs** for success messages:
   ```
   ✅ Blinkit API found 15 items
   ```

## Troubleshooting

### "Connected" but no results?

- Tokens might have expired (re-login)
- Check backend logs for specific errors
- Try different search terms

### WebView login fails?

- Use mobile data instead of WiFi
- Some platforms block WebView logins
- Try desktop browser method instead

### All platforms return 403/404?

- This is expected without authentication
- Must link accounts first
- Or add tokens to config manually

## Platform-Specific Notes

### Blinkit

- **Easiest to capture** - stores auth in localStorage
- OTP login via phone number
- Tokens: `auth`, `authKey`, cookies

### Zepto

- Stores user data in localStorage
- Needs `header-store` for location
- May require intentId from localStorage

### BigBasket

- Cookie-based authentication
- Requires `sessionid` and `_bb_vid`
- May need CSRF token

### Instamart (Swiggy)

- Uses Swiggy cookies
- Requires `_session_tid`
- Location-dependent results

## Support

If you continue facing issues:

1. Check backend logs for detailed error messages
2. Verify tokens are captured (check AsyncStorage in app)
3. Try re-linking accounts
4. Consider using mock data for development
