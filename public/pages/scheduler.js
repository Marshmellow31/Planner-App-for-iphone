// ============================================================
// pages/scheduler.js — AI Task Scheduler
// ============================================================

import { 
  getSchedulerTasks, 
  createSchedulerTask, 
  deleteSchedulerTask,
  getWeeklySchedule,
  getGeneratedPlan,
  saveGeneratedPlan
} from "../db.js";
import { generateStudyPlan } from "../utils/taskScheduler.js";
import { showSnackbar } from "../snackbar.js";

// Escape HTML utility
const escHtml = (str) => {
  if (!str) return "";
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])
  );
};

let tasks = [];
let weeklySchedule = null;
let generatedPlan = null;
let unscheduled = [];

export async function renderSchedulerTab(container, uid, profile) {
  try {
    // Load initial data
    tasks = await getSchedulerTasks(uid);
    weeklySchedule = await getWeeklySchedule(uid);
    const savedPlan = await getGeneratedPlan(uid);
    if (savedPlan) {
      generatedPlan = savedPlan.planByDay;
      unscheduled = savedPlan.unscheduledTasks;
    }
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes("permission")) {
      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Smart Scheduler</h1>
        </div>
        <div class="card mb-xl" style="border-color:var(--error); background:rgba(153,51,51,0.05);">
          <h3 style="color:#F87171; margin-bottom:12px;"><i data-lucide="shield-alert" style="width:20px;height:20px;display:inline-block;vertical-align:middle;"></i> Database Permissions Missing</h3>
          <p style="color:var(--text-secondary); margin-bottom:12px; font-size:14px;">Your Firebase database doesn't have permission to use the new Scheduler features yet.</p>
          <p style="color:var(--text-secondary); font-size:14px;">Please deploy the updated <code>firestore.rules</code> file by running this in your terminal:</p>
          <pre style="background:#1A1A1A; padding:12px; border-radius:8px; margin-top:12px; color:#F5F5F5; font-size:13px; font-family:monospace; overflow-x:auto;">npm run deploy:rules</pre>
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
    </style>
    <div class="page-header">
      <h1 class="page-title">Smart Scheduler</h1>
      <button class="btn btn-sm btn-primary" id="btn-add-sched-task">
        <i data-lucide="plus" style="width:16px;height:16px;"></i> Add Task
      </button>
    </div>

    <div class="card mb-xl">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-md);">
        <h3 style="color:var(--text-primary); margin:0;">Pending Tasks</h3>
      </div>
      <div id="scheduler-task-list"></div>
      
      <div style="margin-top:var(--space-lg); display:flex; gap:12px;">
        <button class="btn btn-primary btn-full ripple" id="btn-generate-plan" style="background:#1A1A1A; border:1px solid #333;">
          <i data-lucide="sparkles"></i> Generate Study Plan
        </button>
      </div>
    </div>

    <!-- Generated Plan View -->
    <div id="generated-plan-container"></div>
  `;

  // Init list
  renderTaskList(uid);
  renderPlanView();

  // Bind Generate Plan
  container.querySelector("#btn-generate-plan").addEventListener("click", async () => {
    const btn = container.querySelector("#btn-generate-plan");
    btn.innerHTML = `<i data-lucide="loader-2" class="icon-spin"></i> Generating...`;
    
    // Refresh data right before generation
    tasks = await getSchedulerTasks(uid);
    weeklySchedule = await getWeeklySchedule(uid);
    
    if (tasks.length === 0) {
      showSnackbar("No pending tasks to schedule.", "info");
      btn.innerHTML = `<i data-lucide="sparkles"></i> Generate Study Plan`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const { planByDay, unscheduledTasks } = generateStudyPlan(tasks, weeklySchedule);
    generatedPlan = planByDay;
    unscheduled = unscheduledTasks;

    // Save plan
    await saveGeneratedPlan(uid, { planByDay: generatedPlan, unscheduledTasks: unscheduled });
    
    showSnackbar("Study Plan Generated successfully!", "success");
    renderPlanView();

    btn.innerHTML = `<i data-lucide="sparkles"></i> Generate Study Plan`;
    if (window.lucide) window.lucide.createIcons();
  });

  // Bind Add Task
  container.querySelector("#btn-add-sched-task").addEventListener("click", () => {
    openAddTaskModal(uid, () => {
      // callback on task added
      reloadTasks(uid);
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

async function reloadTasks(uid) {
  tasks = await getSchedulerTasks(uid);
  renderTaskList(uid);
}

function renderTaskList(uid) {
  const listEl = document.getElementById("scheduler-task-list");
  if (!listEl) return;

  if (tasks.length === 0) {
    listEl.innerHTML = `
      <div style="color:var(--text-muted); font-size:13px; font-style:italic; padding:12px 0;">
        No tasks added yet. Add tasks above to include them in your dynamic study plan.
      </div>`;
    return;
  }

  listEl.innerHTML = tasks.map(t => `
    <div class="task-card priority-${t.priority.toLowerCase()}" style="padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-weight:600; color:#F5F5F5;">${escHtml(t.title)} <span class="priority-label ${t.priority.toLowerCase()}" style="margin-left:8px;">${t.priority}</span></div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
          <i data-lucide="clock" style="width:12px;height:12px;display:inline;"></i> ${t.estimatedTime} mins
          ${t.deadline ? `<span style="margin-left:8px;"><i data-lucide="calendar" style="width:12px;height:12px;display:inline;"></i> Due: ${t.deadline}</span>` : ''}
        </div>
      </div>
      <div>
        <button class="btn btn-sm btn-ghost btn-del-sched-task" data-id="${t.id}" style="padding:6px; color:var(--error);">
          <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
        </button>
      </div>
    </div>
  `).join("");

  // Bind deletes
  listEl.querySelectorAll(".btn-del-sched-task").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Remove this target study task?")) return;
      await deleteSchedulerTask(btn.dataset.id);
      showSnackbar("Task removed", "success");
      reloadTasks(uid);
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

function renderPlanView() {
  const container = document.getElementById("generated-plan-container");
  if (!container) return;

  if (!generatedPlan) {
    container.innerHTML = "";
    return;
  }

  let html = `<h2 class="page-title" style="margin-bottom:var(--space-md); font-size:18px;">Your Generated Plan</h2>`;

  // Show Unscheduled if any
  if (unscheduled && unscheduled.length > 0) {
    html += `
      <div class="card mb-md" style="border-color:var(--error); background:rgba(153,51,51,0.05);">
        <h4 style="color:#F87171; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="alert-triangle" style="width:16px;height:16px;"></i> Unscheduled Tasks
        </h4>
        <div style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">These could not fit into your available study blocks. Consider freeing up more time or extending deadlines.</div>
        ${unscheduled.map(t => `
          <div style="padding:8px 12px; background:var(--bg-elevated); border:1px solid #3A1C1C; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-weight:600; font-size:14px;">${escHtml(t.title)}</div>
            <div style="font-size:12px; color:#FCA5A5; font-weight:600;">Missed ${t.remainingTimeUnscheduled}m</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  // Show Days
  const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  DAYS_ORDER.forEach(day => {
    const dayPlan = generatedPlan[day];
    if (dayPlan && dayPlan.length > 0) {
      html += `
        <div class="card mb-md">
          <h4 style="color:var(--text-primary); margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:8px; display:flex; align-items:center; gap:8px;">
            <i data-lucide="calendar-days" style="width:16px;height:16px;color:var(--accent);"></i> ${day}
          </h4>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${dayPlan.map(block => `
              <div style="display:flex; flex-direction:column; background:#1C1C1C; border-left:3px solid var(--priority-${block.priority.toLowerCase()}); padding:12px; border-radius:8px;">
                <div style="font-weight:600; color:#F5F5F5; font-size:14px;">${escHtml(block.taskTitle)}</div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px; display:flex; gap:12px; align-items:center;">
                  <span style="display:flex; align-items:center; gap:4px;"><i data-lucide="clock" style="width:12px;height:12px;"></i> ${block.startTime} - ${block.endTime} (${block.timeSpent}m)</span>
                  <span style="display:flex; align-items:center; gap:4px;"><i data-lucide="map-pin" style="width:12px;height:12px;"></i> ${escHtml(block.blockTitle)}</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }
  });

  const hasAnyScheduled = Object.values(generatedPlan).some(arr => arr.length > 0);
  if (!hasAnyScheduled && unscheduled && unscheduled.length === 0) {
    html += `<div style="text-align:center; color:var(--text-muted); padding:32px;">Schedule is completely empty.</div>`;
  } else if (!hasAnyScheduled && unscheduled && unscheduled.length > 0) {
    html += `<div style="text-align:center; color:var(--text-muted); padding:16px; border:1px dashed var(--border); border-radius:12px;">No tasks could be scheduled into your available Study blocks. Please edit your Schedule tab to add Study time.</div>`;
  }

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

function openAddTaskModal(uid, onTaskAdded) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop centered";

  // Default deadline to today + 7 days
  const tempDate = new Date();
  tempDate.setDate(tempDate.getDate() + 7);
  const futureDateStr = tempDate.toISOString().split("T")[0];

  backdrop.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <h3 class="modal-title">Add Scheduler Task</h3>
      
      <div class="form-group">
        <label class="form-label">Task Title</label>
        <input type="text" id="ai-task-title" class="form-input" placeholder="E.g., Read Chapter 4" required />
      </div>

      <div style="display:flex; gap:var(--space-md);">
        <div class="form-group" style="flex:1;">
          <label class="form-label">Est. Time (mins)</label>
          <input type="number" id="ai-task-mins" class="form-input" value="60" min="15" step="15" required />
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">Priority</label>
          <select id="ai-task-priority" class="form-select">
            <option value="Low">Low</option>
            <option value="Medium" selected>Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Deadline (Optional)</label>
        <input type="date" id="ai-task-deadline" class="form-input" value="${futureDateStr}" />
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" id="ai-task-cancel">Cancel</button>
        <button class="btn btn-primary" id="ai-task-save">Add</button>
      </div>
    </div>
  `;

  backdrop.querySelector("#ai-task-cancel").addEventListener("click", () => backdrop.remove());

  backdrop.querySelector("#ai-task-save").addEventListener("click", async () => {
    const btn = backdrop.querySelector("#ai-task-save");
    btn.disabled = true;
    btn.textContent = "Saving...";

    const title = backdrop.querySelector("#ai-task-title").value.trim();
    const estimatedTime = backdrop.querySelector("#ai-task-mins").value;
    const priority = backdrop.querySelector("#ai-task-priority").value;
    const deadline = backdrop.querySelector("#ai-task-deadline").value;

    if (!title || !estimatedTime) {
      showSnackbar("Title and estimated time are required.", "error");
      btn.disabled = false;
      btn.textContent = "Add";
      return;
    }

    try {
      await createSchedulerTask(uid, {
        title,
        estimatedTime,
        priority,
        deadline
      });
      showSnackbar("Task added successfully", "success");
      backdrop.remove();
      if (onTaskAdded) onTaskAdded();
    } catch (err) {
      showSnackbar("Error adding task", "error");
      console.error(err);
      btn.disabled = false;
      btn.textContent = "Add";
    }
  });

  document.body.appendChild(backdrop);
  setTimeout(() => backdrop.querySelector("#ai-task-title").focus(), 100);
}
