// ============================================================
// pages/dashboard.js — Dashboard page renderer
// ============================================================

import { getTasks, completeTask, snoozeTask } from "../db.js";
import { computeAnalytics } from "../analytics.js";
import { getSubjects } from "../db.js";
import { navigate } from "../app.js";
import { showSnackbar } from "../snackbar.js";

let dashboardChart = null;
let dashboardInterval = null;

export async function renderDashboard(container, uid, profile) {
  if (dashboardChart) {
    dashboardChart.destroy();
    dashboardChart = null;
  }
  if (dashboardInterval) {
    clearInterval(dashboardInterval);
  }
  
  // Refresh schedule every minute to update current task logic
  dashboardInterval = setInterval(() => {
    updateDashboardState(uid, profile);
  }, 60000);

  container.innerHTML = `
    <div class="premium-header">
      <div class="premium-greeting">${getGreeting()}</div>
      <h1 class="premium-name">${profile?.displayName || "Student"}</h1>
      <div class="premium-subtitle">${getSubtitle()}</div>
    </div>
    <div id="dash-loading" class="animate-pulse text-muted text-sm mb-md">Loading your day…</div>
    <div id="dash-content" class="hidden">
      <!-- BTech Banner -->
      <div id="dash-btech-banner"></div>

      <div class="stats-row mb-md" id="dash-stats"></div>

      <!-- Today's Schedule -->
      <div class="section-header mb-sm">
        <div class="section-title">Today's Schedule</div>
        <button class="btn btn-sm btn-ghost ripple" id="btn-see-schedule">Manage</button>
      </div>
      <div id="today-schedule-list" class="mb-md"></div>

      <!-- Tasks summary -->
      <div id="dash-tasks-section"></div>
    </div>
  `;

  document.getElementById("btn-see-schedule")?.addEventListener("click", () => navigate("schedule"));

  // BTech Banner
  renderBTechBanner(profile);

  // Fetch initial data
  await updateDashboardState(uid, profile, true);

  const el = document.getElementById("dash-loading");
  if (el) el.remove();
  const content = document.getElementById("dash-content");
  if (content) content.classList.remove("hidden");
}

function renderBTechBanner(profile) {
  const el = document.getElementById("dash-btech-banner");
  if (!el) return;
  const { btechStart, btechEnd, btechName } = profile || {};
  if (!btechStart || !btechEnd) { el.innerHTML = ""; return; }

  const start = new Date(btechStart + "T00:00:00");
  const end = new Date(btechEnd + "T00:00:00");
  const now = new Date(); now.setHours(0,0,0,0);
  const totalDays = Math.round((end - start) / 86400000);
  const elapsed = Math.min(Math.max(Math.round((now - start) / 86400000), 0), totalDays);
  const remaining = totalDays - elapsed;
  const pct = Math.round((elapsed / totalDays) * 100);
  const monthsLeft = Math.round(remaining / 30.44);

  el.innerHTML = `
    <div class="btech-banner mb-md">
      <div class="btech-banner-top">
        <div>
          <div class="btech-degree-label">🎓 ${escHtml(btechName || "B.Tech Journey")}</div>
          <div class="btech-tagline">Keep pushing — you've got this!</div>
        </div>
        <div class="btech-count-box">
          <div class="btech-count-num">${monthsLeft}</div>
          <div class="btech-count-label">months left</div>
        </div>
      </div>
      <div class="btech-progress-bar">
        <div class="btech-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="btech-progress-meta">
        <span>${elapsed} days done</span>
        <span>${pct}% complete</span>
        <span>${remaining} days left</span>
      </div>
    </div>
  `;
}

async function updateDashboardState(uid, profile, isFirstLoad = false) {
  let subjects = [], analyticsData = null;
  try {
    subjects = await getSubjects(uid);
    analyticsData = await computeAnalytics(uid, profile?.weekStartDay || "monday", subjects);
  } catch (err) {
    showSnackbar("Failed to load dashboard data", "error");
    console.error("Dashboard load error:", err);
    return;
  }

  // 1. Stats
  const statsEl = document.getElementById("dash-stats");
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card ${isFirstLoad ? 'stagger-item' : ''}" style="animation-delay:0ms">
        <div class="stat-number">${analyticsData.completed}</div>
        <div class="stat-label">Done this week</div>
      </div>
      <div class="stat-card ${isFirstLoad ? 'stagger-item' : ''}" style="animation-delay:40ms">
        <div class="stat-number">${analyticsData.completionRate}%</div>
        <div class="stat-label">Completion rate</div>
      </div>
      <div class="stat-card ${isFirstLoad ? 'stagger-item' : ''}" style="animation-delay:80ms">
        <div class="stat-number">${analyticsData.streak}</div>
        <div class="stat-label">Day streak <i data-lucide="flame" style="width:14px;height:14px;display:inline-block;vertical-align:middle;color:#ff9f43"></i></div>
      </div>
      <div class="stat-card ${isFirstLoad ? 'stagger-item' : ''}" style="animation-delay:120ms">
        <div class="stat-number" style="${analyticsData.overdue > 0 ? 'color:var(--error)' : ''}">${analyticsData.overdue}</div>
        <div class="stat-label">Overdue</div>
      </div>
    `;
  }

  // 2. Scheduled Tasks Logic
  const schedList = document.getElementById("today-schedule-list");
  if (schedList) {
    const { getWeeklySchedule } = await import("../db.js");
    const scheduleData = await getWeeklySchedule(uid);
    
    const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayStr = DAYS[new Date().getDay()];
    let todayTasks = scheduleData[todayStr] || [];

    // Sort by start time
    todayTasks.sort((a, b) => a.start_time.localeCompare(b.start_time));

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    // Parse HH:MM to minutes
    const toMins = (t) => {
      const [h, m] = t.split(":");
      return parseInt(h) * 60 + parseInt(m);
    };

    let prevTask = null, currTask = null, nextTasks = [];

    todayTasks.forEach(t => {
      const sMins = toMins(t.start_time);
      const eMins = toMins(t.end_time);

      if (currentMins >= sMins && currentMins < eMins) {
        currTask = t;
      } else if (currentMins >= eMins) {
        prevTask = t; // Will end up being the last completed task because of the sort
      } else if (currentMins < sMins) {
        nextTasks.push(t);
      }
    });

    // Build the display list
    let displayTasks = [];
    if (currTask) {
      if (prevTask) displayTasks.push({ ...prevTask, _state: "prev" });
      displayTasks.push({ ...currTask, _state: "curr" });
      if (nextTasks.length > 0) displayTasks.push({ ...nextTasks[0], _state: "next" });
    } else {
      // No current task, show up to 3 upcoming
      displayTasks = nextTasks.slice(0, 3).map(t => ({ ...t, _state: "next" }));
    }

    if (displayTasks.length === 0 && todayTasks.length > 0) {
      // Only previous tasks left today
      displayTasks.push({ ...todayTasks[todayTasks.length - 1], _state: "prev" });
    }

    if (displayTasks.length === 0) {
      schedList.innerHTML = `
        <div class="empty-state" style="padding:var(--space-md); text-align:left; flex-direction:row; align-items:center; gap:var(--space-md);">
          <div class="empty-icon" style="margin:0"><i data-lucide="coffee"></i></div>
          <div>
            <div class="empty-title" style="margin:0; font-size:var(--font-size-md)">Free Day!</div>
            <div class="empty-desc">No more tasks scheduled for today.</div>
          </div>
        </div>`;
    } else {
      schedList.innerHTML = displayTasks.map((task, index) => {
        let badgeStyle = "background: var(--bg-hover); color: var(--text-secondary);";
        let stateLabel = "";
        let borderGlow = "";

        if (task._state === "curr") {
          badgeStyle = "background: #1B1B1B; color: #F5F5F5; border: 1px solid #333333; animation: pulse 2s infinite;";
          stateLabel = "HAPPENING NOW";
          borderGlow = "border: 1px solid #4A4A4A; box-shadow: 0 0 16px rgba(255,255,255,0.05);";
        } else if (task._state === "prev") {
          stateLabel = "COMPLETED";
        } else if (task._state === "next") {
          badgeStyle = "background: #111111; color: #A1A1A1; border: 1px solid #262626;";
          stateLabel = "UPCOMING";
        }

        return `
          <div class="task-card priority-${(task.priority || 'medium').toLowerCase()} ${isFirstLoad ? 'stagger-item' : ''}" style="animation-delay:${200 + (index * 40)}ms; cursor:default; margin-bottom:var(--space-sm); ${borderGlow}">
            <div class="task-body" style="flex:1;">
              <div style="font-size:10px; font-weight:700; letter-spacing:1px; margin-bottom:4px; padding:2px 6px; display:inline-block; border-radius:4px; ${badgeStyle}">${stateLabel}</div>
              <div class="task-title" style="word-break:break-word; font-size:var(--font-size-md);">${escHtml(task.title)}</div>
              <div class="task-meta" style="margin-top:4px;">
                <span class="task-due" style="display:inline-flex;align-items:center;gap:4px;color:var(--text-secondary)">
                  <i data-lucide="clock" style="width:12px;height:12px"></i> 
                  ${task.start_time} - ${task.end_time}
                </span>
                <span class="badge badge-${(task.priority || 'medium').toLowerCase()}">${task.priority || 'Medium'}</span>
              </div>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  // 4. Tasks Summary
  const tasksSection = document.getElementById("dash-tasks-section");
  if (tasksSection) {
    const allTasks = await getTasks(uid);
    const pendingTasks = allTasks.filter(t => !t.isCompleted);
    // Sort pending tasks by due date (closest first)
    pendingTasks.sort((a, b) => {
      const dateA = a.dueDate?.toMillis ? a.dueDate.toMillis() : (a.dueDate ? new Date(a.dueDate).getTime() : Infinity);
      const dateB = b.dueDate?.toMillis ? b.dueDate.toMillis() : (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);
      return dateA - dateB;
    });
    
    const displayTasks = pendingTasks.slice(0, 5);

    if (displayTasks.length > 0) {
      tasksSection.innerHTML = `
        <div class="section-header mb-sm" style="margin-top:var(--space-md)">
          <div class="section-title">Upcoming Tasks</div>
          <button class="btn btn-sm btn-ghost ripple" id="btn-see-tasks">See All</button>
        </div>
        <div class="tasks-list" id="dashboard-tasks-list"></div>
      `;
      const listEl = document.getElementById("dashboard-tasks-list");
      displayTasks.forEach((task, index) => {
        const card = buildTaskCard(task, uid, () => updateDashboardState(uid, profile));
        if (isFirstLoad) {
          card.classList.add("stagger-item");
          card.style.animationDelay = `${250 + (index * 40)}ms`;
        }
        card.style.cursor = "pointer";
        card.addEventListener("click", (e) => {
          // Prevent navigation if clicking on an action button
          if (!e.target.closest('.btn')) {
            navigate("tasks");
          }
        });
        listEl.appendChild(card);
      });
      document.getElementById("btn-see-tasks")?.addEventListener("click", () => navigate("tasks"));
    } else {
      tasksSection.innerHTML = `
        <div class="section-header mb-sm" style="margin-top:var(--space-md)">
          <div class="section-title">Upcoming Tasks</div>
          <button class="btn btn-sm btn-ghost ripple" id="btn-see-tasks">Add Task</button>
        </div>
        <div class="empty-state" style="padding:var(--space-md); text-align:left; flex-direction:row; align-items:center; gap:var(--space-md);">
          <div class="empty-icon" style="margin:0"><i data-lucide="check-circle"></i></div>
          <div>
            <div class="empty-title" style="margin:0; font-size:var(--font-size-md)">All caught up!</div>
            <div class="empty-desc">No upcoming tasks right now.</div>
          </div>
        </div>
      `;
      document.getElementById("btn-see-tasks")?.addEventListener("click", () => navigate("tasks"));
    }
  }

  if (window.lucide) window.lucide.createIcons();
}

window._navTopic = (id, name) => navigate("topics", { subjectId: id, subjectName: name });

// ── Build task card DOM element ───────────────────────────────
export function buildTaskCard(task, uid, onUpdate) {
  const card = document.createElement("div");
  const isDone = task.isCompleted;
  const priority = task.priority || "medium";
  const due = task.dueDate?.toDate ? task.dueDate.toDate() : (task.dueDate ? new Date(task.dueDate) : null);
  const isOverdue = due && due < new Date() && !isDone;

  card.className = `task-card priority-${priority}${isDone ? " completed" : ""}`;
  // Use explicit button controls for deletion and completion
  card.innerHTML = `
    <div class="task-top-section">
      <div class="priority-label ${priority.toLowerCase()}">${priority}</div>
      <div class="task-actions" style="display:flex; gap:8px;">
        <button class="btn btn-sm ${isDone ? "btn-secondary" : "btn-primary"} task-check-btn" style="padding: 4px 10px;" title="${isDone ? "Undo" : "Done"}">
          <i data-lucide="${isDone ? "rotate-ccw" : "check"}" style="width:14px;height:14px;"></i>
        </button>
        <button class="btn btn-sm btn-danger task-delete-btn" style="padding: 4px 10px;" aria-label="Delete" title="Delete">
          <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
        </button>
      </div>
    </div>
    <div class="task-main-section">
      <div class="task-title">${escHtml(task.title)}</div>
      <div class="task-meta">
        ${due ? `<span class="task-due${isOverdue ? " overdue" : ""}" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="calendar" style="width:12px;height:12px"></i> ${formatDate(due)}</span>` : `<span class="task-due" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="calendar-off" style="width:12px;height:12px"></i> No date</span>`}
      </div>
    </div>
  `;

  card.querySelector(".task-check-btn").addEventListener("click", async (e) => {
    e.stopPropagation();
    const { completeTask, reopenTask } = await import("../db.js");
    if (isDone) await reopenTask(task.id);
    else await completeTask(task.id);
    onUpdate();
  });

  card.querySelector(".task-delete-btn").addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete "${task.title}"?`)) return;
    const { deleteTask } = await import("../db.js");
    await deleteTask(task.id);
    onUpdate();
  });

  return card;
}

// ── Shared Chart options ──────────────────────────────────────
export function chartBaseOptions(title = "") {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1a1a2e",
        titleColor: "#f0f0ff",
        bodyColor: "#a0a0c0",
        borderColor: "rgba(108,99,255,0.3)",
        borderWidth: 1,
      },
    },
    scales: {
      x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#5a5a80" } },
      y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#5a5a80", stepSize: 1 }, beginAtZero: true },
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning,";
  if (h >= 12 && h < 17) return "Good afternoon,";
  if (h >= 17 && h < 22) return "Good evening,";
  return "Still working late?";
}

function getSubtitle() {
  const subtitles = [
    "Let’s make today productive.",
    "Stay consistent. You’re improving.",
    "One step closer today."
  ];
  return subtitles[Math.floor(Math.random() * subtitles.length)];
}

export function escHtml(str = "") {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

export function formatDate(date) {
  const now = new Date();
  const d = new Date(date);
  if (d.toDateString() === now.toDateString()) return "Today";
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
