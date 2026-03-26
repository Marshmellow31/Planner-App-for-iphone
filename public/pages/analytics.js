import { computeAnalytics } from "../analytics.js";
import { getSubjects } from "../db.js";
import { escHtml } from "../js/utils.js";
import { cacheManager } from "../utils/cacheManager.js";

export async function renderAnalytics(container, uid, profile, initialData = null) {
  // 1. Initial Structure
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Analytics</h1>
    </div>
    <div id="analytics-loading" class="${initialData ? 'hidden' : 'animate-pulse text-muted text-sm'}">Crunching the numbers…</div>
    <div id="analytics-content" class="${initialData ? '' : 'hidden'}"></div>
  `;

  const content = document.getElementById("analytics-content");

  // 2. Immediate Render if cache exists
  if (initialData) {
    console.log("[Analytics] SWR: Rendering from cache");
    renderAnalyticsHtml(content, initialData);
  }

  // 3. Background Revalidation
  const updateAnalyticsState = async (isFirstLoad = false) => {
    try {
      const topics = await getSubjects(uid);
      const stats = await computeAnalytics(uid, profile?.weekStartDay || "monday", topics);
      
      const cacheKey = `analytics_${uid}`;
      const oldCache = cacheManager.get(cacheKey);
      
      const hasChanged = !oldCache || JSON.stringify(stats) !== JSON.stringify(oldCache);
      
      if (hasChanged || isFirstLoad) {
        console.log("[Analytics] Data changed or first load, updating UI");
        document.getElementById("analytics-loading")?.remove();
        content.classList.remove("hidden");
        renderAnalyticsHtml(content, stats);
        cacheManager.set(cacheKey, stats);
      } else {
        console.log("[Analytics] Data unchanged, skipping UI update");
        document.getElementById("analytics-loading")?.remove();
        content.classList.remove("hidden");
      }
    } catch (err) {
      console.error("Analytics update error:", err);
      if (!initialData) {
        container.innerHTML += `<div class="error-state">Failed to load analytics.</div>`;
      }
    }
  };

  requestAnimationFrame(() => {
    updateAnalyticsState(!initialData);
  });

  return { cleanup: () => {} };
}

function renderAnalyticsHtml(content, stats) {
  if (!content) return;

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
        <div style="font-size:28px; font-weight:700; color:var(--text-primary);">${stats.completionRate || 0}%</div>
      </div>
      <div class="card" style="padding:16px; display:flex; flex-direction:column; gap:8px;">
        <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:600; letter-spacing:0.5px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="check-square" style="width:14px;height:14px;"></i> Tasks
        </div>
        <div style="font-size:28px; font-weight:700; color:var(--text-primary);">${stats.completed || 0}</div>
      </div>
      <div class="card" style="padding:16px; display:flex; flex-direction:column; gap:8px;">
        <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:600; letter-spacing:0.5px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="x-circle" style="width:14px;height:14px;"></i> Overdue
        </div>
        <div style="font-size:28px; font-weight:700; color:${stats.overdue > 0 ? 'var(--error)' : 'var(--text-primary)'};">${stats.overdue || 0}</div>
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
            <i data-lucide="zap" style="width:16px;height:16px;color:var(--text-muted);flex-shrink:0;"></i>
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
          <i data-lucide="flame" style="width:14px;height:14px;color:var(--accent);"></i> ${stats.streak || 0} Day Streak
        </span>
      </h3>
      <div style="display:flex; flex-direction:row-reverse; overflow-x:auto; padding-bottom:8px; gap:4px; margin-right:-8px; padding-right:8px; align-items:flex-end;">
        <div style="display:grid; grid-template-rows: repeat(7, 1fr); gap:4px; grid-auto-flow: column; grid-auto-columns: 12px; direction:ltr;">
          ${(stats.heatmapData || []).map(d => {
            let color = 'var(--heatmap-0)';
            if (d.count === 1) color = 'var(--heatmap-1)';
            else if (d.count === 2) color = 'var(--heatmap-2)';
            else if (d.count >= 3 && d.count <= 4) color = 'var(--heatmap-3)';
            else if (d.count >= 5) color = 'var(--heatmap-4)';
            return `<div style="width:12px; height:12px; border-radius:2px; background:${color}; transition:all 0.2s; cursor:pointer;" title="${d.count} tasks on ${d.date}" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></div>`;
          }).join("")}
        </div>
      </div>
      <div style="margin-top:16px; display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted);">
          <span>24 Weeks Ago</span>
          <span>Today</span>
        </div>
        <div style="display:flex; justify-content:flex-end; align-items:center; gap:6px; font-size:10px; color:var(--text-muted);">
          <span>Less</span>
          <div style="display:flex; gap:3px;">
            <div style="width:10px; height:10px; border-radius:2px; background:var(--heatmap-0);"></div>
            <div style="width:10px; height:10px; border-radius:2px; background:var(--heatmap-1);"></div>
            <div style="width:10px; height:10px; border-radius:2px; background:var(--heatmap-2);"></div>
            <div style="width:10px; height:10px; border-radius:2px; background:var(--heatmap-3);"></div>
            <div style="width:10px; height:10px; border-radius:2px; background:var(--heatmap-4);"></div>
          </div>
          <span>More</span>
        </div>
      </div>
    </div>

    <!-- Focus Distribution -->
    ${stats.topicBreakdown && stats.topicBreakdown.length > 0 ? `
    <div class="card mb-md" style="padding:20px;">
      <h3 style="font-size:14px; color:var(--text-secondary); margin-bottom:20px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Focus Distribution</h3>
      <div style="display:flex; flex-direction:column; gap:16px;">
        ${stats.topicBreakdown.map((sub) => `
          <div>
            <div class="flex justify-between mb-sm" style="align-items:center;">
              <span style="font-weight:600; font-size:14px; color:var(--text-primary);">${escHtml(sub.name)}</span>
              <span class="text-muted text-sm">${sub.completed}/${sub.total} · ${sub.rate}%</span>
            </div>
            <div class="progress-bar" style="height:6px; background:var(--bg-card-hover);">
              <div class="progress-fill" style="width:${sub.rate}%; background:rgba(var(--text-primary-rgb), 0.8);"></div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
    ` : ""}
  `;

  if (window.lucide) window.lucide.createIcons({ nodes: content.querySelectorAll('[data-lucide]') });
}
