// ============================================================
// pages/analytics.js — Analytics page with Chart.js charts
// ============================================================

import { computeAnalytics, buildDailyChart, buildSubjectDoughnut, buildWeeklyLine } from "../analytics.js";
import { getSubjects } from "../db.js";
import { chartBaseOptions } from "./dashboard.js";

export async function renderAnalytics(container, uid, profile) {
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Analytics</h1>
    </div>
    <div id="analytics-loading" class="animate-pulse text-muted text-sm">Crunching the numbers…</div>
    <div id="analytics-content" class="hidden"></div>
  `;

  const subjects = await getSubjects(uid);
  const stats = await computeAnalytics(uid, profile?.weekStartDay || "monday", subjects);

  document.getElementById("analytics-loading")?.remove();
  const content = document.getElementById("analytics-content");
  if (!content) return;
  content.classList.remove("hidden");

  // ── Streak banner ─────────────────────────────────────────
  content.innerHTML = `
    <div class="streak-banner mb-md">
      <div class="streak-icon">🔥</div>
      <div>
        <div class="streak-count">${stats.streak} day${stats.streak !== 1 ? "s" : ""}</div>
        <div class="text-muted text-sm">Study streak</div>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="stats-row mb-md">
      <div class="stat-card">
        <div class="stat-number">${stats.completed}</div>
        <div class="stat-label">Done this week</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.completionRate}%</div>
        <div class="stat-label">Completion</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.pending}</div>
        <div class="stat-label">Pending</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="${stats.overdue > 0 ? "color:var(--error)" : ""}">${stats.overdue}</div>
        <div class="stat-label">Overdue</div>
      </div>
    </div>

    <!-- Weekly line chart -->
    <div class="chart-container mb-md">
      <div class="chart-title">Weekly Completion Trend</div>
      <canvas id="chart-weekly" height="160"></canvas>
    </div>

    <!-- Daily bar chart -->
    <div class="chart-container mb-md">
      <div class="chart-title">Daily Tasks This Week</div>
      <canvas id="chart-daily" height="160"></canvas>
    </div>

    <!-- Subject doughnut -->
    ${subjects.length > 0 ? `
    <div class="chart-container mb-md">
      <div class="chart-title">Subject Distribution</div>
      <div style="max-width:260px;margin:0 auto">
        <canvas id="chart-subjects" height="260"></canvas>
      </div>
      <div id="subject-legend" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;justify-content:center"></div>
    </div>
    ` : ""}

    <!-- Per-subject progress -->
    ${stats.subjectBreakdown.length > 0 ? `
    <div class="card mb-md">
      <div class="chart-title mb-md">Subject Progress</div>
      ${stats.subjectBreakdown.map((sub) => `
        <div style="margin-bottom:14px">
          <div class="flex justify-between mb-sm">
            <span class="font-bold text-sm">${esc(sub.name)}</span>
            <span class="text-muted text-sm">${sub.completed}/${sub.total} · ${sub.rate}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${sub.rate}%;background:${sub.color}"></div>
          </div>
        </div>
      `).join("")}
    </div>
    ` : ""}
  `;

  // ── Render charts ──────────────────────────────────────────
  if (!window.Chart) return;

  // Weekly line
  const weeklyCtx = document.getElementById("chart-weekly");
  if (weeklyCtx) {
    new Chart(weeklyCtx, {
      type: "line",
      data: buildWeeklyLine(stats),
      options: { ...chartBaseOptions(), plugins: { ...chartBaseOptions().plugins, legend: { display: false } } },
    });
  }

  // Daily bar
  const dailyCtx = document.getElementById("chart-daily");
  if (dailyCtx) {
    new Chart(dailyCtx, {
      type: "bar",
      data: buildDailyChart(stats),
      options: {
        ...chartBaseOptions(),
        plugins: {
          ...chartBaseOptions().plugins,
          legend: { display: true, labels: { color: "#a0a0c0", font: { size: 12 } } },
        },
      },
    });
  }

  // Subjects doughnut
  const subCtx = document.getElementById("chart-subjects");
  if (subCtx && stats.subjectBreakdown.length > 0) {
    const dData = buildSubjectDoughnut(stats);
    new Chart(subCtx, {
      type: "doughnut",
      data: dData,
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1a1a2e",
            titleColor: "#f0f0ff",
            bodyColor: "#a0a0c0",
          },
        },
        cutout: "65%",
      },
    });

    // Custom legend
    const legend = document.getElementById("subject-legend");
    if (legend) {
      stats.subjectBreakdown.forEach((sub) => {
        const item = document.createElement("div");
        item.style.cssText = "display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary)";
        item.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${sub.color};flex-shrink:0"></span>${esc(sub.name)}`;
        legend.appendChild(item);
      });
    }
  }
}

function esc(s = "") {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
