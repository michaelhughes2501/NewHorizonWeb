# New Horizon — Complete Platform

## iOS App · Android App · Database · Notifications · Admin Dashboard

---

## 📁 Files in This Package

| File                      | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `mobile-app.jsx`          | React Native app for iOS & Android                 |
| `database-schema.sql`     | Full PostgreSQL schema (run in Supabase)           |
| `database-service.js`     | API service layer — auth, profiles, messages, jobs |
| `notification-system.jsx` | Notification center + push + email templates       |
| `admin-dashboard.jsx`     | Full admin panel with all management tools         |

---

## 🚀 QUICK START

### 1. Database Setup (Supabase)

```bash
# 1. Go to supabase.com → New Project
# 2. Open SQL Editor → paste database-schema.sql → Run
# 3. Copy your Project URL and anon key
```

### 2. Web App Setup

```bash
git clone https://github.com/yourorg/new-horizon
cd new-horizon
npm install

# Create .env.local
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR_ANON_KEY

npm start
```

### 3. Mobile App (iOS & Android)

```bash
npx create-expo-app NewHorizon --template blank-typescript
cd NewHorizon

# Install dependencies
npx expo install expo-notifications expo-device expo-constants
npx expo install @react-navigation/native @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context
npx expo install @supabase/supabase-js react-native-url-polyfill
npx expo install expo-secure-store react-native-gesture-handler

# Copy mobile-app.jsx → App.tsx
# Update SUPABASE_URL and SUPABASE_ANON_KEY in App.tsx

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android

# Build for App Store / Google Play
npx eas build --platform ios
npx eas build --platform android
```

### 4. Push Notifications

```bash
# Install EAS CLI
npm install -g eas-cli
eas login
eas build:configure

# The mobile app auto-registers push tokens on login
# Tokens are stored in the profiles.push_token column
# Edge Function handles delivery (see EDGE_FUNCTION_PUSH in database-service.js)

# Deploy Edge Function
supabase functions deploy send-push
```

### 5. Email Notifications (Resend)

```bash
# Sign up at resend.com (free: 3,000 emails/month)
# Add your API key to Supabase secrets:
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx

# Email triggers fire automatically via Supabase database webhooks
```

---

## 🏗️ ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│                    NEW HORIZON PLATFORM                  │
├──────────────┬──────────────┬───────────────────────────┤
│  Web App     │  Mobile App  │      Admin Panel           │
│  (React)     │ (React Native│      (React)               │
│              │  Expo)       │                             │
└──────┬───────┴──────┬───────┴────────────┬──────────────┘
       │              │                    │
       └──────────────┼────────────────────┘
                      │
             ┌────────▼────────┐
             │    Supabase     │
             │  ┌───────────┐  │
             │  │ PostgreSQL│  │
             │  │ (Database)│  │
             │  └─────┬─────┘  │
             │  ┌─────▼─────┐  │
             │  │Real-time  │  │
             │  │WebSocket  │  │
             │  └─────┬─────┘  │
             │  ┌─────▼─────┐  │
             │  │   Auth    │  │
             │  │  (JWT)    │  │
             │  └─────┬─────┘  │
             │  ┌─────▼─────┐  │
             │  │  Storage  │  │
             │  │(Avatars)  │  │
             │  └───────────┘  │
             └────────┬────────┘
                      │
       ┌──────────────┼──────────────┐
       │              │              │
  ┌────▼────┐   ┌─────▼────┐  ┌─────▼────┐
  │  Expo   │   │  Resend  │  │   Edge   │
  │  Push   │   │  Email   │  │Functions │
  └─────────┘   └──────────┘  └──────────┘
```

---

## 🗄️ DATABASE TABLES

| Table              | Purpose                                     |
| ------------------ | ------------------------------------------- |
| `profiles`         | User accounts, settings, push tokens        |
| `connections`      | Likes and matches between users             |
| `messages`         | Direct messages with conversation threading |
| `jobs`             | Job listings with approval workflow         |
| `job_applications` | User applications to jobs                   |
| `resources`        | Parole, mental health, housing links        |
| `blog_posts`       | Community stories and guides                |
| `blog_likes`       | Post likes (unique per user)                |
| `notifications`    | In-app notifications with type/read status  |
| `saved_jobs`       | User bookmarked jobs                        |
| `reports`          | Content/user reports queue                  |
| `audit_log`        | Admin action history                        |

---

## 🔔 NOTIFICATION TYPES

| Type       | Trigger                      | Channel               |
| ---------- | ---------------------------- | --------------------- |
| `match`    | Mutual like detected         | Push + In-app         |
| `message`  | New DM received              | Push + In-app         |
| `job`      | New matching job posted      | Push + Email + In-app |
| `resource` | New resource in user's state | Email + In-app        |
| `system`   | Account alerts, tips         | In-app                |
| `admin`    | Admin actions                | In-app                |

---

## 🛡️ ADMIN DASHBOARD FEATURES

- **Overview** — Live stats, pending approvals, activity feed
- **User Management** — Search, filter, verify, ban, view profiles
- **Content Moderation** — Approve/reject blog posts before publishing
- **Job Approvals** — Review and approve employer-submitted job listings
- **Reports Queue** — Handle user reports with status workflow
- **Analytics** — Growth charts, state breakdown, impact metrics
- **System Settings** — Feature toggles, maintenance mode, DB info

---

## 🔒 SECURITY

- Row Level Security (RLS) on all database tables
- JWT authentication via Supabase Auth
- Passwords hashed with bcrypt
- Push tokens encrypted at rest
- Criminal history never exposed via API
- Admin routes require `is_admin` role check
- All API calls require valid session

---

## 📱 APP STORE DEPLOYMENT

### iOS (App Store)

1. Apple Developer account ($99/year)
2. `eas build --platform ios --profile production`
3. `eas submit --platform ios`

### Android (Google Play)

1. Google Play Console account ($25 one-time)
2. `eas build --platform android --profile production`
3. `eas submit --platform android`

---

## 💰 ESTIMATED MONTHLY COSTS

| Service                | Free Tier             | Paid                |
| ---------------------- | --------------------- | ------------------- |
| Supabase               | 500MB DB, 2GB storage | $25/mo (Pro)        |
| Vercel (web hosting)   | 100GB bandwidth       | $20/mo (Pro)        |
| Expo EAS (builds)      | 30 builds/month       | $29/mo (Production) |
| Resend (email)         | 3,000 emails/month    | $20/mo (50k emails) |
| Expo Push              | Free                  | Free                |
| **Total (free tier)**  | **$0/month**          |                     |
| **Total (production)** |                       | **~$94/month**      |

---

_New Horizon — Built with dignity. Powered by community._
