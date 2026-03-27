import {
  getGoals,
  getGoalTasks,
  updateGoal,
  deleteGoal,
  deleteGoalTask,
  updateGoalTask,
  getSubjects,
} from "../db.js";
import {
  createGoal,
  calculateDailyTarget,
  calculateEndDate,
  daysRemaining,
  progressPercent,
  checkGoalCompletion,
  pauseGoal,
  resumeGoal,
  deleteGoalWithTasks,
  CATEGORY_META,
  UNIT_OPTIONS,
  getCustomCategories,
  saveCustomCategory,
  getCustomUnits,
  saveCustomUnit
} from "../utils/personalDevelopment.js";
import { autoGenerateTodaysTasks, effectiveTodayStr } from "../utils/dailyGenerator.js";
import { pushToScheduler, pushAllPendingGoalTasks } from "../utils/schedulerIntegration.js";
import { showSnackbar } from "../snackbar.js";
import { escHtml } from "../js/utils.js";
import { cacheManager } from "../utils/cacheManager.js";

// Module-level state
let _uid = null;
let _goals = [];
let _goalTasks = [];
let _topics = [];

// ─── Main Renderer ──────────────────────────────────────────
export async function renderPersonalDevelopment(container, uid, profile, initialData = null) {
  _uid = uid;

  // 1. SWR: Populate from cache if available
  if (initialData) {
    console.log("[PD] SWR: Loading from cache");
    _goals = initialData.goals || [];
    _goalTasks = initialData.goalTasks || [];
    _topics = initialData.topics || [];
  }

  container.innerHTML = `
    <style>
      /* ── Personal Development Tab Styles ── */
      .pd-page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 0 8px;
        margin-bottom: 16px;
      }
      .pd-page-title {
        font-size: 22px;
        font-weight: 800;
        color: var(--text-primary);
      }
      .pd-subtitle {
        font-size: 13px;
        color: var(--text-muted);
        margin-bottom: 20px;
        margin-top: -8px;
      }

      /* ── Goal Cards ── */
      .goal-card {
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--border-radius);
        padding: 18px;
        margin-bottom: 14px;
        position: relative;
        overflow: hidden;
        transition: all 0.22s ease;
      }
      .goal-card:hover { background: var(--bg-card-hover); border-color: var(--border-active); transform: translateY(-1px); }
      .goal-card.completed-card { opacity: 0.65; }

      .goal-card-accent {
        display: none;
      }

      .goal-card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .goal-card-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--text-primary);
        line-height: 1.3;
        flex: 1;
        margin-right: 8px;
        word-break: break-word;
      }
      .goal-card-actions {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }
      .goal-icon-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--bg-base);
        border: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--text-muted);
        transition: all 0.18s;
        flex-shrink: 0;
      }
      .goal-icon-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); border-color: var(--border-active); }
      .goal-icon-btn.danger:hover { background: rgba(var(--text-primary-rgb), 0.05); color: var(--error); border-color: var(--error); }

      .goal-category-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 14px;
        flex-wrap: wrap;
      }
      .goal-category-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        border: 1px solid transparent;
      }
      .goal-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.4px;
        text-transform: uppercase;
      }
      .goal-status-active   { background: rgba(var(--text-primary-rgb), 0.03); color: var(--text-secondary); border: 1px solid var(--border); }
      .goal-status-paused   { background: var(--bg-card-subtle);  color: var(--text-muted); border: 1px solid var(--border-subtle); }
      .goal-status-completed{ background: var(--bg-card-hover);  color: var(--text-primary); border: 1px solid var(--border-active); }

      /* ── Progress ── */
      .goal-progress-wrap { margin-bottom: 14px; }
      .goal-progress-label {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 6px;
      }
      .goal-progress-bar {
        width: 100%;
        height: 5px;
        background: var(--bg-card-subtle);
        border-radius: 999px;
        overflow: hidden;
      }
      .goal-progress-fill {
        height: 100%;
        border-radius: 999px;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* ── Stats row ── */
      .goal-stats-row {
        display: flex;
        gap: 0;
        background: var(--bg-elevated);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 14px;
      }
      .goal-stat {
        flex: 1;
        text-align: center;
        padding: 10px 0;
        border-right: 1px solid var(--border-subtle);
      }
      .goal-stat:last-child { border-right: none; }
      .goal-stat-val {
        font-size: 16px;
        font-weight: 700;
        color: var(--text-primary);
        line-height: 1;
        margin-bottom: 3px;
      }
      .goal-stat-lbl {
        font-size: 10px;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* ── Auto-add toggle row ── */
      .goal-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: var(--bg-elevated);
        border: 1px solid var(--border-subtle);
        border-radius: 10px;
        margin-bottom: 10px;
      }
      .goal-toggle-label {
        font-size: 13px;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      /* Toggle switch - Modernized */
      .toggle-switch {
        position: relative;
        width: 44px;
        height: 24px;
      }
      .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .toggle-slider {
        position: absolute;
        inset: 0;
        background: rgba(255,255,255,0.1);
        border-radius: 999px;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid rgba(255,255,255,0.05);
      }
      .toggle-slider::before {
        content: "";
        position: absolute;
        width: 18px; height: 18px;
        left: 2px; top: 2px;
        background: #F5F5F5;
        border-radius: 50%;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      .toggle-switch input:checked + .toggle-slider { background: #10B981; border-color: #059669; }
      .toggle-switch input:checked + .toggle-slider::before {
        transform: translateX(20px);
      }

      /* ── Push button ── */
      .goal-push-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        border-radius: 8px;
        background: var(--bg-base);
        border: 1px solid var(--border);
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.18s;
        width: 100%;
        justify-content: center;
      }
      .goal-push-btn:hover { background: #1E2E1E; border-color: #34D399; color: #34D399; }
      .goal-push-btn:disabled { opacity: 0.45; cursor: not-allowed; }

      .completion-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: var(--bg-card-subtle);
        border: 1px solid var(--border-subtle);
        border-radius: 10px;
        margin-bottom: 10px;
      }
      .completion-banner-text {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
      }

      /* ── Today Tasks Section ── */
      .pd-section-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin: 24px 0 12px;
      }
      .goal-task-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        background: var(--bg-card-subtle);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        margin-bottom: 8px;
        transition: all 0.18s;
      }
      .goal-task-row:hover { border-color: #2A2A2A; }
      .goal-task-dot {
        width: 8px; height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .goal-task-title {
        flex: 1;
        font-size: 14px;
        color: var(--text-primary);
        font-weight: 500;
      }
      .goal-task-meta {
        font-size: 11px;
        color: var(--text-muted);
        text-align: right;
      }
      .goal-task-push-btn {
        padding: 5px 10px;
        border-radius: 7px;
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.08);
        color: var(--text-muted);
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.18s;
        white-space: nowrap;
      }
      .goal-task-push-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); color: #fff; }
      .goal-task-push-btn.scheduled { color: #cccccc; border-color: rgba(255,255,255,0.1); cursor: default; background: rgba(255,255,255,0.05); }

      /* ── Empty state ── */
      .pd-empty {
        text-align: center;
        padding: 48px 24px;
        color: var(--text-muted);
      }
      .pd-empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.5; }
      .pd-empty-title { font-size: 16px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
      .pd-empty-desc { font-size: 13px; line-height: 1.5; }

      /* ── Form modal overrides ── */
      .pd-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .pd-daily-preview {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        background: #0A1A14;
        border: 1px solid rgba(52,211,153,0.2);
        border-radius: 10px;
        margin-bottom: 16px;
        font-size: 13px;
        color: #34D399;
      }
      .pd-daily-preview strong { font-weight: 700; }

      /* ── Custom Hybrid Dropdown ── */
      .hd-wrap { position: relative; width: 100%; border-radius: 12px; }
      .hd-trigger {
        display: flex; align-items: center; justify-content: space-between;
        width: 100%; padding: 12px 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px; color: #ffffff; font-size: 14px; cursor: pointer; transition: all 0.2s;
      }
      .hd-trigger:hover { border-color: rgba(255,255,255,0.15); }
      .hd-trigger:focus { outline: none; border-color: rgba(255,255,255,0.2); }
      .hd-trigger-val { display: flex; align-items: center; gap: 8px; }
      .hd-menu {
        position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: #0f0f0f;
        border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; z-index: 50;
        box-shadow: 0 10px 30px rgba(0,0,0,0.4); max-height: 240px; overflow-y: auto;
        opacity: 0; visibility: hidden; transform: translateY(-4px); transition: all 0.2s ease;
      }
      .hd-wrap.open .hd-menu { opacity: 1; visibility: visible; transform: translateY(0); }
      .hd-option {
        display: flex; align-items: center; gap: 8px; padding: 10px 14px;
        color: #cccccc; font-size: 14px; cursor: pointer; transition: all 0.15s;
      }
      .hd-option:hover { background: rgba(255,255,255,0.05); color: #ffffff; }
      .hd-option.selected { background: rgba(255,255,255,0.08); color: #ffffff; }
      .hd-option-custom { border-top: 1px solid rgba(255,255,255,0.04); color: #aaaaaa; }
      .hd-input-wrap { display: none; width: 100%; position: relative; }
      .hd-input-wrap.active { display: block; animation: fadeIn 0.3s ease; }
      .hd-trigger.hidden { display: none; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .hd-custom-input {
        width: 100%; padding: 12px 14px; padding-right: 40px; background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; color: #ffffff; font-size: 14px; outline: none;
      }
      .hd-input-close {
        position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
        color: #A1A1A1; cursor: pointer;
      }
      .hd-input-close:hover { color: #FFF; }
    </style>

    <div style="margin-top:20px; margin-bottom:20px; display:flex; justify-content:flex-end;">
      <button class="btn btn-sm ripple" id="btn-add-goal-local" style="border-radius:var(--border-radius-full); background: rgba(var(--accent-rgb), 0.1); color:var(--accent); border:1px solid rgba(var(--accent-rgb), 0.3); padding:8px 20px; font-weight:700; display:flex; align-items:center; gap:8px;">
        <i data-lucide="plus" style="width:16px;height:16px;"></i> Add New Goal
      </button>
    </div>
    <div id="pd-goals-list" class="goals-grid"></div>

    <div id="pd-today-tasks-section"></div>
  `;

  /* Add goal handled globally, but keep a local secondary trigger for UX */
  container.querySelector("#btn-add-goal-local")?.addEventListener("click", () => {
    openGoalForm(uid, null, () => reloadAll(uid));
  });

  // Initial load + auto-generation
  if (!initialData) {
     reloadAll(uid);
  } else {
    // Initial paint from cache
    renderGoalsList(uid);
    renderTodayTasks(uid);
    // Background refresh
    requestAnimationFrame(() => {
        reloadAll(uid, true);
    });
  }

  if (window.lucide) window.lucide.createIcons();
  return { cleanup: () => {} };
}

// ─── Data reload ─────────────────────────────────────────────
async function reloadAll(uid, isBackground = false) {
  try {
    if (!isBackground) console.log("[PD] Fetching fresh data...");
    
    const [goals, gtasks, topics] = await Promise.all([
      getGoals(uid),
      getGoalTasks(uid),
      getSubjects(uid)
    ]);

    const cacheKey = `pd_${uid}`;
    const oldCache = cacheManager.get(cacheKey);
    const newData = { goals, goalTasks: gtasks, topics };

    const hasChanged = !oldCache || JSON.stringify(newData) !== JSON.stringify(oldCache);

    if (hasChanged || !isBackground) {
        _goals = goals;
        _goalTasks = gtasks;
        _topics = topics;
        
        // Use stagger only if not a background refresh
        renderGoalsList(uid, !isBackground);
        renderTodayTasks(uid, !isBackground);
        if (window.lucide) window.lucide.createIcons({ nodes: document.getElementById("main-content").querySelectorAll('[data-lucide]') });
        
        cacheManager.set(cacheKey, newData);
    }
  } catch (err) {
    console.error("PD: Failed to load data", err);
  }

  // Run auto-generation (catches missed days)
  if (_goals.length > 0) {
    try {
      await autoGenerateTodaysTasks(uid, _goals);
      // Re-fetch tasks after generation ONLY if it's the first render or something changed
      _goalTasks = await getGoalTasks(uid);
      renderGoalsList(uid, !isBackground);
      renderTodayTasks(uid, !isBackground);
    } catch (err) {
      console.error("PD: Auto-generation failed", err);
    }
  }
}

// ─── Goals List ──────────────────────────────────────────────
function renderGoalsList(uid, useStagger = true) {
  const container = document.getElementById("pd-goals-list");
  if (!container) return;

  if (_goals.length === 0) {
    container.innerHTML = `
      <div class="pd-empty stagger-item">
        <div class="pd-empty-icon"><i data-lucide="target" style="width:48px;height:48px;color:var(--accent);opacity:0.8"></i></div>
        <div class="pd-empty-title">No goals yet</div>
        <div class="pd-empty-desc">Add your first long-term goal and<br>the app will generate daily tasks for you.</div>
      </div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = _goals.map(goal => renderGoalCardHTML(goal)).join("");

  // Apply stagger if requested
  if (useStagger) {
    container.querySelectorAll(".goal-card").forEach((card, i) => {
      card.classList.add("stagger-item");
      card.style.animationDelay = `${i * 30}ms`;
    });
  }

  // Bind events for each goal card
  _goals.forEach(goal => {
    const card = document.getElementById(`goal-card-${goal.id}`);
    if (!card) return;

    // Auto-add toggle
    const toggle = card.querySelector(".goal-auto-toggle");
    if (toggle) {
      toggle.addEventListener("change", async () => {
        try {
          await updateGoal(goal.id, { autoAddDaily: toggle.checked });
          showSnackbar(toggle.checked ? "Auto-add enabled" : "Auto-add disabled", "success");
        } catch (err) {
          showSnackbar("Failed to update setting", "error");
        }
      });
    }

    // Pause / resume
    const pauseBtn = card.querySelector(".goal-pause-btn");
    if (pauseBtn) {
      pauseBtn.addEventListener("click", async () => {
        try {
          if (goal.status === "active") {
            await pauseGoal(goal.id);
            showSnackbar("Goal paused", "info");
          } else if (goal.status === "paused") {
            await resumeGoal(goal.id);
            showSnackbar("Goal resumed", "success");
          }
          await reloadAll(uid);
        } catch (err) {
          showSnackbar("Failed to update goal", "error");
        }
      });
    }

    // Delete
    const delBtn = card.querySelector(".goal-delete-btn");
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        if (!confirm(`Delete "${goal.title}"? This will not remove already-pushed scheduler tasks.`)) return;
        try {
          // Delete all goal tasks first
          const tasks = _goalTasks.filter(t => t.sourceGoalId === goal.id);
          await Promise.all(tasks.map(t => deleteGoalTask(t.id)));
          await deleteGoal(goal.id);
          showSnackbar("Goal deleted", "success");
          await reloadAll(uid);
        } catch (err) {
          showSnackbar("Failed to delete goal", "error");
        }
      });
    }

    // Push all to scheduler
    const pushBtn = card.querySelector(".goal-push-all-btn");
    if (pushBtn) {
      pushBtn.addEventListener("click", async () => {
        pushBtn.disabled = true;
        pushBtn.innerHTML = `<i data-lucide="loader" style="width:13px;height:13px;"></i> Pushing…`;
        if (window.lucide) window.lucide.createIcons();
        try {
          const myTasks = _goalTasks.filter(
            t => t.sourceGoalId === goal.id && t.status !== "completed"
          );
          await pushAllPendingGoalTasks(uid, myTasks);
          showSnackbar("Tasks pushed to Scheduler!", "success");
          await reloadAll(uid);
        } catch (err) {
          showSnackbar("Failed to push tasks", "error");
          pushBtn.disabled = false;
        }
      });
    }

    // Edit
    const editBtn = card.querySelector(".goal-edit-btn");
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        openGoalForm(uid, goal, async () => {
          await reloadAll(uid);
        });
      });
    }

    // Progress log
    const logBtn = card.querySelector(".goal-log-btn");
    if (logBtn) {
      logBtn.addEventListener("click", () => {
        openProgressModal(uid, goal, async () => {
          await reloadAll(uid);
        });
      });
    }
  });

  if (window.lucide) window.lucide.createIcons();
}

function renderGoalCardHTML(goal) {
  let meta = CATEGORY_META[String(goal.category).toLowerCase()];
  if (!meta) {
    const rawCat = goal.category || "Custom";
    const capCat = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
    meta = { ...CATEGORY_META.custom, label: capCat };
  }
  const pct = progressPercent(goal.totalProgress || 0, goal.totalTarget);
  const remaining = daysRemaining(goal.endDate);
  const today = effectiveTodayStr();
  const isCompleted = checkGoalCompletion(goal) || goal.status === "completed";
  const todayTask = _goalTasks.find(
    t => t.sourceGoalId === goal.id && t.date === today
  );

  const statusBadgeClass = {
    active: "goal-status-active",
    paused: "goal-status-paused",
    completed: "goal-status-completed",
  }[goal.status] || "goal-status-active";

  const statusLabel = {
    active: "Active",
    paused: "Paused",
    completed: "Completed",
  }[goal.status] || "Active";

  const pauseIcon = goal.status === "active" ? "pause" : "play";
  const pauseTitle = goal.status === "active" ? "Pause" : "Resume";

  return `
    <div class="goal-card ${isCompleted ? "completed-card" : ""}" id="goal-card-${goal.id}">
      <div class="goal-card-accent" style="background: ${meta.color};"></div>

      <div class="goal-card-header">
        <div class="goal-card-title">${escHtml(goal.title)}</div>
        <div class="goal-card-actions">
          ${goal.status !== "completed" ? `
            <button class="goal-icon-btn goal-log-btn" title="Log progress" aria-label="Log progress">
              <i data-lucide="plus-circle" style="width:14px;height:14px;"></i>
            </button>
            <button class="goal-icon-btn goal-pause-btn" title="${pauseTitle}" aria-label="${pauseTitle}">
              <i data-lucide="${pauseIcon}" style="width:14px;height:14px;"></i>
            </button>
          ` : ""}
          <button class="goal-icon-btn goal-edit-btn" title="Edit" aria-label="Edit">
            <i data-lucide="pencil" style="width:14px;height:14px;"></i>
          </button>
          <button class="goal-icon-btn danger goal-delete-btn" title="Delete" aria-label="Delete">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
          </button>
        </div>
      </div>

      <div class="goal-category-row">
        <span class="goal-category-badge" style="color:${meta.color}; border-color:${meta.color}40; background:${meta.color}12;">
          <i data-lucide="${meta.icon}" style="width:11px;height:11px;"></i>
          ${meta.label}
        </span>
        <span class="goal-status-badge ${statusBadgeClass}">${statusLabel}</span>
        ${goal.subjectId ? `
          <span class="goal-status-badge" style="background:rgba(255,255,255,0.05);color:var(--text-secondary);border:1px solid var(--border-subtle);">
            <i data-lucide="tag" style="width:10px;height:10px;"></i> ${escHtml(_topics.find(t => t.id === goal.subjectId)?.name || "Topic")}
          </span>
        ` : ""}
        ${todayTask ? `<span class="goal-status-badge" style="background:rgba(249,115,22,0.1);color:#FB923C;border:1px solid rgba(249,115,22,0.25);">
          <i data-lucide="zap" style="width:10px;height:10px;"></i> Today set
        </span>` : ""}
      </div>

      <div class="goal-progress-wrap">
        <div class="goal-progress-label">
          <span>${goal.totalProgress || 0} / ${goal.totalTarget} ${escHtml(goal.unit)}</span>
          <span style="font-weight:700; color:var(--text-primary);">${pct}%</span>
        </div>
        <div class="goal-progress-bar">
          <div class="goal-progress-fill" style="width:${pct}%; background:${meta.color};"></div>
        </div>
      </div>

      ${isCompleted ? `
        <div class="completion-banner">
          <span style="font-size:20px;">🏆</span>
          <div class="completion-banner-text">Goal Completed! Fantastic work.</div>
        </div>
      ` : ""}

      <div class="goal-stats-row">
        <div class="goal-stat">
          <div class="goal-stat-val">${goal.dailyTarget}</div>
          <div class="goal-stat-lbl">${escHtml(goal.unit)}/day</div>
        </div>
        <div class="goal-stat">
          <div class="goal-stat-val">${goal.durationDays}</div>
          <div class="goal-stat-lbl">Days total</div>
        </div>
        <div class="goal-stat">
          <div class="goal-stat-val">${remaining !== null ? (remaining < 0 ? "0" : remaining) : "—"}</div>
          <div class="goal-stat-lbl">Days left</div>
        </div>
        <div class="goal-stat">
          <div class="goal-stat-val" style="font-size:12px; color:${goal.priority === "high" ? "#FCA5A5" : goal.priority === "medium" ? "#FDE047" : "#86EFAC"}">
            ${goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
          </div>
          <div class="goal-stat-lbl">Priority</div>
        </div>
      </div>

      ${!isCompleted ? `
        <div class="goal-toggle-row">
          <span class="goal-toggle-label">
            <i data-lucide="zap" style="width:13px;height:13px;color:#FBBF24;"></i>
            Auto-add daily task
          </span>
          <label class="toggle-switch">
            <input type="checkbox" class="goal-auto-toggle" ${goal.autoAddDaily ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <button class="goal-push-all-btn goal-push-btn">
          <i data-lucide="send" style="width:13px;height:13px;"></i>
          Push to Scheduler
        </button>
      ` : ""}
    </div>
  `;
}

// ─── Today's Tasks Section ───────────────────────────────────
function renderTodayTasks(uid, useStagger = true) {
  const section = document.getElementById("pd-today-tasks-section");
  if (!section) return;

  const today = new Date().toISOString().split("T")[0];
  const todayTasks = _goalTasks.filter(t => t.date === today);

  if (todayTasks.length === 0) {
    section.innerHTML = "";
    return;
  }

  section.innerHTML = `
    <div class="pd-section-title">
      <i data-lucide="calendar-check" style="width:13px;height:13px;display:inline;"></i>
      Today's Generated Tasks
    </div>
    ${todayTasks.map(task => {
      const goal = _goals.find(g => g.id === task.sourceGoalId) || {};
      let meta = CATEGORY_META[String(goal.category).toLowerCase()];
      if (!meta) meta = CATEGORY_META.custom;
      const isScheduled = task.status === "scheduled" || !!task.schedulerTaskId;
      const isCompleted = task.status === "completed";
      return `
        <div class="goal-task-row ${useStagger ? 'stagger-item' : ''}" id="gtask-row-${task.id}">
          <div class="goal-task-dot" style="background:${meta.color};"></div>
          <div class="goal-task-title">${escHtml(task.title)}</div>
          <div class="goal-task-meta">${task.estimatedTime}m</div>
          ${isCompleted
            ? `<span class="goal-task-push-btn scheduled">✓ Done</span>`
            : isScheduled
              ? `<span class="goal-task-push-btn scheduled">✓ Scheduled</span>`
              : `<button class="goal-task-push-btn gtask-push-single" data-taskid="${task.id}">
                  Push →
                </button>`
          }
        </div>
      `;
    }).join("")}
  `;
  
  if (useStagger) {
    section.querySelectorAll(".goal-task-row").forEach((el, i) => {
      el.style.animationDelay = `${i * 20}ms`;
    });
  }

  // Bind single-task push buttons
  section.querySelectorAll(".gtask-push-single").forEach(btn => {
    btn.addEventListener("click", async () => {
      const taskId = btn.dataset.taskid;
      const goalTask = _goalTasks.find(t => t.id === taskId);
      if (!goalTask) return;
      btn.disabled = true;
      btn.textContent = "…";
      try {
        await pushToScheduler(uid, goalTask);
        showSnackbar("Task pushed to Scheduler!", "success");
        await reloadAll(uid);
      } catch (err) {
        showSnackbar("Failed to push task", "error");
        btn.disabled = false;
        btn.textContent = "Push →";
      }
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

// ─── Custom Hybrid Dropdown Helper ───────────────────────────
function attachHybridDropdown(containerId, optionsConfig) {
  const container = document.getElementById(containerId);
  if (!container) return () => {};

  const { isCategory, defaultVal, onChange, placeholder } = optionsConfig;
  
  let currentVal = defaultVal;
  let isInputMode = false;
  
  const getOpts = () => {
    if (isCategory) {
      const predefined = Object.entries(CATEGORY_META).filter(([k]) => k !== "custom").map(([k, v]) => ({ value: k, label: v.label, icon: v.icon }));
      const custom = getCustomCategories().map(c => ({ value: c, label: c, icon: "star" }));
      return [...predefined, ...custom];
    } else {
      const predefined = UNIT_OPTIONS.filter(u => u.value !== "custom");
      const custom = getCustomUnits().map(u => ({ value: u, label: u }));
      return [...predefined, ...custom];
    }
  };

  const render = () => {
    const opts = getOpts();
    const activeOpt = opts.find(o => String(o.value).toLowerCase() === String(currentVal).toLowerCase()) || { value: currentVal, label: currentVal, icon: isCategory ? "star" : "" };
    
    container.innerHTML = `
      <div class="hd-wrap" id="${containerId}-wrap">
        <div class="hd-trigger ${isInputMode ? 'hidden' : ''}" tabindex="0">
          <div class="hd-trigger-val">
            ${isCategory && activeOpt.icon ? `<i data-lucide="${activeOpt.icon}" style="width:14px;height:14px;"></i>` : ""}
            <span>${escHtml(activeOpt.label || placeholder)}</span>
          </div>
          <i data-lucide="chevron-down" style="width:14px;height:14px;color:#666;"></i>
        </div>
        <div class="hd-input-wrap ${isInputMode ? 'active' : ''}">
          <input type="text" class="hd-custom-input" placeholder="${placeholder}" value="${!opts.some(o => o.value === currentVal) && currentVal !== (isCategory?'custom':'sessions') ? escHtml(currentVal) : ""}" />
          <i data-lucide="x" class="hd-input-close" style="width:14px;height:14px;"></i>
        </div>
        <div class="hd-menu">
          ${opts.map(o => `
            <div class="hd-option ${String(o.value).toLowerCase() === String(currentVal).toLowerCase() ? 'selected' : ''}" data-val="${escHtml(o.value)}">
              ${isCategory && o.icon ? `<i data-lucide="${o.icon}" style="width:14px;height:14px;"></i>` : ""}
              ${escHtml(o.label)}
            </div>
          `).join("")}
          <div class="hd-option hd-option-custom" data-val="--trigger-custom--">
            <i data-lucide="edit-3" style="width:14px;height:14px;"></i> Custom...
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    
    const wrap = container.querySelector(".hd-wrap");
    const trigger = container.querySelector(".hd-trigger");
    const menu = container.querySelector(".hd-menu");
    const input = container.querySelector(".hd-custom-input");
    const closeBtn = container.querySelector(".hd-input-close");

    const outsideClick = (e) => {
      if (!wrap.contains(e.target)) {
        wrap.classList.remove("open");
        document.removeEventListener("click", outsideClick);
      }
    };

    trigger.addEventListener("click", () => {
      const isOpen = wrap.classList.contains("open");
      if (isOpen) {
        wrap.classList.remove("open");
        document.removeEventListener("click", outsideClick);
      } else {
        wrap.classList.add("open");
        setTimeout(() => document.addEventListener("click", outsideClick), 10);
      }
    });

    container.querySelectorAll(".hd-option").forEach(opt => {
      opt.addEventListener("click", () => {
        const val = opt.getAttribute("data-val");
        wrap.classList.remove("open");
        document.removeEventListener("click", outsideClick);
        
        if (val === "--trigger-custom--") {
          isInputMode = true;
          render();
          setTimeout(() => {
            const el = container.querySelector(".hd-custom-input");
            if (el) el.focus();
          }, 50);
        } else {
          currentVal = val;
          render();
          onChange(currentVal);
        }
      });
    });

    closeBtn.addEventListener("click", () => {
      isInputMode = false;
      render();
    });

    const commitInput = () => {
      const val = input.value.trim();
      if (val) {
        if (isCategory) saveCustomCategory(val);
        else saveCustomUnit(val);
        currentVal = val;
      }
      isInputMode = false;
      render();
      onChange(currentVal);
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); commitInput(); }
      if (e.key === "Escape") { isInputMode = false; render(); }
    });
    input.addEventListener("blur", () => {
      setTimeout(() => { if (isInputMode) commitInput(); }, 150);
    });
  };

  render();
  return () => currentVal;
}

// ─── Goal Form Modal ─────────────────────────────────────────
export async function openGoalForm(uid, existingGoal, onSave) {
  if (document.querySelector(".modal-backdrop")) return;
  const [topics] = await Promise.all([getSubjects(uid)]);
  _topics = topics;

  const isEdit = !!existingGoal;
  const today = new Date().toISOString().split("T")[0];

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const priorityOptions = ["high", "medium", "low"].map(p =>
    `<option value="${p}" ${(existingGoal?.priority || "medium") === p ? "selected" : ""}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`
  ).join("");

  backdrop.innerHTML = `
    <div class="drawer" style="max-width:480px;margin:0 auto;">
      <div class="drawer-handle"></div>
      <h3 class="modal-title">${isEdit ? "Edit Goal" : "New Goal"}</h3>

      <div class="form-group">
        <label class="form-label">Goal Title *</label>
        <input class="form-input" id="pd-goal-title" placeholder="e.g. LeetCode 250 Questions"
          value="${escHtml(existingGoal?.title || "")}" />
      </div>

      <div class="pd-form-grid">
        <div class="form-group">
          <label class="form-label">Category</label>
          <div id="pd-goal-category-container"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-select" id="pd-goal-priority">${priorityOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Task Time (mins)</label>
          <input class="form-input" type="number" id="pd-goal-task-duration" min="5" step="5"
            placeholder="30" value="${existingGoal?.defaultDuration || ""}" />
        </div>
        <div class="form-group">
          <label class="form-label">Linked Topic</label>
          <select class="form-select" id="pd-goal-topic">
            <option value="">— None —</option>
            ${topics.map(t => `<option value="${t.id}" ${existingGoal?.subjectId === t.id ? 'selected' : ''}>${escHtml(t.name)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="pd-form-grid">
        <div class="form-group">
          <label class="form-label">Total Target *</label>
          <input class="form-input" type="number" id="pd-goal-total" min="1"
            placeholder="250" value="${existingGoal?.totalTarget || ""}" />
        </div>
        <div class="form-group">
          <label class="form-label">Unit</label>
          <div id="pd-goal-unit-container"></div>
        </div>
      </div>

      <div class="pd-form-grid">
        <div class="form-group">
          <label class="form-label">Duration (days) *</label>
          <input class="form-input" type="number" id="pd-goal-duration" min="1"
            placeholder="90" value="${existingGoal?.durationDays || ""}" />
        </div>
        <div class="form-group">
          <label class="form-label">Start Date *</label>
          <input class="form-input" type="date" id="pd-goal-start"
            value="${existingGoal?.startDate || today}" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Daily Target (auto-calculated, editable)</label>
        <input class="form-input" type="number" id="pd-goal-daily" min="1"
          placeholder="Auto" value="${existingGoal?.dailyTarget || ""}" />
      </div>

      <div id="pd-daily-preview" class="pd-daily-preview" style="display:none;">
        <i data-lucide="zap" style="width:14px;height:14px;"></i>
        <span id="pd-daily-preview-text"></span>
      </div>

      <div class="goal-toggle-row" style="margin-bottom:16px;">
        <span class="goal-toggle-label">
          <i data-lucide="zap" style="width:13px;height:13px;color:#FBBF24;"></i>
          Auto-add daily task to Scheduler
        </span>
        <label class="toggle-switch">
          <input type="checkbox" id="pd-goal-auto" ${(existingGoal?.autoAddDaily !== false) ? "checked" : ""}>
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="form-group">
        <label class="form-label">Notes (optional)</label>
        <textarea class="form-input" id="pd-goal-notes" rows="2" placeholder="Any extra context…">${escHtml(existingGoal?.notes || "")}</textarea>
      </div>

      <div id="pd-form-err" class="form-error hidden"></div>

      <div class="modal-actions">
        <button class="btn btn-secondary ripple" id="pd-cancel">Cancel</button>
        <button class="btn btn-primary ripple" id="pd-save">${isEdit ? "Save Changes" : "Create Goal"}</button>
      </div>
    </div>
  `;

  let getCategoryVal = () => existingGoal?.category || "custom";
  let getUnitVal = () => existingGoal?.unit || "sessions";

  // Auto-calculate daily target preview
  const updatePreview = () => {
    const total = parseInt(backdrop.querySelector("#pd-goal-total").value, 10);
    const dur   = parseInt(backdrop.querySelector("#pd-goal-duration").value, 10);
    const dailyInput = backdrop.querySelector("#pd-goal-daily");
    const unit  = getUnitVal();
    const preview = backdrop.querySelector("#pd-daily-preview");
    const previewText = backdrop.querySelector("#pd-daily-preview-text");

    if (total > 0 && dur > 0) {
      const auto = calculateDailyTarget(total, dur);
      if (!dailyInput.value) dailyInput.value = auto;
      previewText.innerHTML = `Daily target: <strong>${dailyInput.value || auto} ${unit}</strong> for ${dur} days`;
      preview.style.display = "flex";
    } else {
      preview.style.display = "none";
    }
    if (window.lucide) window.lucide.createIcons();
  };

  ["#pd-goal-total", "#pd-goal-duration"].forEach(sel => {
    backdrop.querySelector(sel).addEventListener("input", () => {
      // Reset manual override when total/duration change
      backdrop.querySelector("#pd-goal-daily").value = "";
      updatePreview();
    });
  });
  backdrop.querySelector("#pd-goal-daily").addEventListener("input", updatePreview);

  // Trigger initial preview if editing
  if (isEdit) setTimeout(updatePreview, 50);

  backdrop.querySelector("#pd-cancel").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", e => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector("#pd-save").addEventListener("click", async () => {
    const errEl = backdrop.querySelector("#pd-form-err");
    errEl.classList.add("hidden");
    const saveBtn = backdrop.querySelector("#pd-save");
    saveBtn.disabled = true;
    saveBtn.textContent = isEdit ? "Saving…" : "Creating…";

    const rawData = {
      title: backdrop.querySelector("#pd-goal-title").value.trim(),
      category: getCategoryVal(),
      priority: backdrop.querySelector("#pd-goal-priority").value,
      totalTarget: backdrop.querySelector("#pd-goal-total").value,
      unit: getUnitVal(),
      durationDays: backdrop.querySelector("#pd-goal-duration").value,
      startDate: backdrop.querySelector("#pd-goal-start").value,
      dailyTarget: backdrop.querySelector("#pd-goal-daily").value,
      autoAddDaily: backdrop.querySelector("#pd-goal-auto").checked,
      defaultDuration: backdrop.querySelector("#pd-goal-task-duration").value,
      notes: backdrop.querySelector("#pd-goal-notes").value.trim(),
      subjectId: backdrop.querySelector("#pd-goal-topic").value || null,
    };

    try {
      if (isEdit) {
        const dailyTarget = parseInt(rawData.dailyTarget, 10) ||
          calculateDailyTarget(parseInt(rawData.totalTarget, 10), parseInt(rawData.durationDays, 10));
        const endDate = calculateEndDate(rawData.startDate, rawData.durationDays);
        await updateGoal(existingGoal.id, {
          ...rawData,
          totalTarget: parseInt(rawData.totalTarget, 10),
          durationDays: parseInt(rawData.durationDays, 10),
          dailyTarget,
          endDate,
        });
        showSnackbar("Goal updated!", "success");
      } else {
        await createGoal(uid, rawData);
        showSnackbar("Goal created! 🎯", "success");
      }
      backdrop.remove();
      if (onSave) await onSave();
    } catch (err) {
      errEl.textContent = err.message || "Failed to save goal. Try again.";
      errEl.classList.remove("hidden");
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? "Save Changes" : "Create Goal";
    }
  });

  document.body.appendChild(backdrop);
  
  getCategoryVal = attachHybridDropdown("pd-goal-category-container", {
    isCategory: true,
    defaultVal: existingGoal?.category || "custom",
    placeholder: "Enter custom category...",
    onChange: () => {}
  });

  getUnitVal = attachHybridDropdown("pd-goal-unit-container", {
    isCategory: false,
    defaultVal: existingGoal?.unit || "sessions",
    placeholder: "Enter custom unit...",
    onChange: updatePreview
  });

  if (window.lucide) window.lucide.createIcons();
  setTimeout(() => backdrop.querySelector("#pd-goal-title")?.focus(), 150);
}

// ─── Progress Log Modal ───────────────────────────────────────
function openProgressModal(uid, goal, onSave) {
  let meta = CATEGORY_META[String(goal.category).toLowerCase()];
  if (!meta) meta = CATEGORY_META.custom;
  const pct = progressPercent(goal.totalProgress || 0, goal.totalTarget);

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop centered";

  backdrop.innerHTML = `
    <div class="modal-box" style="max-width:360px;">
      <h3 class="modal-title">Log Progress</h3>
      <div style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">
        ${escHtml(goal.title)}
      </div>

      <div class="goal-progress-wrap" style="margin-bottom:16px;">
        <div class="goal-progress-label">
          <span>${goal.totalProgress || 0} / ${goal.totalTarget} ${escHtml(goal.unit)}</span>
          <span style="color:#F5F5F5;font-weight:700;">${pct}%</span>
        </div>
        <div class="goal-progress-bar">
          <div class="goal-progress-fill" style="width:${pct}%; background:${meta.color};"></div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Amount completed today</label>
        <input class="form-input" type="number" id="prog-amount" min="1"
          value="${goal.dailyTarget}" placeholder="${goal.dailyTarget}" />
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
          Unit: ${escHtml(goal.unit)}
        </div>
      </div>

      <div id="prog-err" class="form-error hidden"></div>

      <div class="modal-actions">
        <button class="btn btn-secondary" id="prog-cancel">Cancel</button>
        <button class="btn btn-primary" id="prog-save">Log</button>
      </div>
    </div>
  `;

  backdrop.querySelector("#prog-cancel").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", e => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector("#prog-save").addEventListener("click", async () => {
    const errEl = backdrop.querySelector("#prog-err");
    const amount = parseInt(backdrop.querySelector("#prog-amount").value, 10);
    if (!amount || amount <= 0) {
      errEl.textContent = "Please enter a valid amount.";
      errEl.classList.remove("hidden");
      return;
    }

    const saveBtn = backdrop.querySelector("#prog-save");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
      const newProgress = Math.min((goal.totalProgress || 0) + amount, goal.totalTarget);
      const isComplete = newProgress >= goal.totalTarget;
      await updateGoal(goal.id, {
        totalProgress: newProgress,
        status: isComplete ? "completed" : goal.status,
      });

      if (isComplete) {
        showSnackbar("🎉 Goal completed! Amazing work!", "success");
      } else {
        showSnackbar(`+${amount} ${goal.unit} logged!`, "success");
      }

      backdrop.remove();
      if (onSave) await onSave();
    } catch (err) {
      errEl.textContent = "Failed to log progress. Try again.";
      errEl.classList.remove("hidden");
      saveBtn.disabled = false;
      saveBtn.textContent = "Log";
    }
  });

  document.body.appendChild(backdrop);
  if (window.lucide) window.lucide.createIcons();
  setTimeout(() => backdrop.querySelector("#prog-amount")?.select(), 150);
}
