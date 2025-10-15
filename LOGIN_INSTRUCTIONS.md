# 🔐 Login Instructions for Claims iQ Sidekick

## How to Create Your First Account

Since you're seeing the login screen with empty fields, you need to **create your first account**:

### Option 1: Create Admin Account (Recommended)

1. **Enter your email** in the Email field (e.g., `john.shoust@pm.me`)
2. **Enter a password** in the Password field (e.g., `admin123` or any password you want)
3. **Tap "Create/Ensure Admin"** button (the gold/yellow button)
4. Wait for the "Admin Ready" alert
5. **Tap "Sign In"** to log in

This will:
- Create a new Supabase Auth user
- Create a profile in the `profiles` table
- Set you as an admin user

### Option 2: Regular Sign Up

1. Enter any email and password
2. The app uses Supabase authentication
3. You can sign up through Supabase's auth system

---

## Where Credentials Come From

The app looks for credentials in this order:

1. **First time:** Environment variables `EXPO_PUBLIC_DEV_EMAIL` and `EXPO_PUBLIC_DEV_PASSWORD`
   - These are currently **not set** in your build
   - That's why the fields are empty

2. **After first login:** SecureStore (device keychain)
   - If you check "Remember dev creds", it saves them locally
   - Next time you open the app, fields will auto-fill

3. **Manual entry:** Just type them in!

---

## 💡 Quick Start

**Right now, on your phone:**

1. Type in: `john.shoust@pm.me` (or any email you want)
2. Type in: `admin123` (or any password)
3. Tap the **"Create/Ensure Admin"** button
4. You'll see "Admin Ready" alert
5. Tap **"Sign In"**
6. You're in! 🎉

---

## 🔧 Optional: Add Default Credentials to Builds

If you want the login fields to auto-fill in future builds, add these to your `eas.json`:

```json
"env": {
  "EXPO_PUBLIC_SUPABASE_URL": "https://lyppkkpawalcchbgbkxg.supabase.co",
  "EXPO_PUBLIC_SUPABASE_API_KEY": "...",
  "EXPO_PUBLIC_DEV_EMAIL": "john.shoust@pm.me",
  "EXPO_PUBLIC_DEV_PASSWORD": "admin123"
}
```

But this is **optional** - you can just create the account manually as described above!

---

## ✅ After Login

Once you're logged in, you'll be able to:
- Take photos for claims
- Create and manage claims
- Upload media files
- Use all app features

The app uses **Supabase Authentication**, so your credentials are securely stored and encrypted.

