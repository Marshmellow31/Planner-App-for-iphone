// ============================================================
// pages/scheduler.js — AI Task Scheduler
// ============================================================

import {
  getSchedulerTasks,
  createSchedulerTask,
  deleteSchedulerTask,
  getWeeklySchedule,
  saveWeeklySchedule,
  getGeneratedPlan,
  saveGeneratedPlan
} from "../db.js";
import { generateStudyPlan } from "../utils/taskScheduler.js";
import { showSnackbar } from "../snackbar.js";
import { escHtml } from "../js/utils.js";

let tasks = [];
let weeklySchedule = null;
let generatedPlan = null;
let unscheduled = [];

export async function renderSchedulerTab(container, uid, profile) {
  try {
    // Load initial data
    await reloadTasks(uid);
    weeklySchedule = await getWeeklySchedule(uid);
    const savedPlan = await getGeneratedPlan(uid);
    if (savedPlan) {
      generatedPlan = savedPlan.planByDay;
      unscheduled = savedPlan.unscheduledTasks;
      container.dataset.orderedLabels = JSON.stringify(savedPlan.orderedLabels || []);
      const date = savedPlan.updatedAt ? (savedPlan.updatedAt.toDate ? savedPlan.updatedAt.toDate() : new Date(savedPlan.updatedAt)) : null;
      container.dataset.generatedAt = date ? date.toLocaleString() : "";
    }
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes("permission")) {
      container.innerHTML = `
        <div class="card mb-xl" style="border-color:var(--error); background:rgba(153,51,51,0.05); margin-top:20px;">
          <h3 style="color:#F87171; margin-bottom:12px;"><i data-lucide="shield-alert" style="width:20px;height:20px;display:inline-block;vertical-align:middle;"></i> Permissions Missing</h3>
          <p style="color:var(--text-secondary); margin-bottom:12px; font-size:14px;">Scheduler features require updated Firestore rules.</p>
          <pre style="background:var(--bg-tertiary); padding:12px; border-radius:8px; color:var(--text-primary); font-size:12px; font-family:monospace; overflow-x:auto;">npm run deploy:rules</pre>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    throw err;
  }

  container.innerHTML = `
    <style>
      @keyframes slowSpin { 100% { transform: rotate(360deg); } }
      .icon-spin { animation: slowSpin 2s linear infinite; }
      .sched-section { margin-bottom: var(--space-xl); }
      .sched-card { 
        background: var(--bg-card); 
        border: 1px solid var(--border-subtle); 
        border-radius: var(--border-radius-lg); 
        padding: var(--space-lg);
        box-shadow: var(--shadow-sm);
      }
      .timeline-item {
        position: relative;
        padding-left: 24px;
        margin-bottom: 20px;
        border-left: 2px solid var(--border-active);
      }
      .timeline-item::before {
        content: '';
        position: absolute;
        left: -7px;
        top: 0;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--accent);
        box-shadow: 0 0 8px var(--accent);
      }
    </style>

    <div class="sched-section">
      <div class="section-header mb-md">
        <h3 class="section-title">Pending Tasks</h3>
        <button class="btn btn-sm btn-ghost ripple" id="btn-add-sched-task">
          <i data-lucide="plus" style="width:14px;height:14px;margin-right:4px;"></i> Add
        </button>
      </div>
      <div class="sched-card">
        <div id="scheduler-task-list"></div>
        
        <div style="margin-top:var(--space-md); display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <button class="btn btn-secondary btn-sm ripple" id="btn-manage-blocks" style="border-radius:var(--border-radius-md)">
            <i data-lucide="clock" style="width:14px;height:14px;margin-right:6px;"></i> Edit Schedule
          </button>
          <button class="btn btn-primary btn-sm ripple" id="btn-generate-plan" style="border-radius:var(--border-radius-md)">
            <i data-lucide="sparkles" style="width:14px;height:14px;margin-right:6px;"></i> Generate Plan
          </button>
        </div>
      </div>
    </div>

    <!-- Generated Plan View -->
    <div id="generated-plan-container"></div>
  `;

  // Init list
  renderTaskList(uid);
  renderPlanView();

  // Bind Generate Plan
  const genBtn = container.querySelector("#btn-generate-plan");
  if (genBtn) {
    genBtn.addEventListener("click", async () => {
      const originalText = genBtn.innerHTML;
      genBtn.innerHTML = `<i data-lucide="loader-2" class="icon-spin"></i> Processing...`;
      genBtn.disabled = true;
      
      try {
        const { allTasks } = await getUnifiedTasks(uid);
        tasks = allTasks;
        weeklySchedule = await getWeeklySchedule(uid);
        
        if (tasks.length === 0) {
          showSnackbar("No pending tasks to schedule.", "info");
          genBtn.innerHTML = originalText;
          genBtn.disabled = false;
          if (window.lucide) window.lucide.createIcons();
          return;
        }

        const { planByDay, unscheduledTasks, orderedLabels } = generateStudyPlan(tasks, weeklySchedule);
        generatedPlan = planByDay;
        unscheduled = unscheduledTasks;

        container.dataset.orderedLabels = JSON.stringify(orderedLabels);
        container.dataset.generatedAt = new Date().toLocaleString();

        await saveGeneratedPlan(uid, { 
          planByDay: generatedPlan, 
          unscheduledTasks: unscheduled,
          orderedLabels: orderedLabels
        });
        
        showSnackbar("AI Study Plan Generated!", "success");
        renderPlanView();
      } catch (err) {
        showSnackbar("Error generating plan.", "error");
      } finally {
        genBtn.innerHTML = originalText;
        genBtn.disabled = false;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Bind Manage Blocks
  container.querySelector("#btn-manage-blocks").addEventListener("click", () => {
    openWeeklyTimetableModal(uid, weeklySchedule, (newSched) => {
      weeklySchedule = newSched;
    });
  });

  // Bind Add Task
  container.querySelector("#btn-add-sched-task").addEventListener("click", () => {
    openAddTaskModal(uid, () => reloadTasks(uid));
  });

  if (window.lucide) window.lucide.createIcons();
}

async function getUnifiedTasks(uid) {
  const { getTasks } = await import("../db.js");
  const [schedTasks, mainTasks] = await Promise.all([
    getSchedulerTasks(uid),
    getTasks(uid, { isCompleted: false })
  ]);

  const formattedMain = mainTasks
    .filter(mt => mt.isScheduled && !schedTasks.some(st => st.sourceGoalTaskId === mt.sourceGoalTaskId && mt.sourceGoalTaskId))
    .map(mt => ({
      id: mt.id,
      title: mt.title,
      estimatedTime: mt.estimatedTime || 30,
      priority: mt.priority || "Medium",
      deadline: mt.dueDate ? (mt.dueDate.toDate ? mt.dueDate.toDate().toISOString().split("T")[0] : mt.dueDate) : null,
      isMainTask: true
    }));

  return { allTasks: [...schedTasks, ...formattedMain] };
}

async function reloadTasks(uid) {
  try {
    const { allTasks } = await getUnifiedTasks(uid);
    tasks = allTasks;
    renderTaskList(uid);
  } catch (err) {
    console.error(err);
    showSnackbar("Error refreshing tasks", "error");
  }
}

function renderTaskList(uid) {
  const listEl = document.getElementById("scheduler-task-list");
  if (!listEl) return;

  if (tasks.length === 0) {
    listEl.innerHTML = `
      <div style="color:var(--text-muted); font-size:13px; text-align:center; padding:24px 0;">
        <i data-lucide="inbox" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:0.3;"></i>
        Add tasks below to start planning.
      </div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  listEl.innerHTML = tasks.map((t, idx) => `
    <div class="list-item stagger-item" style="padding:12px 0; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; gap:12px; animation-delay:${idx*40}ms;">
      <div style="flex:1; min-width:0;">
        <div style="font-weight:600; font-size:14px; color:var(--text-primary); margin-bottom:4px; display:flex; align-items:center; gap:8px;">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escHtml(t.title)}</span>
          <span class="badge badge-${(t.priority || 'medium').toLowerCase()}" style="font-size:10px;">${t.priority || 'Medium'}</span>
        </div>
        <div style="display:flex; align-items:center; gap:12px; font-size:11px; color:var(--text-muted);">
          <div style="display:flex; align-items:center; gap:4px;">
            <i data-lucide="clock" style="width:12px;height:12px;"></i>
            <input type="number" class="sched-task-time-input" data-id="${t.id}" data-ismaintask="${!!t.isMainTask}" value="${t.estimatedTime}" style="width:36px; background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:4px; color:#fff; font-size:11px; text-align:center; padding:1px;" />
            <span>min</span>
          </div>
          ${t.deadline ? `<span style="display:flex; align-items:center; gap:4px;"><i data-lucide="calendar" style="width:12px;height:12px;"></i> ${t.deadline}</span>` : ''}
        </div>
      </div>
      <button class="btn-circle btn-ghost btn-del-sched-task ripple" data-id="${t.id}" data-ismaintask="${!!t.isMainTask}" style="color:var(--text-muted);">
        <i data-lucide="x" style="width:16px;height:16px;"></i>
      </button>
    </div>
  `).join("");

  listEl.querySelectorAll(".sched-task-time-input").forEach(input => {
    input.addEventListener("change", async () => {
      const val = parseInt(input.value, 10);
      if (isNaN(val) || val < 1) return;
      try {
        const { updateSchedulerTask, updateTask } = await import("../db.js");
        const id = input.dataset.id;
        if (input.dataset.ismaintask === "true") await updateTask(id, { estimatedTime: val });
        else await updateSchedulerTask(id, { estimatedTime: val });
        showSnackbar("Time updated", "success");
      } catch (err) { showSnackbar("Update failed", "error"); }
    });
  });

  listEl.querySelectorAll(".btn-del-sched-task").forEach(btn => {
    btn.onclick = async () => {
      const isMain = btn.dataset.ismaintask === "true";
      if (!confirm(`Remove ${isMain ? "from scheduler?" : "task?"}`)) return;
      if (isMain) {
        const { updateTask } = await import("../db.js");
        await updateTask(btn.dataset.id, { isScheduled: false });
      } else {
        await deleteSchedulerTask(btn.dataset.id);
      }
      reloadTasks(uid);
    };
  });

  if (window.lucide) window.lucide.createIcons();
}

function renderPlanView() {
  const tabContainer = document.getElementById("main-content");
  const container = document.getElementById("generated-plan-container");
  if (!container || !tabContainer || !generatedPlan) {
     if (container) container.innerHTML = "";
     return;
  }

  const generatedAt = tabContainer.dataset.generatedAt;
  let orderedLabels = [];
  try { orderedLabels = JSON.parse(tabContainer.dataset.orderedLabels || "[]"); } catch(e) {}

  let html = `
    <div class="section-header" style="margin-top:var(--space-xl)">
      <h3 class="section-title">AI Study Plan</h3>
      ${generatedAt ? `<span style="font-size:10px; color:var(--text-muted);">AS OF ${generatedAt}</span>` : ""}
    </div>
  `;

  if (unscheduled?.length > 0) {
    html += `
      <div class="card mb-lg" style="border:1px solid rgba(255,80,80,0.2); background:rgba(255,80,80,0.02);">
        <div style="font-weight:700; color:#ff8888; font-size:12px; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="alert-circle" style="width:14px;height:14px;"></i> UNSCHEDULED
        </div>
        ${unscheduled.map(t => `
          <div style="font-size:13px; color:var(--text-secondary); padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;">
            <span>${escHtml(t.title)}</span>
            <span style="color:#ff8888; font-weight:600;">+${t.remainingTimeUnscheduled}m</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  orderedLabels.forEach((label, idx) => {
    const dayPlan = generatedPlan[label];
    if (dayPlan?.length > 0) {
      html += `
        <div class="sched-section stagger-item" style="animation-delay:${idx*80}ms">
          <div style="font-weight:700; font-size:11px; letter-spacing:1px; color:var(--accent); text-transform:uppercase; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
            <i data-lucide="${label === 'Today' ? 'zap' : 'calendar'}" style="width:14px;height:14px;"></i> ${label}
          </div>
          <div class="sched-card" style="padding:16px;">
            ${dayPlan.map((block, bIdx) => `
              <div class="timeline-item" style="${bIdx === dayPlan.length - 1 ? 'margin-bottom:0; border-left:2px solid transparent;' : ''}">
                <div style="font-weight:600; color:var(--text-primary); font-size:14px; margin-bottom:4px;">${escHtml(block.taskTitle)}</div>
                <div style="font-size:12px; color:var(--text-muted); display:flex; gap:12px;">
                  <span style="display:flex; align-items:center; gap:4px;"><i data-lucide="clock" style="width:12px;height:12px;"></i> ${block.startTime} (${block.timeSpent}m)</span>
                  <span style="display:flex; align-items:center; gap:4px;"><i data-lucide="map-pin" style="width:12px;height:12px;"></i> ${escHtml(block.blockTitle)}</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }
  });

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

function openAddTaskModal(uid, onTaskAdded) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop centered";

  const tempDate = new Date();
  tempDate.setDate(tempDate.getDate() + 7);
  const futureDateStr = tempDate.toISOString().split("T")[0];

  backdrop.innerHTML = `
    <div class="drawer" style="max-width:400px; margin:0 auto;">
      <div class="drawer-handle"></div>
      <h3 class="modal-title">New AI Task</h3>
      
      <div class="form-group">
        <label class="form-label">Title</label>
        <input type="text" id="ai-task-title" class="form-input" placeholder="e.g. Study Chemistry Part 2" required />
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group">
          <label class="form-label">Duration (m)</label>
          <input type="number" id="ai-task-mins" class="form-input" value="60" step="15" />
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select id="ai-task-priority" class="form-select">
            <option value="High">High</option>
            <option value="Medium" selected>Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Deadline</label>
        <input type="date" id="ai-task-deadline" class="form-input" value="${futureDateStr}" />
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary ripple" id="ai-task-cancel">Cancel</button>
        <button class="btn btn-primary ripple" id="ai-task-save">Add Task</button>
      </div>
    </div>
  `;

  backdrop.querySelector("#ai-task-cancel").onclick = () => backdrop.remove();
  backdrop.onclick = (e) => { if(e.target === backdrop) backdrop.remove(); };

  backdrop.querySelector("#ai-task-save").onclick = async () => {
    const title = backdrop.querySelector("#ai-task-title").value.trim();
    if (!title) return showSnackbar("Title required", "error");

    try {
      await createSchedulerTask(uid, {
        title,
        estimatedTime: parseInt(backdrop.querySelector("#ai-task-mins").value, 10),
        priority: backdrop.querySelector("#ai-task-priority").value,
        deadline: backdrop.querySelector("#ai-task-deadline").value
      });
      showSnackbar("Task added!", "success");
      backdrop.remove();
      onTaskAdded();
    } catch (err) { showSnackbar("Failed to add", "error"); }
  };

  document.body.appendChild(backdrop);
}

function openWeeklyTimetableModal(uid, currentSchedule, onUpdate) {
  let localSchedule = JSON.parse(JSON.stringify(currentSchedule || {}));
  let selectedDay = "Monday";

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop centered";

  backdrop.innerHTML = `
    <div class="drawer" style="max-width:600px; margin:0 auto; height:80vh;">
      <div class="drawer-handle"></div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 class="modal-title">Availability</h3>
        <button class="btn-circle btn-ghost ripple" id="close-tt" style="margin-top:-10px"><i data-lucide="x"></i></button>
      </div>
      
      <div class="filter-row mb-md" id="tt-days" style="padding:4px 0;"></div>
      <div id="tt-list" style="flex:1; overflow-y:auto; margin-bottom:16px;"></div>

      <button class="btn btn-secondary ripple mb-md" id="tt-add" style="width:100%">
        <i data-lucide="plus" style="width:16px;height:16px;margin-right:6px"></i> Add Study Block
      </button>

      <button class="btn btn-primary ripple" id="tt-save" style="width:100%">Save Availability</button>
    </div>
  `;

  const renderTT = () => {
    const list = backdrop.querySelector("#tt-list");
    const blocks = localSchedule[selectedDay] || [];
    blocks.sort((a,b) => a.start_time.localeCompare(b.start_time));

    list.innerHTML = blocks.length === 0 ? `<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:13px;">No blocks for ${selectedDay}</div>` :
      blocks.map(b => `
        <div class="list-item" style="padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px;">
          <div>
            <div style="font-weight:600; font-size:14px;">${escHtml(b.title)}</div>
            <div style="font-size:11px; color:var(--text-muted);">${b.start_time} - ${b.end_time}</div>
          </div>
          <button class="btn-circle btn-ghost btn-del-tt" data-id="${b.id}" style="color:var(--error);"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
        </div>
      `).join("");
    
    list.querySelectorAll(".btn-del-tt").forEach(btn => {
      btn.onclick = () => {
        localSchedule[selectedDay] = localSchedule[selectedDay].filter(x => x.id !== btn.dataset.id);
        renderTT();
      };
    });
    if(window.lucide) window.lucide.createIcons();
  };

  const updateTTDays = () => {
    backdrop.querySelector("#tt-days").innerHTML = DAYS.map(d => `
      <button class="filter-chip ${d === selectedDay ? 'active' : ''}" data-day="${d}">${d.slice(0,3)}</button>
    `).join("");
    backdrop.querySelectorAll(".filter-chip").forEach(btn => {
      btn.onclick = () => { selectedDay = btn.dataset.day; updateTTDays(); renderTT(); };
    });
  };

  backdrop.querySelector("#close-tt").onclick = () => backdrop.remove();
  backdrop.querySelector("#tt-add").onclick = () => openAddBlockModal(selectedDay, (b) => {
    if(!localSchedule[selectedDay]) localSchedule[selectedDay] = [];
    localSchedule[selectedDay].push(b);
    renderTT();
  });

  backdrop.querySelector("#tt-save").onclick = async () => {
    const btn = backdrop.querySelector("#tt-save");
    btn.disabled = true; btn.textContent = "Saving...";
    try {
      await saveWeeklySchedule(uid, localSchedule);
      showSnackbar("Saved!", "success");
      onUpdate(localSchedule);
      backdrop.remove();
    } catch(e) { btn.disabled = false; btn.textContent = "Save"; }
  };

  document.body.appendChild(backdrop);
  updateTTDays(); renderTT();
}

function openAddBlockModal(day, onAdd) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop centered";
  backdrop.style.zIndex = "30001";

  backdrop.innerHTML = `
    <div class="drawer" style="max-width:350px; margin:0 auto;">
      <h3 class="modal-title">Block for ${day}</h3>
      <div class="form-group">
        <label class="form-label">Title</label>
        <input type="text" id="b-title" class="form-input" placeholder="e.g. Evening Study" value="Study Session" />
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group">
          <label class="form-label">Start</label>
          <input type="time" id="b-start" class="form-input" value="18:00" />
        </div>
        <div class="form-group">
          <label class="form-label">End</label>
          <input type="time" id="b-end" class="form-input" value="20:00" />
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary ripple" id="b-cancel">Cancel</button>
        <button class="btn btn-primary ripple" id="b-save">Add</button>
      </div>
    </div>
  `;
  backdrop.querySelector("#b-cancel").onclick = () => backdrop.remove();
  backdrop.querySelector("#b-save").onclick = () => {
    const title = backdrop.querySelector("#b-title").value.trim();
    const st = backdrop.querySelector("#b-start").value;
    const et = backdrop.querySelector("#b-end").value;
    if(!title || !st || !et) return;
    onAdd({ id: Math.random().toString(36).slice(2), title, start_time: st, end_time: et, type: "Study" });
    backdrop.remove();
  };
  document.body.appendChild(backdrop);
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
