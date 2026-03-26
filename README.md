# Your Day — Student Planner PWA

> **Plan smarter. Grow daily. Stay on top of everything that matters.**

A feature-rich Progressive Web App (PWA) for students to manage tasks, track personal goals, plan study schedules with AI assistance, and monitor academic progress — all in one premium, AMOLED-optimized mobile-first experience.

---

## 📱 Install on Your iPhone (Recommended)

Your Day is designed to feel like a native iOS app when installed to your Home Screen.

1. Open the app URL in **Safari** on your iPhone (Chrome/Firefox will not work for full PWA support on iOS).
2. Tap the **Share** button (the square with an arrow pointing up) in the toolbar.
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **"Add"** in the top-right corner.
5. The app now appears on your Home Screen with its own icon and launches full-screen, just like a native app! 🎉

> **Tip:** The app works fully offline after the first load, including your schedule and goals.

---

## ✨ Features

### 🏠 Dashboard
- **Live greeting** based on the time of day
- **Stats overview**: tasks done this week, completion rate, current streak (🔥), and overdue count
- **Today's Schedule** widget pulling from your weekly time blocks
- **Upcoming Tasks** list filtered to high-priority and due-soon items
- **Long-Term Focus** banner (optional, based on your profile settings — supports B.Tech, M.Tech, courses, and more)
- Refreshes automatically every minute to stay current

### ✅ Tasks
- Create, edit, delete, and complete tasks with one tap
- Rich filtering: by **priority** (High / Medium / Low), **status** (Pending / Active / Completed), **topic**, and custom search
- **Default filter is Pending** — so you focus on what needs to be done
- Full **CRUD** for topics directly from the task form
- **Due dates** and **reminder times** with native date pickers
- Quick-complete and quick-delete from the task card with smooth animations
- Snooze reminders directly from the task list

### 📅 AI Scheduler
A smart study planner that fits your tasks into your free time automatically.

**How it works:**
1. **Add your weekly schedule** by defining time blocks for each day (Study, Break, Class, etc.) in the Schedule tab.
2. **Queue tasks** in the Scheduler — these are the tasks you want planned.
3. **Generate a Plan** — the AI (greedy algorithm) assigns tasks to your Study blocks, respecting priority and deadlines.
4. The generated plan respects a **5 AM rollover** — one "effective day" runs from 5 AM today to 5 AM tomorrow.
5. View the plan in a clean timeline sorted chronologically, including late-night blocks.

**Key concepts:**
- Tasks not fitting into available Study blocks appear as "Unscheduled".
- The plan resets at 5 AM each day.
- You can push tasks directly from **Personal Dev** goals into the Scheduler with one tap.

### 🌱 Personal Development (Growth)
Track personal growth goals beyond academics.

- Create goals with a **target**, **unit** (sessions, minutes, pages, etc.), **duration**, and **start date**.
- Enable **Auto Add Daily** to have a daily task automatically generated each morning.
- Goals catch up missed days — if you were away for 3 days, it generates all 3 missed tasks at once.
- View and manage all auto-generated daily tasks with progress tracking.
- Push any pending goal task directly to the **AI Scheduler** with one tap.

### 📊 Analytics
- **Weekly Summary Cards**: Completion rate, completed task count, overdue items, and total focus time — at a glance.
- **AI-powered Key Insights**: Automatically generated statements about your most productive days and system health.
- **Consistency Heat Map**: A 24-week, LeetCode-style activity tracker with a premium green color palette and a visual activity legend.
- **Focus Distribution**: Topic-wise task completion breakdown with progress bars.

### ⚙️ Settings
- Change **display name** and **email**
- Toggle **push notifications** (FCM-powered)
- Set your **Long-Term Focus** goal (e.g., B.Tech, M.Tech, a specific course, a certification) with start/end dates
- **Study Goals** text field for personal notes
- Links for **feedback and bug reports**
- Sign out

---

## 🔄 Workflow Integration

The power of **Your Day** lies in how its features work together to automate your productivity:

### 1. The Growth Loop (Goals → Tasks)
- When you define a **Personal Development Goal** with "Auto Add Daily" enabled, the `dailyGenerator.js` utility runs every morning (respecting the 5 AM start).
- It checks for any missed days and generates **Goal Tasks** (e.g., "Study Physics — 45 minutes").
- These tasks appear in your **Personal Dev** tab as pending items.

### 2. The Planning Loop (Tasks → Scheduler)
- Any task (Academic or Personal Dev) can be sent to the **AI Scheduler queue**.
- The `schedulerIntegration.js` handles the hand-off, ensuring the task is visible in both the global Tasks list and the Scheduler queue.

### 3. The Execution Loop (Schedule → Plan)
- The **AI Scheduler** takes your manual **Weekly Schedule** (your "fixed" time like classes or gym) and your **Task Queue**.
- It runs a greedy algorithm (`taskScheduler.js`) to find "Study" blocks in your day.
- It automatically creates a minute-by-minute **Generated Plan**, placing your highest-priority and most urgent tasks into those blocks.
- This plan is then mirrored on your **Dashboard** so you always know what to do *right now*.

---

## 🏗️ Architecture

```
public/
├── index.html              # App shell, floating nav, splash screen
├── styles.css              # Full design system (CSS variables, AMOLED dark theme)
├── app.js                  # Router, auth listener, navigation, FAB, state
│
├── auth.js                 # Firebase Auth helpers (sign up, log in, Google)
├── db.js                   # Firestore CRUD for all collections
├── analytics.js            # Analytics computations (streak, heatmap, insights)
├── notifications.js        # FCM push + in-app notification layer
├── snackbar.js             # Toast + confirm dialog system
├── firebase-config.js      # Firebase app init + VAPID key
│
├── pages/
│   ├── dashboard.js        # Dashboard renderer + schedule widget
│   ├── tasks.js            # Tasks page with filtering and CRUD
│   ├── scheduler.js        # AI Scheduler tab (schedule + plan UI)
│   ├── schedule.js         # Weekly schedule block editor
│   ├── personalDevelopment.js # Goals + daily task tracker
│   ├── topics.js           # Topics CRUD page (per subject)
│   ├── analytics.js        # Analytics page (heatmap, insights, distribution)
│   └── settings.js         # Settings page
│
├── js/
│   ├── utils.js            # Shared DOM helpers, escHtml, formatDate, ripples
│   ├── auth_ui.js          # Auth form event bindings
│   └── landing.js          # Landing page animations
│
└── utils/
    ├── taskScheduler.js    # Greedy scheduling algorithm (5 AM rollover)
    ├── dailyGenerator.js   # Auto daily task generation from goals
    ├── schedulerIntegration.js # Push goal tasks → Scheduler + Tasks
    ├── timeUtils.js        # Time string helpers (HH:MM ↔ minutes)
    └── personalDevelopment.js  # Goal progress computation helpers
```

### Data Flow

```
User Action
    │
    ▼
app.js (navigate / state)
    │
    ├─► pages/*.js       → renders UI, calls db.js
    │
    ├─► db.js            → Firestore (tasks, goals, schedule, plan)
    │
    ├─► utils/           → pure logic (scheduling, generation)
    │
    └─► snackbar.js      → user feedback (toasts + confirms)
```

---

## 🔧 Setup & Self-Hosting

### Prerequisites
- Node.js 18+
- A Firebase project with **Firestore**, **Firebase Auth**, and **Firebase Cloud Messaging** enabled

### 1. Clone & Install

```bash
git clone https://github.com/Marshmellow31/Planner-App-for-iphone.git
cd Planner-App-for-iphone
npm install
```

### 2. Configure Firebase

Copy `.env.example` to `.env` and fill in your Firebase project values:

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

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production

```bash
npm run build
```

### 5. Deploy

The app is configured for **Vercel** (via `vercel.json`). Simply run:

```bash
vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deployments.

---

## 🔒 Firestore Security Rules

The project includes `firestore.rules` scoped per-user — every document is owned by and accessible only to the authenticated user who created it.

---

## 🛎️ Push Notifications

Push notifications are powered by **Firebase Cloud Messaging (FCM)**.

- Enable notifications from the **Settings** page.
- Notifications are sent via Cloud Functions when a task reminder time is reached.
- The service worker (`firebase-messaging-sw.js`) handles background message delivery.

---

## 🤝 Contributing

Pull requests are welcome. Please open an issue first to discuss major changes.

For feedback or bug reports, find links in the **Settings** page of the app.

---

## 📄 License

MIT
