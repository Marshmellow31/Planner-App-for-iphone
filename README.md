# 🎓 Your Day — The Ultimate Student Planner PWA

![Your Day Banner](https://img.shields.io/badge/Status-Live-success?style=for-the-badge) ![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge) ![PWA](https://img.shields.io/badge/PWA-Ready-purple?style=for-the-badge)

✨ **Live App:** [https://planner-app-for-iphone-9gz7.vercel.app/](https://planner-app-for-iphone-9gz7.vercel.app/)

Your Day is a premium, beautifully designed **Progressive Web App (PWA)** built exclusively for students. It acts as a comprehensive academic dashboard to track your degree progress, manage subjects and tasks, reflect in a daily diary, and receive actual push notifications for upcoming deadlines—all running natively on your phone or browser.

---

## 🌟 Core Features

### 🏰 1. Smart Dashboard & Premium UI
- **Dynamic Header:** High-end SaaS aesthetic with time-based greetings, gradient shimmer animations on your name, and a sophisticated ambient glow.
- **BTech Journey Tracker:** Watch your degree progress bar tick up in real-time.
- **Quick Add & Overview:** Instantly add tasks or view a beautifully rendered Chart.js graph of your weekly productivity.
- **Streak & Milestones:** Gamify your studying by maintaining daily streaks.

### 📚 2. Subject & Topic Management
- **Hierarchical Structure:** Group your studies logically: `Subjects ➔ Topics ➔ Tasks`.
- **Premium SaaS Design:** Beautiful, minimalist subject cards with subtle depth, custom gradient color coding, and clean typography to reduce visual noise.

### 🧠 3. Smart Scheduler & Task Manager
- **Auto-Scheduling Algorithm:** Automatically drops tasks into your available "Study" time blocks based on deadline, estimated completion time, and priority using a custom greedy algorithm.
- Set **Priority Levels** (High, Medium, Low) and specific **Reminder Times**.
- Elegant swipe-to-complete animations and UI micro-interactions.

### 🎯 4. Personal Development
- **Goal Tracking:** Establish long-term objectives and track your progress natively.
- **Daily Action Plans:** Automatically dissect goals into daily tasks, seamlessly feeding them into your Smart Scheduler.

### 📅 5. Academic Calendar
- **Semester Visualizer:** A stunning grid layout showing exactly how many weeks are left in your semester (setup managed cleanly in the Settings tab).
- **Cultural Integration:** Automatically displays major Indian Festivals natively on your monthly grids.

### 📔 6. Daily Diary & Expense Log
- **Mood & Score Tracking:** Rate your day and track your emotional trend.
- **Milestone Engine:** Tick off daily habits (e.g., *Drank 2L water*, *Hit the gym*).
- **Expense Tracker:** Log daily spending directly inside your journal entry.

### 🔔 7. Native Push Notifications
- Receive actual, native lock-screen notifications on your phone or desktop when a task is due.
- *Bypasses paid Firebase plans entirely* by utilizing a completely free **Vercel Serverless API + Cron Job** architecture.

### 📱 8. Installable PWA Experience
- Install Your Day directly to your iPhone or Android Home Screen.
- Operates totally fullscreen with optimized splash screens, custom manifest styling, and blazing fast performance.
---

## ⚙️ How It Works (Architecture)

Your Day is engineered to be blazing fast, serverless, and highly secure.

#### **Frontend Flow (Vite + Vanilla JS)**
The app uses a modular Vanilla JavaScript architecture to keep the bundle size tiny. **Vite** acts as the bundler, injecting the `vite-plugin-pwa` which automatically generates the Service Worker `sw.js` and Manifest file required for offline caching and installation.

#### **Database & Security (Firebase Firestore)**
All data (Tasks, Diary entries, Subjects) is stored in **Cloud Firestore**. 
Advanced **Firestore Security Rules** ensure that every single database query is checked against the user's `Auth Token`. It is mathematically impossible for User A to read or modify User B's diary entries.

#### **Push Notification Engine**
To avoid costly server bills, the push notification engine is split into three parts:
1. **Frontend:** Requests Notification permission and saves an FCM (Firebase Cloud Messaging) device token to Firestore via the `VAPID_KEY`.
2. **Cron Scheduler:** A free external cron service pings the Vercel API every 15 minutes.
3. **Vercel Serverless API (`/api/cron-reminders.js`):** Securely authenticates with the Firebase Admin SDK using Environment Variables, scans the database for overdue tasks, and explicitly sends the payload directly to the user's phone via Google's messaging servers.

---

## 💻 Tech Stack

| Layer | Technology Used |
| :--- | :--- |
| **Frontend Framework** | Vanilla JS (ES Modules), Vite ⚡ |
| **Styling** | Vanilla CSS (Premium Dark Theme, Glassmorphism) 🎨 |
| **Icons** | Lucide Icons 🪶 |
| **Charts** | Chart.js v4 📈 |
| **Authentication** | Firebase Auth (Email/Password & Google Sign-In) 🔐 |
| **Database** | Cloud Firestore (NoSQL) 🗄️ |
| **Backend API** | Vercel Serverless Functions (`Node.js`) ☁️ |
| **Hosting & CI/CD** | Vercel 🚀 |

---

## 🚀 Quick Start Guide

If you are cloning this repository to build your own version, follow these steps:

### 1. Prerequisites
- Node.js installed (v18+)
- A free Firebase Project
- A free Vercel Account

### 2. Local Installation
```bash
# 1. Clone the repo & install dependencies
npm install

# 2. Add your Firebase keys
# Open /public/firebase-config.js and paste your specific Firebase Web App configuration.

# 3. Start the dev server
npm run dev
```

### 3. Deployment
```bash
# Deploys directly to Vercel
npm run deploy

# Remember to set these two Environment Variables in your Vercel Dashboard for push notifications:
# - FIREBASE_SERVICE_ACCOUNT (Your Firebase Admin JSON key)
# - CRON_SECRET (A random password for API security)
```

---
*Built with ❤️ to make studying just a little bit easier.* 
