// ============================================================
// pages/dashboard.js — Dashboard page renderer
// ============================================================

import { getTasks, completeTask, snoozeTask } from "../db.js";
import { computeAnalytics, buildWeeklyLine } from "../analytics.js";
import { getSubjects } from "../db.js";
import { navigate } from "../app.js";
import { showSnackbar } from "../snackbar.js";

let dashboardChart = null;

export async function renderDashboard(container, uid, profile) {
  if (dashboardChart) {
    dashboardChart.destroy();
    dashboardChart = null;
  }

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="text-muted text-sm">${getGreeting()}</div>
        <h1 class="page-title" style="font-size:var(--font-size-2xl)">${profile?.displayName || "Student"}</h1>
      </div>
    </div>
    <div id="dash-loading" class="animate-pulse text-muted text-sm mb-md">Loading your day…</div>
    <div id="dash-content" class="hidden">
      <!-- BTech Banner -->
      <div id="dash-btech-banner"></div>

      <!-- Quick Add Task -->
      <div class="quick-add-container mb-md">
        <div class="quick-add-input-wrapper">
          <input type="text" id="quick-add-input" class="form-input" placeholder="Quick add task (Press Enter)..." style="border-radius:24px;padding-right:48px;" />
          <button id="quick-add-btn" class="quick-add-submit" aria-label="Add task"><i data-lucide="arrow-right" style="width:20px;height:20px"></i></button>
        </div>
      </div>

      <div class="stats-row mb-md" id="dash-stats"></div>

      <!-- Weekly chart -->
      <div class="chart-container mb-md stagger-item" style="animation-delay:160ms">
        <div class="chart-title">This Week's Progress</div>
        <canvas id="dash-chart" height="140"></canvas>
      </div>

      <!-- Today's tasks -->
      <div class="section-header mb-sm">
        <div class="section-title">Today's Tasks</div>
        <button class="btn btn-sm btn-ghost ripple" id="btn-see-all-tasks">See all</button>
      </div>
      <div id="today-tasks-list"></div>

      <!-- Subject summary -->
      <div id="dash-subjects-section"></div>
    </div>
  `;

  document.getElementById("btn-see-all-tasks")?.addEventListener("click", () => navigate("tasks"));

  // ── Quick Add Task ───────────────────────────────────────────
  const quickAddInput = document.getElementById("quick-add-input");
  const quickAddBtn = document.getElementById("quick-add-btn");

  const submitQuickAdd = async () => {
    const title = quickAddInput.value.trim();
    if (!title) return;
    quickAddInput.disabled = true;
    quickAddBtn.disabled = true;
    
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Noon

    try {
      const { createTask } = await import("../db.js");
      await createTask(uid, {
        title,
        priority: "medium",
        dueDate: today.toISOString(),
      });
      showSnackbar("Task added to Today", "success");
      quickAddInput.value = "";
      quickAddInput.disabled = false;
      quickAddBtn.disabled = false;
      quickAddInput.focus();
      
      // Update dynamically
      await updateDashboardState(uid, profile);
    } catch (err) {
      showSnackbar("Failed to add task", "error");
      quickAddInput.disabled = false;
      quickAddBtn.disabled = false;
      quickAddInput.focus();
    }
  };

  quickAddInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") submitQuickAdd();
  });
  quickAddBtn?.addEventListener("click", submitQuickAdd);

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

  // 2. Chart Component Update
  const ctx = document.getElementById("dash-chart");
  const chartData = buildWeeklyLine(analyticsData);
  if (dashboardChart) {
    dashboardChart.data.labels = chartData.labels;
    dashboardChart.data.datasets[0].data = chartData.datasets[0].data;
    dashboardChart.update();
  } else if (ctx && window.Chart) {
    dashboardChart = new Chart(ctx, {
      type: "line",
      data: chartData,
      options: chartBaseOptions("Tasks Completed"),
    });
  }

  // 3. Today Tasks
  const todayList = document.getElementById("today-tasks-list");
  if (todayList) {
    todayList.innerHTML = "";
    if (analyticsData.todayTasks.length === 0) {
      todayList.innerHTML = `
        <div class="empty-state ${isFirstLoad ? 'stagger-item' : ''}" style="padding:var(--space-xl);animation-delay:200ms">
          <div class="empty-icon"><i data-lucide="sparkles"></i></div>
          <div class="empty-title">All clear today!</div>
          <div class="empty-desc">No tasks due today. Add one above.</div>
        </div>`;
    } else {
      analyticsData.todayTasks.forEach((task, index) => {
        const card = buildTaskCard(task, uid, () => updateDashboardState(uid, profile));
        if (isFirstLoad) {
          card.classList.add("stagger-item");
          card.style.animationDelay = `${200 + (index * 40)}ms`;
        }
        todayList.appendChild(card);
      });
    }
  }

  // 4. Subjects Summary
  const subSection = document.getElementById("dash-subjects-section");
  if (subSection) {
    if (subjects.length > 0) {
      const subjectMap = {};
      analyticsData.subjectBreakdown.forEach((s) => { subjectMap[s.id] = s; });
      let html = `
        <div class="section-header mb-sm" style="margin-top:var(--space-md)">
          <div class="section-title">Subjects</div>
          <button class="btn btn-sm btn-ghost ripple" id="btn-see-subjects">Manage</button>
        </div>
        <div class="subjects-grid" id="subject-summary-grid">
      `;
      subjects.slice(0, 4).forEach((sub, index) => {
        const data = subjectMap[sub.id] || { total: 0, completed: 0, rate: 0 };
        html += `
          <div class="subject-card ${isFirstLoad ? 'stagger-item' : ''}" style="--subject-color:${sub.color}; animation-delay:${250 + (index * 40)}ms" onclick="window._navTopic('${sub.id}', '${escHtml(sub.name)}')">
            <div class="subject-name">${escHtml(sub.name)}</div>
            <div class="subject-stats">${data.completed}/${data.total} tasks</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${data.rate}%"></div></div>
          </div>
        `;
      });
      html += `</div>`;
      subSection.innerHTML = html;
      document.getElementById("btn-see-subjects")?.addEventListener("click", () => navigate("subjects"));
    } else {
      subSection.innerHTML = "";
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
    <div class="task-body" style="flex:1;">
      <div class="task-title" style="word-break:break-word;">${escHtml(task.title)}</div>
      <div class="task-meta" style="margin-top:4px;">
        <span class="badge badge-${priority}">${priority}</span>
        ${due ? `<span class="task-due${isOverdue ? " overdue" : ""}" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="calendar" style="width:12px;height:12px"></i> ${formatDate(due)}</span>` : ""}
      </div>
    </div>
    <div class="task-actions" style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
      <button class="btn btn-sm ${isDone ? "btn-secondary" : "btn-primary"} task-check-btn" style="min-width:80px; justify-content:center; padding: 6px 12px;">
        <i data-lucide="${isDone ? "rotate-ccw" : "check"}" style="width:14px;height:14px;margin-right:4px;"></i> ${isDone ? "Undo" : "Done"}
      </button>
      <button class="btn btn-sm btn-danger task-delete-btn" style="padding: 6px 12px;" aria-label="Delete">
        <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
      </button>
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
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
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
