# 24/7 Active Database Setup Guide

Follow these steps to connect your CompareX app to a persistent, 24/7 active database instead of the local ephemeral Docker database.

## 1. Provision a Cloud Database (Recommended: Supabase)

Supabase provides a free, always-on PostgreSQL database that is perfect for this project.

1.  Sign up at [supabase.com](https://supabase.com).
2.  Create a new project named `CompareX`.
3.  Go to **Project Settings** -> **Database**.
4.  Find the **Connection String** section and copy the **URI**.
    *   It should look like: `postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
    *   Ensure you choice the "Transaction" mode (port 6543) for better performance with connection pooling.

## 2. Update Backend Configuration

You must set the `DATABASE_URL` environment variable for your backend.

### If using Render:
1.  Log in to your Render dashboard.
2.  Select your `CompareX` backend service.
3.  Go to **Environment**.
4.  Add a new environment variable:
    *   **Key:** `DATABASE_URL`
    *   **Value:** `[Your Supabase Connection URI]`
5.  Save and the service will auto-deploy. The backend is already configured to auto-migrate the tables.

### If testing locally:
Update your `docker/docker-compose.yml` or create a `.env` file in the `backend` folder with:
```bash
DATABASE_URL=postgresql://postgres.[REF]:[PASS]@[HOST]:6543/postgres
```

## 3. Verify Connection

1.  Watch the backend logs. You should see: `🚀 Connected to Database`
2.  Check your Supabase dashboard (**Table Editor**). You should see the following tables created automatically:
    *   `users`
    *   `search_histories`
    *   `wishlist_items`

## 4. Test User Persistence

1.  Open the app and **Register** a new account.
2.  Log out and log back in.
3.  Perform a search.
4.  Check the `search_histories` table in Supabase; you should see your search query recorded!

---
**Why this is better?**
*   **Always On:** Your data is available even if the backend restarts.
*   **Scalable:** 500MB is enough for thousands of users.
*   **Insight:** You can see what users are searching for in real-time via the Supabase dashboard.
