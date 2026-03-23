// ============================================================
// pages/schedule.js — Weekly Planner Page
// ============================================================

import { getWeeklySchedule, saveWeeklySchedule } from "../db.js";
import { showSnackbar } from "../snackbar.js";
import { escHtml } from "./dashboard.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORTS = ["M", "T", "W", "T", "F", "S", "S"];

let scheduleData = null;
let selectedDay = "Monday";

function getTodayString() {
  const d = new Date().getDay();
  // JS getDay: 0 = Sun, 1 = Mon ... 6 = Sat
  // Our array: 0 = Mon ... 6 = Sun
  const adjusted = d === 0 ? 6 : d - 1;
  return DAYS[adjusted];
}

export async function renderSchedule(container, uid) {
  if (!scheduleData) {
    scheduleData = await getWeeklySchedule(uid);
  }
  
  if (!selectedDay) {
    selectedDay = getTodayString();
  }

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Weekly Schedule</h1>
    </div>

    <!-- Day Selector -->
    <div class="filter-bar mb-md" id="schedule-days-bar">
      ${DAYS.map((day, i) => `
        <button class="filter-chip ${day === selectedDay ? "active" : "ripple"}" data-day="${day}">
          ${DAY_SHORTS[i]} — ${day}
        </button>
      `).join("")}
    </div>

    <!-- Task List -->
    <div id="schedule-list" class="mb-xl"></div>

    <!-- Floating Action Button specifically for Schedule -->
    <button class="fab ripple" id="fab-add-schedule" aria-label="Add Schedule"><i data-lucide="plus"></i></button>
  `;

  // Attach event listeners for day selector
  const daysBar = document.getElementById("schedule-days-bar");
  daysBar.querySelectorAll(".filter-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedDay = btn.dataset.day;
      // Update UI active state
      daysBar.querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active", "ripple"));
      btn.classList.add("active");
      // Re-render list
      renderScheduleList(uid);
    });
  });

  // FAB Event
  document.getElementById("fab-add-schedule").addEventListener("click", () => {
    openScheduleModal(uid, null);
  });

  renderScheduleList(uid);
}

function renderScheduleList(uid) {
  const listEl = document.getElementById("schedule-list");
  let dayTasks = scheduleData[selectedDay] || [];

  // Sort by start_time
  dayTasks.sort((a, b) => a.start_time.localeCompare(b.start_time));

  if (dayTasks.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="calendar" style="width:48px;height:48px;opacity:0.5"></i></div>
        <div class="empty-title">No tasks scheduled</div>
        <div class="empty-desc">Enjoy your day or add something above.</div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  listEl.innerHTML = dayTasks.map((task, i) => `
    <div class="task-card" style="animation-delay:${i * 40}ms; cursor:default; border-color:var(--border);">
      <div class="task-top-section">
        <div class="task-actions" style="display:flex; gap:8px;">
          <button class="btn btn-sm btn-ghost btn-edit-sched" data-id="${task.id}" style="padding: 4px 10px;">
            <i data-lucide="edit-2" style="width:14px;height:14px;"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-del-sched" data-id="${task.id}" style="padding: 4px 10px;">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
          </button>
        </div>
      </div>
      <div class="task-main-section">
        <div class="task-title">${escHtml(task.title)}</div>
        <div class="task-meta">
          <span class="task-due" style="display:inline-flex;align-items:center;gap:4px;color:#9CA3AF">
            <i data-lucide="clock" style="width:12px;height:12px"></i> 
            ${task.start_time} - ${task.end_time}
          </span>
          <span style="font-size:11px; padding:2px 6px; border-radius:4px; background:var(--bg-secondary); color:var(--text-secondary); margin-left:8px;">
            ${task.type || "Study"}
          </span>
        </div>
      </div>
    </div>
  `).join("");

  listEl.querySelectorAll(".btn-edit-sched").forEach(btn => {
    btn.addEventListener("click", () => {
      const t = dayTasks.find(x => x.id === btn.dataset.id);
      if (t) openScheduleModal(uid, t);
    });
  });

  listEl.querySelectorAll(".btn-del-sched").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Remove this scheduled task?")) return;
      scheduleData[selectedDay] = scheduleData[selectedDay].filter(x => x.id !== btn.dataset.id);
      
      try {
        await saveWeeklySchedule(uid, scheduleData);
        renderScheduleList(uid);
        showSnackbar("Removed successfully", "success");
      } catch (err) {
        showSnackbar("Failed to remove task.", "error");
      }
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

function openScheduleModal(uid, editingTask = null) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop centered";
  const defaultDay = selectedDay;

  const t = editingTask || { title: "", start_time: "09:00", end_time: "10:00", type: "Study", day: defaultDay };
  const taskDay = editingTask ? selectedDay : defaultDay;

  backdrop.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <h3 class="modal-title">${editingTask ? "Edit Schedule" : "Add to Schedule"}</h3>
      
      <div class="form-group">
        <label class="form-label">Day</label>
        <select id="sched-day" class="form-select">
          ${DAYS.map(day => `<option value="${day}" ${day === taskDay ? "selected" : ""}>${day}</option>`).join("")}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Task Title</label>
        <input type="text" id="sched-title" class="form-input" value="${escHtml(t.title)}" placeholder="E.g., Math Study Session" required />
      </div>

      <div style="display:flex; gap:var(--space-md);">
        <div class="form-group" style="flex:1;">
          <label class="form-label">Start Time</label>
          <input type="time" id="sched-start" class="form-input" value="${t.start_time}" required />
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">End Time</label>
          <input type="time" id="sched-end" class="form-input" value="${t.end_time}" required />
        </div>
      </div>



      <div class="form-group">
        <label class="form-label">Type</label>
        <select id="sched-type" class="form-select">
          <option value="Study" ${(!t.type || t.type === "Study") ? "selected" : ""}>Study</option>
          <option value="Free" ${t.type === "Free" ? "selected" : ""}>Free Time</option>
          <option value="Busy" ${t.type === "Busy" ? "selected" : ""}>Busy / Unavailable</option>
        </select>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" id="sched-cancel">Cancel</button>
        <button class="btn btn-primary" id="sched-save">${editingTask ? "Save" : "Add"}</button>
      </div>
    </div>
  `;

  backdrop.querySelector("#sched-cancel").addEventListener("click", () => backdrop.remove());

  backdrop.querySelector("#sched-save").addEventListener("click", async () => {
    const title = backdrop.querySelector("#sched-title").value.trim();
    const day = backdrop.querySelector("#sched-day").value;
    const start_time = backdrop.querySelector("#sched-start").value;
    const end_time = backdrop.querySelector("#sched-end").value;
    const type = backdrop.querySelector("#sched-type").value;

    if (!title || !start_time || !end_time) {
      showSnackbar("Please fill all fields.", "error");
      return;
    }

    if (start_time >= end_time) {
      showSnackbar("Start time must be before end time.", "error");
      return;
    }

    const newTask = {
      id: editingTask ? editingTask.id : Date.now().toString(36) + Math.random().toString(36).substring(2),
      title,
      start_time,
      end_time,
      type
    };

    // Remove from old day if edited and day changed
    if (editingTask && taskDay !== day) {
      scheduleData[taskDay] = scheduleData[taskDay].filter(x => x.id !== editingTask.id);
    } else if (editingTask) {
      // Remove old instance
      scheduleData[taskDay] = scheduleData[taskDay].filter(x => x.id !== editingTask.id);
    }

    scheduleData[day].push(newTask);

    try {
      await saveWeeklySchedule(uid, scheduleData);
      backdrop.remove();
      // If we are currently viewing the day that was modified, re-render
      if (selectedDay === day || (editingTask && taskDay === selectedDay)) {
         renderScheduleList(uid);
      }
      showSnackbar("Schedule updated", "success");
    } catch (e) {
      showSnackbar("Failed to update schedule.", "error");
      console.error(e);
    }
  });

  document.body.appendChild(backdrop);
  setTimeout(() => backdrop.querySelector("#sched-title").focus(), 100);
}
