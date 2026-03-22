// ============================================================
// pages/dashboard.js — Dashboard page renderer
// ============================================================

import { getTasks, completeTask, snoozeTask } from "../db.js";
import { computeAnalytics, buildWeeklyLine } from "../analytics.js";
import { getSubjects } from "../db.js";
import { navigate } from "../app.js";

export async function renderDashboard(container, uid, profile) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="text-muted text-sm">${getGreeting()}</div>
        <h1 class="page-title" style="font-size:var(--font-size-2xl)">${profile?.displayName || "Student"} 👋</h1>
      </div>
    </div>
    <div id="dash-loading" class="animate-pulse text-muted text-sm mb-md">Loading your day…</div>
    <div id="dash-content" class="hidden"></div>
  `;

  const [subjects, stats] = await Promise.all([
    getSubjects(uid),
    computeAnalytics(uid, profile?.weekStartDay || "monday", []),
  ]);

  const analyticsData = await computeAnalytics(uid, profile?.weekStartDay || "monday", subjects);

  const el = document.getElementById("dash-loading");
  if (el) el.remove();
  const content = document.getElementById("dash-content");
  if (!content) return;
  content.classList.remove("hidden");

  // ── Stat cards ──────────────────────────────────────────────
  content.innerHTML = `
    <div class="stats-row mb-md">
      <div class="stat-card">
        <div class="stat-number">${analyticsData.completed}</div>
        <div class="stat-label">Done this week</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${analyticsData.completionRate}%</div>
        <div class="stat-label">Completion rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${analyticsData.streak}</div>
        <div class="stat-label">Day streak 🔥</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="${analyticsData.overdue > 0 ? 'color:var(--error)' : ''}">${analyticsData.overdue}</div>
        <div class="stat-label">Overdue</div>
      </div>
    </div>

    <!-- Weekly chart -->
    <div class="chart-container mb-md">
      <div class="chart-title">This Week's Progress</div>
      <canvas id="dash-chart" height="140"></canvas>
    </div>

    <!-- Today's tasks -->
    <div class="section-header mb-sm">
      <div class="section-title">Today's Tasks</div>
      <button class="btn btn-sm btn-ghost" id="btn-see-all-tasks">See all</button>
    </div>
    <div id="today-tasks-list"></div>

    <!-- Subject summary -->
    ${subjects.length > 0 ? `
    <div class="section-header mb-sm" style="margin-top:var(--space-md)">
      <div class="section-title">Subjects</div>
      <button class="btn btn-sm btn-ghost" id="btn-see-subjects">Manage</button>
    </div>
    <div class="subjects-grid" id="subject-summary-grid"></div>
    ` : ""}
  `;

  // Wire up "See all" and subject manage
  document.getElementById("btn-see-all-tasks")?.addEventListener("click", () => navigate("tasks"));
  document.getElementById("btn-see-subjects")?.addEventListener("click", () => navigate("subjects"));

  // ── Render today tasks ───────────────────────────────────────
  const todayList = document.getElementById("today-tasks-list");
  if (analyticsData.todayTasks.length === 0) {
    todayList.innerHTML = `
      <div class="empty-state" style="padding:var(--space-xl)">
        <div class="empty-icon">✨</div>
        <div class="empty-title">All clear today!</div>
        <div class="empty-desc">No tasks due today. Add one with the + button.</div>
      </div>`;
  } else {
    analyticsData.todayTasks.forEach((task) => {
      todayList.appendChild(buildTaskCard(task, uid, () => renderDashboard(container, uid, profile)));
    });
  }

  // ── Subject summary ──────────────────────────────────────────
  const subGrid = document.getElementById("subject-summary-grid");
  if (subGrid && subjects.length > 0) {
    const subjectMap = {};
    analyticsData.subjectBreakdown.forEach((s) => { subjectMap[s.id] = s; });

    subjects.slice(0, 4).forEach((sub) => {
      const data = subjectMap[sub.id] || { total: 0, completed: 0, rate: 0 };
      const card = document.createElement("div");
      card.className = "subject-card";
      card.style.setProperty("--subject-color", sub.color);
      card.innerHTML = `
        <div class="subject-name">${escHtml(sub.name)}</div>
        <div class="subject-stats">${data.completed}/${data.total} tasks</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${data.rate}%"></div></div>
      `;
      card.addEventListener("click", () => navigate("topics", { subjectId: sub.id, subjectName: sub.name }));
      subGrid.appendChild(card);
    });
  }

  // ── Weekly chart ─────────────────────────────────────────────
  const ctx = document.getElementById("dash-chart");
  if (ctx && window.Chart) {
    const { buildWeeklyLine } = await import("../analytics.js");
    new Chart(ctx, {
      type: "line",
      data: buildWeeklyLine(analyticsData),
      options: chartBaseOptions("Tasks Completed"),
    });
  }
}

// ── Build task card DOM element ───────────────────────────────
export function buildTaskCard(task, uid, onUpdate) {
  const card = document.createElement("div");
  const isDone = task.isCompleted;
  const priority = task.priority || "medium";
  const due = task.dueDate?.toDate ? task.dueDate.toDate() : (task.dueDate ? new Date(task.dueDate) : null);
  const isOverdue = due && due < new Date() && !isDone;

  card.className = `task-card priority-${priority}${isDone ? " completed" : ""}`;
  card.innerHTML = `
    <button class="task-check${isDone ? " done" : ""}" title="${isDone ? "Reopen" : "Mark complete"}">
      ${isDone ? "✓" : ""}
    </button>
    <div class="task-body">
      <div class="task-title">${escHtml(task.title)}</div>
      <div class="task-meta">
        <span class="badge badge-${priority}">${priority}</span>
        ${due ? `<span class="task-due${isOverdue ? " overdue" : ""}">📅 ${formatDate(due)}</span>` : ""}
      </div>
    </div>
    <div class="task-actions">
      <button class="btn-icon" style="font-size:14px;width:34px;height:34px" title="Delete">🗑</button>
    </div>
  `;

  card.querySelector(".task-check").addEventListener("click", async (e) => {
    e.stopPropagation();
    const { completeTask, reopenTask } = await import("../db.js");
    if (isDone) await reopenTask(task.id);
    else await completeTask(task.id);
    onUpdate();
  });

  card.querySelector(".btn-icon").addEventListener("click", async (e) => {
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
