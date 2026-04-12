# Ascend

> **Plan smarter. Grow daily. Stay on top of everything that matters.**

A feature-rich **Progressive Web App (PWA)** for students to manage tasks, track personal goals, plan study schedules with AI assistance, and monitor academic progress — all in one premium, AMOLED-optimized, mobile-first experience.

---

## 📱 Install on Your Device

Ascend is designed to feel like a native app when added to your Home Screen.

### iPhone / iPad (Recommended)
1. Open the app URL in **Safari** (Chrome/Firefox don't support full PWA install on iOS).
2. Tap the **Share** button → **"Add to Home Screen"** → **"Add"**.
3. The app launches full-screen from your Home Screen — no browser chrome, no address bar.

### Android
1. Open the app in **Chrome**.
2. Tap the **⋮ menu** → **"Add to Home Screen"** or look for the install prompt in the address bar.

> **Works fully offline** after the first load — your schedule, tasks, and notes are always accessible.

---

## ✨ Features

### 🏠 Dashboard
- **Live greeting** and motivational subtitle based on time of day
- **Stats overview**: tasks done this week, completion rate, current streak 🔥, and overdue count
- **Focus Pipeline**: your next 3 upcoming schedule blocks so you always know what's next
- **Upcoming Tasks**: high-priority and due-soon items sorted by urgency
- **Quick Notes**: a persistent notepad always visible on the dashboard — create colour-coded, pinnable notes in seconds
- **Long-Term Focus** banner (optional, based on your profile — B.Tech, M.Tech, courses, certifications, and more)
- Auto-refreshes every minute; SWR caching ensures instant loads from cache with silent background sync

### 📝 Quick Notes
- Persistent, Firestore-backed notes visible directly on the dashboard
- **6 colour accents** (Blue, Cyan, Green, Amber, Red, Violet) for visual organisation
- **Pin to top** any note so it always appears first
- Centered popup modal to create or edit — works equally well on mobile and desktop
- Notes load instantly from a dedicated cache key; skeleton cards shown while syncing
- Full CRUD: create, edit, update, delete — all reflected in real time

### ✅ Tasks
- Create, edit, delete, and complete tasks with one tap
- Rich filtering: by **priority** (High / Medium / Low), **status** (Pending / Active / Completed), **topic**, and free-text search
- Default filter shows **Pending** tasks — so you stay focused on what's undone
- Assign tasks to **Topics** and **Subtopics** for granular organisation
- **Due dates** and **reminder times** with native date/time pickers
- Quick-complete and quick-delete from the task card with smooth animations
- Topic management shortcut directly from the Schedule tab

### 📚 Topics & Subtopics
- Organise your academic subjects as **Topics** (e.g., "Physics", "DSA")
- Break them down further into **Subtopics** for fine-grained tracking
- Topics can be created, renamed, or deleted directly from the Tasks form or via the Topics page

### 📅 AI Scheduler
A smart study planner that fits your tasks into your free time automatically.

**How it works:**
1. Define your **weekly time blocks** in the Schedule tab (Study, Break, Class, etc.).
2. **Queue tasks** you want planned into the Scheduler.
3. **Generate a Plan** — a greedy algorithm assigns tasks to your Study blocks, respecting priority and deadlines.
4. Uses a **5 AM rollover** — one "effective day" runs from 5 AM today to 5 AM tomorrow.
5. View the generated plan as a clean, chronological timeline.

**Key behaviour:**
- Tasks that can't fit into available study blocks appear as "Unscheduled".
- The plan resets at 5 AM each day.
- Push tasks from **Personal Dev** goals into the Scheduler with one tap.
- Manage topics directly from the Schedule tab without leaving the page.

### 🧠 Focus Engine
- **Focus Pipeline** on the dashboard surfaces your most relevant upcoming study block
- One-tap **Start Focus Session** from any schedule block
- Tracks active vs. upcoming vs. completed blocks throughout the day
- Integrates with the schedule to give a real-time view of your study day

### 🌱 Personal Development (Growth)
Track personal growth goals beyond academics.

- Create goals with a **target**, **unit** (sessions, minutes, pages, km, etc.), **duration**, and **start date**
- Enable **Auto Add Daily** to automatically generate a daily task each morning
- Catches up missed days — if you were away for 3 days, it generates all 3 missed tasks at once
- View and manage all auto-generated daily tasks with progress tracking
- Push any goal task directly to the **AI Scheduler** with one tap

### 📊 Analytics
- **Weekly Summary Cards**: Completion rate, completed count, overdue items, and total focus time
- **AI-generated Key Insights**: Automatically written observations about your most productive days and patterns
- **Consistency Heat Map**: 24-week, LeetCode-style activity tracker with a premium green palette and activity legend
- **Focus Distribution**: Topic-wise task completion breakdown with progress bars

### ⚙️ Settings
- Change **display name** and **email**
- Toggle **push notifications** (FCM-powered)
- Set your **Long-Term Focus** goal with start/end dates
- **Study Goals** text field for personal notes
- In-app Service Worker update management — see and apply new versions without re-installing
- Feedback and bug report links
- Sign out

---

## 🔄 Integrated Workflows

The real power of Ascend is how features connect to automate your day:

### 1. Growth Loop — Goals → Tasks
Personal Dev goals with **Auto Add Daily** automatically generate tasks each morning via `dailyGenerator.js`, even catching up missed days.

### 2. Planning Loop — Tasks → Scheduler
Any task (Academic or Personal Dev) can be sent to the AI Scheduler queue. The greedy algorithm (`taskScheduler.js`) slots them into your Study blocks respecting priority and deadlines.

### 3. Execution Loop — Schedule → Focus Pipeline → Dashboard
Your Weekly Schedule feeds the **Focus Pipeline** on the dashboard, surfacing exactly what you should be working on right now. Tap to start a Focus Session.

### 4. Notes Loop — Capture → Review → Act
Quick Notes on the dashboard let you capture thoughts instantly. Pinned notes stay top-of-mind; colour coding groups related ideas visually.

---

## ⚡ Performance & Architecture

Ascend is engineered for a **0-second perceived latency** experience with 60FPS smoothness.

### SWR Caching (Stale-While-Revalidate)
- Every tab caches its data in `localStorage` via `cacheManager.js`
- On re-navigation, the cached view renders **immediately** while Firestore fetches fresh data in the background
- Notes use a **dedicated `notes_${uid}` cache key** — separate from the dashboard cache — so they're always instantly available on reload without a false empty state
- Revision-based change detection avoids unnecessary re-renders

### Shell Rendering
- The app shell (header, nav, layout) paints **synchronously** before any async data
- Skeleton loaders provide visual structure while remote data loads

### Connectivity Awareness
- `connectivityManager.js` tracks online/offline state and suppresses error toasts when offline
- Firestore offline persistence ensures the app works without a connection
- All DB errors are handled gracefully — permission/network failures fall back to cached data rather than crashing the UI

### Service Worker & Updates
- `swUpdateManager.js` detects new app versions and prompts the user to update in-app
- PWA precache ensures all assets load offline with no request to the network

### Main-Thread Safety
- Large lists are processed in small batches to keep the main thread responsive
- Background preloading of secondary routes is deferred 6 seconds after dashboard settle
- All page-level intervals and async tasks are cleaned up on navigation to prevent memory leaks

---

## 🏗️ Project Structure

```
Ascend App/
├── public/
│   ├── index.html                  # App shell, floating nav, splash screen
│   ├── styles.css                  # Full design system — CSS variables, dark/light themes
│   ├── app.js                      # Router, auth listener, navigation, FAB, icon setup
│   │
│   ├── auth.js                     # Firebase Auth helpers (sign up, log in, Google OAuth)
│   ├── db.js                       # Firestore CRUD — tasks, goals, schedule, notes, topics
│   ├── analytics.js                # Analytics computations (streak, heatmap, insights)
│   ├── notifications.js            # FCM push + in-app notification layer
│   ├── snackbar.js                 # Toast + confirm dialog system
│   ├── firebase-config.js          # Firebase app init + VAPID key
│   │
│   ├── pages/
│   │   ├── dashboard.js            # Dashboard — stats, focus pipeline, tasks, notes
│   │   ├── tasks.js                # Tasks page with filtering, CRUD, and topic management
│   │   ├── schedule.js             # AI Scheduler + weekly block editor
│   │   ├── personalDevelopment.js  # Goals tracker + auto daily task system
│   │   ├── topics.js               # Topics CRUD page
│   │   ├── subtopics.js            # Subtopics CRUD page
│   │   ├── analytics.js            # Analytics page (heatmap, cards, insights)
│   │   └── settings.js             # Settings page + SW update management
│   │
│   ├── js/
│   │   ├── utils.js                # Shared helpers — escHtml, formatDate, ripple effects
│   │   ├── auth_ui.js              # Auth form event bindings
│   │   ├── landing.js              # Landing page animations
│   │   └── utils/
│   │       ├── logger.js           # Structured logging utility
│   │       └── userGuide.js        # In-app onboarding guide
│   │
│   └── utils/
│       ├── cacheManager.js         # SWR Caching Layer (Memory + LocalStorage + revisions)
│       ├── connectivityManager.js  # Online/offline detection and state broadcasting
│       ├── focusEngine.js          # Focus session logic and pipeline rendering
│       ├── taskScheduler.js        # Greedy scheduling algorithm (5 AM rollover)
│       ├── dailyGenerator.js       # Auto daily task generation from personal goals
│       ├── personalDevelopment.js  # Goal progress computation helpers
│       ├── swUpdateManager.js      # Service Worker version detection + update prompts
│       ├── rateLimiter.js          # Debounce/throttle for high-frequency actions
│       └── timeUtils.js            # Time string helpers (HH:MM ↔ minutes)
│
├── functions/                      # Firebase Cloud Functions (FCM notification triggers)
├── firestore.rules                 # Per-user Firestore security rules
├── firestore.indexes.json          # Composite indexes for efficient queries
├── firebase.json                   # Firebase hosting + functions config
├── vite.config.js                  # Vite build config + PWA plugin setup
└── vercel.json                     # Vercel deploy config (SPA routing, cache headers)
```

### Data Flow

```
User Action
    │
    ▼
app.js  ──►  pages/*.js   ──►  db.js   ──►  Firestore
                │                │
                │          cacheManager.js  (SWR layer)
                │
                ├──►  utils/     (pure logic — scheduling, generation, focus)
                │
                └──►  snackbar.js  (toasts + confirm dialogs)
```

---

## 🔧 Setup & Self-Hosting

### Prerequisites
- **Node.js 18+**
- A **Firebase project** with Firestore, Firebase Auth, and Firebase Cloud Messaging enabled

### 1. Clone & Install

```bash
git clone https://github.com/Marshmellow31/Ascend.git
cd "Ascend App"
npm install
```

### 2. Configure Firebase

Copy `.env.example` to `.env` and fill in your Firebase project credentials:

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

### 3. Run Locally (Dev Server)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The dev server **does not** use the Service Worker, so you'll always see your latest changes immediately.

### 4. Preview Production Build

```bash
npm run build
npm run preview
```

Open [http://localhost:4173](http://localhost:4173). Uses the Service Worker — hard refresh (`Ctrl+Shift+R`) to bypass its cache after a rebuild.

### 5. Deploy

**Deploy to Vercel (frontend):**
```bash
npm run deploy
# or: vercel --prod
```

**Deploy Firestore rules (required for notes and all data security):**
```bash
npm run deploy:rules
# or: firebase deploy --only firestore:rules
```

**Deploy Cloud Functions (push notifications):**
```bash
npm run deploy:functions
```

**Deploy everything at once:**
```bash
npm run deploy:all
```

Or connect your GitHub repo to **Vercel** for automatic CI/CD deployments on every push.

---

## 🔒 Security

All Firestore collections are protected by **ownership-based rules** in `firestore.rules`. Every document created by a user is tagged with their `uid` and is only accessible to them — no user can read or modify another user's data.

Collections protected:
- `tasks` — Academic and personal tasks
- `goals` — Personal Development goals
- `scheduleBlocks` — Weekly time block definitions
- `schedulerPlan` — AI-generated study plans
- `notes` — Quick notes (dashboard)
- `topics` / `subtopics` — Subject organisation

> **Important:** Always run `npm run deploy:rules` after modifying `firestore.rules` to apply changes to production.

---

## 🛎️ Push Notifications

Powered by **Firebase Cloud Messaging (FCM)**:

- Enable from the **Settings** page
- Cloud Functions trigger notifications when a task's reminder time is reached
- The service worker (`firebase-messaging-sw.js`) handles background message delivery and displays native system notifications

---

## 🤝 Contributing

Pull requests are welcome. Please open an issue first to discuss major changes.

For feedback or bug reports, use the links in the **Settings** page of the app.

---

## 📄 License

MIT
