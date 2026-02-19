# Getting Live Price Data - Step by Step

## Why You're Seeing No Results

The platforms (Blinkit, Zepto, BigBasket, Instamart) require **authentication** to access their APIs:

- **403 Forbidden** = They detect unauthorized access
- **404 Not Found** = Endpoint requires valid session
- **400 Bad Request** = Missing authentication tokens

## Solution: Link Your Accounts (5 minutes)

### Step 1: Start Both Servers

**Terminal 1 - Backend:**

```bash
cd backend
go run main.go
```

You should see: `⇨ http server started on [::]:8080`

**Terminal 2 - Frontend:**

```bash
cd frontend
npx expo start
```

### Step 2: Open Mobile App

Scan the QR code with:

- **Android**: Expo Go app
- **iOS**: Camera app (opens Expo Go)

### Step 3: Link At Least ONE Platform

1. **Tap the "Accounts" tab** (bottom navigation, person icon)
2. **Tap "Connect" on Blinkit** (recommended - easiest)
3. **Login normally:**
   - Enter your phone number
   - Enter OTP you receive
   - Wait for login to complete
4. **Status changes to "Connected"** automatically
5. **Close the modal** (X button)

### Step 4: Search for Products

1. **Go to "Search" tab** (magnifying glass icon)
2. **Type any product**: "Eggs", "Milk", "Bread", "Atta"
3. **Results will now appear with LIVE prices**

### Step 5: Check Backend Logs

You should see:

```
🔑 Using tokens for platforms: [Blinkit]
✅ Blinkit API found 15 items
```

Instead of:

```
⚠️ Blinkit error (0.4s): blinkit api status: 403
```

## Recommended: Link All 4 Platforms

For best results, link all platforms:

1. **Blinkit** - OTP login
2. **Zepto** - OTP login
3. **BigBasket** - Email/Phone + Password
4. **Instamart** - Uses Swiggy login (OTP)

## What If Login Doesn't Work?

### Option 1: Get Tokens from Desktop Browser

**For Blinkit:**

1. Open https://blinkit.com in Chrome
2. Login with your account
3. Press **F12** → **Application** tab
4. **Local Storage** → `https://blinkit.com`
5. Copy values:
   - `auth`
   - `authKey`
6. **Cookies** tab → Copy all cookies
7. Create `backend/user_tokens.json`:

```json
{
  "Blinkit": {
    "auth": "PASTE_AUTH_VALUE_HERE",
    "auth_key": "PASTE_AUTHKEY_VALUE_HERE",
    "cookie": "PASTE_ALL_COOKIES_HERE"
  }
}
```

### Option 2: Try Instamart First

If Blinkit login fails:

1. Link **Instamart** instead (uses Swiggy)
2. Swiggy usually works better in WebView
3. Same process - tap Connect, login, done

## Testing Your Setup

After linking at least one account:

**Search for "Eggs":**

- Should show products from linked platform(s)
- Each product shows: Name, Price, Platform, Delivery time
- Can tap to see full comparison

**Backend Log Success:**

```
2026/02/15 01:00:00 🔑 Using tokens for platforms: [Blinkit, Instamart]
2026/02/15 01:00:00 🔍 Scraping all platforms for 'Eggs'...
2026/02/15 01:00:01 ✅ Blinkit API found 12 items
2026/02/15 01:00:01 ✅ Instamart API found 8 items
2026/02/15 01:00:01 ⚠️ Zepto error (0.2s): zepto api status: 404
2026/02/15 01:00:01 ⚠️ BigBasket error (0.2s): bigbasket api status: 400
```

This is GOOD - 2 platforms working, 2 need to be linked still.

## Common Issues

### "Connected" but still 403 errors?

- Tokens might be expired
- Re-login to refresh them
- Check if cookies were captured

### WebView shows blank screen?

- Use mobile data instead of WiFi
- Some platforms block certain networks
- Try desktop browser method

### Still no results after linking?

- Close and restart the app
- Clear AsyncStorage: Settings → Clear Data
- Re-link accounts

### Can I skip this and test without linking?

**No** - These are protected APIs. You have 3 options:

1. Link accounts (recommended - 2 minutes per platform)
2. Extract tokens from browser manually
3. Wait for platforms to fail and accept no results

## Why This Is Required

Modern e-commerce platforms protect their APIs:

- Prevent price scraping bots
- Ensure only real users access data
- Comply with terms of service
- Prevent abuse and DDoS

Your app works around this by:

1. You login normally (legitimate)
2. App captures your session tokens
3. Backend reuses YOUR session for API calls
4. Platforms see authorized requests from YOU

This is similar to how browser extensions work.

## Expected Results After Setup

Once linked, you'll see:

- **Live prices** updated in real-time
- **Delivery times** for your location
- **Stock status** (in stock / out of stock)
- **Product images** and details
- **Best price** highlighted
- **Price comparison** across platforms

Without linking:

- Empty results
- "Not Available" for all platforms
- Mock data (if enabled)

## Next Steps

1. **Link accounts now** (takes 5 minutes)
2. **Search for products** you actually buy
3. **Compare prices** and save money
4. **Re-link if tokens expire** (every few weeks)

The app is working correctly - it just needs your authentication to access the live APIs!
