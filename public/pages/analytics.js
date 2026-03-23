// ============================================================
// pages/analytics.js — Analytics page without Chart.js (Insights Dashboard)
// ============================================================

import { computeAnalytics } from "../analytics.js";
import { getSubjects } from "../db.js";
import { escHtml } from "./dashboard.js";

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

  const hrs = Math.floor(stats.studyTime / 60);
  const mins = stats.studyTime % 60;
  const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

  content.innerHTML = `
    <!-- Weekly Summary Cards -->
    <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; margin-bottom:24px;">
      <div class="card" style="padding:16px; display:flex; flex-direction:column; gap:8px;">
        <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:600; letter-spacing:0.5px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="check-circle-2" style="width:14px;height:14px;"></i> Completion
        </div>
        <div style="font-size:28px; font-weight:700; color:var(--text-primary);">${stats.completionRate}%</div>
      </div>
      <div class="card" style="padding:16px; display:flex; flex-direction:column; gap:8px;">
        <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:600; letter-spacing:0.5px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="check-square" style="width:14px;height:14px;"></i> Tasks
        </div>
        <div style="font-size:28px; font-weight:700; color:var(--text-primary);">${stats.completed}</div>
      </div>
      <div class="card" style="padding:16px; display:flex; flex-direction:column; gap:8px;">
        <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:600; letter-spacing:0.5px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="x-circle" style="width:14px;height:14px;"></i> Overdue
        </div>
        <div style="font-size:28px; font-weight:700; color:${stats.overdue > 0 ? 'var(--error)' : 'var(--text-primary)'};">${stats.overdue}</div>
      </div>
      <div class="card" style="padding:16px; display:flex; flex-direction:column; gap:8px;">
        <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:600; letter-spacing:0.5px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="clock" style="width:14px;height:14px;"></i> Focus
        </div>
        <div style="font-size:28px; font-weight:700; color:var(--text-primary);">${timeStr}</div>
      </div>
    </div>

    <!-- AI Insights -->
    ${stats.insights && stats.insights.length > 0 ? `
    <div style="margin-bottom:24px;">
      <h3 style="font-size:14px; color:var(--text-secondary); margin-bottom:12px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Key Insights</h3>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${stats.insights.map(insight => `
          <div class="card" style="padding:14px 16px; display:flex; align-items:center; gap:12px;">
            <i data-lucide="zap" style="width:16px;height:16px;color:rgba(255,255,255,0.6);flex-shrink:0;"></i>
            <span style="font-size:14px; color:var(--text-primary); line-height:1.4;">${escHtml(insight)}</span>
          </div>
        `).join("")}
      </div>
    </div>
    ` : ""}

    <!-- Consistency Heatmap -->
    <div class="card mb-md" style="padding:20px;">
      <h3 style="font-size:14px; color:var(--text-secondary); margin-bottom:16px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600; display:flex; justify-content:space-between; align-items:center;">
        Consistency
        <span style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-primary); text-transform:none; font-weight:500;">
          <i data-lucide="flame" style="width:14px;height:14px;color:rgba(255,255,255,0.8);"></i> ${stats.streak} Day Streak
        </span>
      </h3>
      <div style="display:flex; flex-direction:row-reverse; overflow-x:auto; padding-bottom:8px; gap:4px; margin-right:-8px; padding-right:8px; align-items:flex-end;">
        <div style="display:grid; grid-template-rows: repeat(7, 1fr); gap:4px; grid-auto-flow: column; grid-auto-columns: 12px; direction:ltr;">
          ${stats.heatmapData.map(d => {
            let opacity = 0.02;
            if (d.count === 1) opacity = 0.2;
            else if (d.count === 2) opacity = 0.4;
            else if (d.count >= 3 && d.count <= 4) opacity = 0.6;
            else if (d.count >= 5) opacity = 0.9;
            return `<div style="width:12px; height:12px; border-radius:2px; background:rgba(255,255,255,${opacity}); transition:all 0.2s; cursor:pointer;" title="${d.count} tasks on ${d.date}" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></div>`;
          }).join("")}
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:11px; color:var(--text-muted);">
        <span>12 Weeks Ago</span>
        <span>Today</span>
      </div>
    </div>

    <!-- Focus Distribution -->
    ${stats.subjectBreakdown.length > 0 ? `
    <div class="card mb-md" style="padding:20px;">
      <h3 style="font-size:14px; color:var(--text-secondary); margin-bottom:20px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Focus Distribution</h3>
      <div style="display:flex; flex-direction:column; gap:16px;">
        ${stats.subjectBreakdown.map((sub) => `
          <div>
            <div class="flex justify-between mb-sm" style="align-items:center;">
              <span style="font-weight:600; font-size:14px; color:var(--text-primary);">${escHtml(sub.name)}</span>
              <span class="text-muted text-sm">${sub.completed}/${sub.total} · ${sub.rate}%</span>
            </div>
            <div class="progress-bar" style="height:6px; background:rgba(255,255,255,0.05);">
              <div class="progress-fill" style="width:${sub.rate}%; background:rgba(255,255,255,0.8);"></div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
    ` : ""}
  `;

  if (window.lucide) window.lucide.createIcons();
}
