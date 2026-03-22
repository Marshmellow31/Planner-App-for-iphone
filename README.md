# StudyFlow — Student Planner PWA

A production-ready student planner PWA with Firebase backend and Vercel frontend hosting.

## Features
- 🔐 Firebase Authentication (email/password)
- 📚 Subjects → Topics → Tasks hierarchy
- ✅ Task completion with priorities, due dates, and reminders
- 📊 Weekly analytics with Chart.js (line, bar, doughnut charts)
- 🔔 Push notifications via Firebase Cloud Messaging (FCM)
- 📱 PWA — installable on iPhone Home Screen (iOS 16.4+ for push)
- 🌙 Dark / light theme
- 🔒 Firestore security rules (users see only their own data)
- ⚡ Serverless reminder scheduler (Firebase Cloud Functions)

---

## Quick Start

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → **Add project**
2. Enable **Authentication** → Sign-in method → **Email/Password**
3. Create **Firestore Database** → Start in production mode
4. Go to **Project Settings** → Your apps → **Add web app**
5. Copy the config object

### 2. Configure Firebase Keys

Open `public/firebase-config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc",
};
```

Also replace `VAPID_KEY` with your Web Push certificate key:
- Firebase Console → Project Settings → Cloud Messaging → **Web Push certificates** → Generate key pair → copy the public key

### 3. Deploy Firestore Rules

```bash
npm install -g firebase-tools
firebase login
firebase init   # select Firestore, Functions — link to your project
firebase deploy --only firestore:rules
```

### 4. Deploy Cloud Functions

> ⚠️ Requires **Blaze (pay-as-you-go)** plan on Firebase. Upgrade is free; only actual usage is billed.

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 5. Deploy Frontend to Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

When prompted, set **Output Directory** to `public`.

Or connect your GitHub repo to Vercel and set the root directory to the repo root, output directory to `public`.

### 6. Optional: Run Locally

```bash
npx serve public -l 3000
# Open http://localhost:3000
```

---

## Environment Variables (Vercel)

If you prefer not to commit your Firebase keys, you can inject them at build time. Add these in Vercel → Project → Settings → Environment Variables:

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_VAPID_KEY` | Web Push VAPID public key |

> Note: Firebase client config is not secret. It's safe to include directly in `firebase-config.js`. Security is enforced by Firestore rules.

---

## iPhone PWA Install Guide

1. Open the Vercel URL in **Safari** on iPhone
2. Tap the **Share** button (↑ box icon)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **Add**
5. Open the app from your Home Screen — it will run fullscreen

### Push Notifications on iPhone

- Requires **iOS 16.4 or later**
- Notifications only work when the app is **installed to Home Screen** and opened in standalone mode
- After installing, go to **Settings → Notifications** in the app and toggle them on

---

## Project Structure

```
Planner App for iphone/
├── public/
│   ├── index.html          # SPA shell
│   ├── styles.css          # Full design system
│   ├── app.js              # Router + auth watcher
│   ├── firebase-config.js  # Firebase init
│   ├── auth.js             # Auth helpers
│   ├── db.js               # Firestore CRUD
│   ├── analytics.js        # Stats + chart data
│   ├── notifications.js    # FCM + push
│   ├── manifest.json       # PWA manifest
│   ├── service-worker.js   # Cache + push handler
│   ├── icons/              # App icons (192, 512)
│   └── pages/
│       ├── dashboard.js    # Dashboard
│       ├── subjects.js     # Subjects CRUD
│       ├── topics.js       # Topics CRUD
│       ├── tasks.js        # Tasks list + modal
│       ├── analytics.js    # Charts page
│       └── settings.js     # Settings page
├── functions/
│   ├── index.js            # Cloud Functions
│   └── package.json
├── firestore.rules         # Security rules
├── firebase.json           # Firebase project config
├── vercel.json             # Vercel SPA config
├── package.json
└── README.md
```

---

## Firestore Security Rules

Users can only read and write their own documents. Verified via `resource.data.userId == request.auth.uid`. See `firestore.rules`.

---

## Reminder Flow

1. User creates a task with a `reminderTime` field
2. Task is stored in Firestore with `reminderSent: false`
3. Cloud Function runs every 5 minutes
4. Queries tasks where `reminderTime <= now` and `reminderSent == false`
5. Sends FCM push notification to all user's registered devices
6. Sets `reminderSent = true` to prevent duplicates
7. Snoozed tasks are skipped until `snoozedUntil` passes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES modules), CSS custom properties |
| Charts | Chart.js v4 |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Push | Firebase Cloud Messaging |
| Scheduler | Firebase Cloud Functions v2 |
| Hosting | Vercel |
| PWA | Service Worker + Web App Manifest |
