// ============================================================
// pages/tasks.js — Tasks page with filters, sorting, CRUD
// ============================================================

import { getTasks, createTask, updateTask, deleteTask, completeTask, reopenTask, getSubjects, getTopics } from "../db.js";
import { escHtml, formatDate } from "./dashboard.js";
import { showSnackbar, showConfirmDialog } from "../snackbar.js";

const PRIORITIES = ["high", "medium", "low"];

export async function renderTasks(container, uid, profile) {
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">All Tasks</h1>
    </div>
    <!-- Filter chips -->
    <div class="filter-bar" id="task-filters">
      <button class="filter-chip active ripple" data-filter="all">All</button>
      <button class="filter-chip ripple" data-filter="today">Today</button>
      <button class="filter-chip ripple" data-filter="pending">Pending</button>
      <button class="filter-chip ripple" data-filter="completed">Completed</button>
      <button class="filter-chip ripple" data-filter="overdue">Overdue</button>
      <button class="filter-chip ripple" data-filter="high"><span class="priority-dot" style="background:var(--error)"></span> High</button>
      <button class="filter-chip ripple" data-filter="medium"><span class="priority-dot" style="background:var(--warning)"></span> Medium</button>
      <button class="filter-chip ripple" data-filter="low"><span class="priority-dot" style="background:var(--success)"></span> Low</button>
    </div>
    <!-- Sort -->
    <div class="flex justify-between items-center mb-md">
      <span class="text-muted text-sm" id="task-count">Loading…</span>
      <select class="form-select" id="task-sort" style="width:auto;padding:8px 36px 8px 12px;font-size:13px">
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="due">Due date</option>
        <option value="priority">Priority</option>
      </select>
    </div>
    <div id="tasks-list"></div>
  `;

  let activeFilter = "all";
  let activeSort   = "newest";
  let allTasks     = [];

  const refreshTaskList = async () => {
    try {
      allTasks = await getTasks(uid);
      renderFiltered();
    } catch (err) {
      showSnackbar("Failed to load tasks", "error");
      console.error("Load tasks error:", err);
    }
  };

  const renderFiltered = () => {
    const now   = new Date();
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);

    let tasks = [...allTasks];

    if (activeFilter === "today")
      tasks = tasks.filter((t) => {
        if (!t.dueDate) return false;
        const d = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
        return d >= today && d < tomorrow;
      });
    else if (activeFilter === "pending")   tasks = tasks.filter((t) => !t.isCompleted);
    else if (activeFilter === "completed") tasks = tasks.filter((t) => t.isCompleted);
    else if (activeFilter === "overdue")   tasks = tasks.filter((t) => {
      if (t.isCompleted || !t.dueDate) return false;
      const d = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
      return d < now;
    });
    else if (["high","medium","low"].includes(activeFilter))
      tasks = tasks.filter((t) => t.priority === activeFilter);

    // Sort
    const priorityOrder = { high:0, medium:1, low:2 };
    if (activeSort === "newest")   tasks.sort((a,b) => ts(b.createdAt) - ts(a.createdAt));
    else if (activeSort === "oldest") tasks.sort((a,b) => ts(a.createdAt) - ts(b.createdAt));
    else if (activeSort === "due") tasks.sort((a,b) => ts(a.dueDate) - ts(b.dueDate));
    else if (activeSort === "priority") tasks.sort((a,b) => (priorityOrder[a.priority]||1) - (priorityOrder[b.priority]||1));

    const count = document.getElementById("task-count");
    if (count) count.textContent = `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`;

    const list = document.getElementById("tasks-list");
    if (!list) return;
    list.innerHTML = "";

    if (tasks.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon"><i data-lucide="party-popper"></i></div><div class="empty-title">Nothing here</div><div class="empty-desc">No tasks match this filter.</div></div>`;
      return;
    }

    tasks.forEach((task, i) => {
      const card = renderTaskCard(task, uid, refreshTaskList);
      card.classList.add("stagger-item");
      card.style.animationDelay = `${i * 40}ms`;
      list.appendChild(card);
    });
  };

  // Filter chips
  document.getElementById("task-filters")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    activeFilter = chip.dataset.filter;
    renderFiltered();
  });

  // Sort change
  document.getElementById("task-sort")?.addEventListener("change", (e) => {
    activeSort = e.target.value;
    renderFiltered();
  });

  await refreshTaskList();
}

export function isTaskOverdue(task, currentTime) {
  if (!task.scheduledEnd) return false;
  let endDate;
  if (task.scheduledEnd.includes("T")) {
    endDate = new Date(task.scheduledEnd);
  } else {
    // HH:MM format, assume today's date for comparison
    const [h, m] = task.scheduledEnd.split(":").map(Number);
    endDate = new Date(currentTime);
    endDate.setHours(h, m, 0, 0);
  }
  return currentTime > endDate;
}

export function shouldShowStatusActions(task, currentTime) {
  if (task.isCompleted || task.status === "completed") return false;
  if (task.status === "missed") return false;
  return isTaskOverdue(task, currentTime);
}

export async function updateTaskStatus(taskId, newStatus, refreshCallback) {
  try {
    const updates = { status: newStatus };
    if (newStatus === "pending") {
      // Keep eligible for rescheduling by dropping the old scheduled times
      updates.scheduledEnd = null;
      updates.scheduledStart = null;
    }
    await updateTask(taskId, updates);
    // Persist to localStorage as requested for state backups
    localStorage.setItem(`task_status_${taskId}`, newStatus);
    
    if (refreshCallback) await refreshCallback();
  } catch (err) {
    console.error("Failed to update status", err);
    showSnackbar("Failed to update status", "error");
  }
}

function renderTaskCard(task, uid, onUpdate) {
  const card = document.createElement("div");
  const isDone = task.isCompleted;
  const priority = task.priority || "medium";
  const due = task.dueDate?.toDate ? task.dueDate.toDate() : (task.dueDate ? new Date(task.dueDate) : null);
  const isOverdue = due && due < new Date() && !isDone;

  card.className = `task-card priority-${priority}${isDone ? " completed" : ""}`;
  card.style.marginBottom = "10px";
  card.innerHTML = `
    <div class="task-top-section">
      <div class="priority-label ${priority.toLowerCase()}">${priority}</div>
      <div class="task-actions" style="display:flex; gap:8px;">
        <button class="btn btn-sm ${isDone ? "btn-secondary" : "btn-primary"} btn-check ripple" style="padding: 4px 10px;" title="${isDone ? "Undo" : "Done"}">
          <i data-lucide="${isDone ? "rotate-ccw" : "check"}" style="width:14px;height:14px;"></i>
        </button>
        <button class="btn btn-sm btn-ghost btn-edit ripple" style="padding: 4px 10px;" aria-label="Edit" title="Edit">
          <i data-lucide="pencil" style="width:14px;height:14px"></i>
        </button>
        <button class="btn btn-sm btn-danger btn-del ripple" style="padding: 4px 10px;" aria-label="Delete" title="Delete">
          <i data-lucide="trash-2" style="width:14px;height:14px"></i>
        </button>
      </div>
    </div>
    <div class="task-main-section">
      <div class="task-title">${escHtml(task.title)}</div>
      ${task.description ? `<div class="text-muted text-sm" style="margin-bottom: 4px">${escHtml(task.description)}</div>` : ""}
      <div class="task-meta">
        ${due ? `<span class="task-due${isOverdue ? " overdue" : ""}" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="calendar" style="width:12px;height:12px"></i> ${formatDate(due)}</span>` : `<span class="task-due" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="calendar-off" style="width:12px;height:12px"></i> No date</span>`}
        ${task.scheduledStart && task.scheduledEnd ? `<span style="display:inline-flex;align-items:center;gap:4px;color:var(--text-secondary);"><i data-lucide="clock" style="width:12px;height:12px"></i> ${task.scheduledStart} - ${task.scheduledEnd}</span>` : ""}
        ${task.status ? `<span class="badge ${task.status === 'missed' ? 'badge-high' : 'badge-low'}">${task.status}</span>` : ""}
      </div>
    </div>
  `;

  const currentTime = new Date();
  if (shouldShowStatusActions(task, currentTime)) {
    const actionsRow = document.createElement("div");
    actionsRow.style.cssText = "display:flex; gap:8px; margin-top:12px; border-top:1px solid var(--border); padding-top:12px; align-items:center;";
    actionsRow.innerHTML = `
      <span style="font-size:12px; color:var(--error); flex:1; display:flex; align-items:center;">
        <i data-lucide="alert-circle" style="width:14px;height:14px;margin-right:4px;"></i> Overdue
      </span>
      <button class="btn btn-sm btn-danger btn-missed" style="font-size:11px; padding:6px 10px;">Missed</button>
      <button class="btn btn-sm btn-secondary btn-pending" style="font-size:11px; padding:6px 10px;">Pending</button>
    `;

    actionsRow.querySelector(".btn-missed").addEventListener("click", (e) => {
      e.stopPropagation();
      updateTaskStatus(task.id, "missed", onUpdate);
    });

    actionsRow.querySelector(".btn-pending").addEventListener("click", (e) => {
      e.stopPropagation();
      updateTaskStatus(task.id, "pending", onUpdate);
    });

    card.appendChild(actionsRow);
  }

  card.querySelector(".btn-check").addEventListener("click", async (e) => {
    e.stopPropagation();
    try {
      if (isDone) {
        await reopenTask(task.id);
        showSnackbar("Task reopened", "info");
      } else {
        card.classList.add("task-completing");
        await completeTask(task.id);
        showSnackbar("Task completed! 🎉", "success");
      }
      setTimeout(() => onUpdate(), isDone ? 0 : 400);
    } catch (err) {
      showSnackbar("Failed to update task", "error");
      console.error("Task check error:", err);
    }
  });

  card.querySelector(".btn-edit").addEventListener("click", (e) => {
    e.stopPropagation();
    openTaskModal(uid, null, onUpdate, task);
  });

  card.querySelector(".btn-del").addEventListener("click", async (e) => {
    e.stopPropagation();
    const confirmed = await showConfirmDialog(
      "Delete Task",
      `Delete "${task.title}"?`,
      "Delete",
      true
    );
    if (!confirmed) return;
    try {
      await deleteTask(task.id);
      showSnackbar("Task deleted", "success");
      onUpdate();
    } catch (err) {
      showSnackbar("Failed to delete task", "error");
      console.error("Delete task error:", err);
    }
  });

  return card;
}

// ── Task Modal (exported for FAB use) ─────────────────────────
export async function openTaskModal(uid, profile, onSave, existing = null) {
  const isEdit = !!existing;
  const [subjects, topics] = await Promise.all([getSubjects(uid), getTopics(uid)]);

  const fmt = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toISOString().slice(0, 16);
  };

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="drawer" style="max-width:480px;margin:0 auto">
      <div class="drawer-handle"></div>
      <h3 class="modal-title">${isEdit ? "Edit Task" : "New Task"}</h3>

      <div class="form-group">
        <label class="form-label">Task Title *</label>
        <input class="form-input" id="task-title" value="${escHtml(existing?.title||"")}" placeholder="What do you need to do?" />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="task-desc" placeholder="Optional details…">${escHtml(existing?.description||"")}</textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Subject</label>
          <select class="form-select" id="task-subject">
            <option value="">— None —</option>
            ${subjects.map((s) => `<option value="${s.id}" ${existing?.subjectId===s.id?"selected":""}>${escHtml(s.name)}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-select" id="task-priority">
            ${PRIORITIES.map((p) => `<option value="${p}" ${(existing?.priority||"medium")===p?"selected":""}>${p.charAt(0).toUpperCase()+p.slice(1)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Topic</label>
        <select class="form-select" id="task-topic">
          <option value="">— None —</option>
          ${topics.map((t) => `<option value="${t.id}" data-sub="${t.subjectId}" ${existing?.topicId===t.id?"selected":""}>${escHtml(t.name)}</option>`).join("")}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Due Date</label>
          <input class="form-input" type="datetime-local" id="task-due" value="${fmt(existing?.dueDate)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Reminder</label>
          <input class="form-input" type="datetime-local" id="task-reminder" value="${fmt(existing?.reminderTime)}" />
        </div>
      </div>
      <div id="task-modal-err" class="form-error hidden"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary ripple" id="task-cancel">Cancel</button>
        <button class="btn btn-primary ripple" id="task-save">
          <span id="task-save-text">${isEdit ? "Save" : "Create Task"}</span>
          <span id="task-save-spinner" class="btn-spinner hidden"></span>
        </button>
      </div>
    </div>
  `;

  // Filter topics by selected subject
  const subjSel  = backdrop.querySelector("#task-subject");
  const topicSel = backdrop.querySelector("#task-topic");
  const filterTopics = () => {
    const sid = subjSel.value;
    topicSel.querySelectorAll("option[data-sub]").forEach((opt) => {
      opt.hidden = sid ? opt.dataset.sub !== sid : false;
    });
    if (topicSel.selectedOptions[0]?.hidden) topicSel.value = "";
  };
  subjSel.addEventListener("change", filterTopics);
  filterTopics();

  backdrop.querySelector("#task-cancel").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector("#task-save").addEventListener("click", async () => {
    const title = backdrop.querySelector("#task-title").value.trim();
    const errEl = backdrop.querySelector("#task-modal-err");
    const saveBtn = backdrop.querySelector("#task-save");
    const saveText = backdrop.querySelector("#task-save-text");
    const saveSpinner = backdrop.querySelector("#task-save-spinner");

    if (!title) {
      errEl.textContent = "Task title is required.";
      errEl.classList.remove("hidden");
      return;
    }

    errEl.classList.add("hidden");
    saveBtn.disabled = true;
    saveText.textContent = isEdit ? "Saving…" : "Creating…";
    saveSpinner.classList.remove("hidden");

    const data = {
      title,
      description: backdrop.querySelector("#task-desc").value.trim(),
      subjectId:  backdrop.querySelector("#task-subject").value  || null,
      topicId:    backdrop.querySelector("#task-topic").value    || null,
      priority:   backdrop.querySelector("#task-priority").value || "medium",
      dueDate:    backdrop.querySelector("#task-due").value      || null,
      reminderTime: backdrop.querySelector("#task-reminder").value || null,
    };

    try {
      if (isEdit) {
        await updateTask(existing.id, data);
        showSnackbar("Task updated!", "success");
      } else {
        await createTask(uid, data);
        showSnackbar("Task created!", "success");
      }
      backdrop.remove();
      onSave();
    } catch (e) {
      saveBtn.disabled = false;
      saveText.textContent = isEdit ? "Save" : "Create Task";
      saveSpinner.classList.add("hidden");
      errEl.textContent = "Failed to save task. Try again.";
      errEl.classList.remove("hidden");
      showSnackbar("Failed to save task", "error");
    }
  });

  document.body.appendChild(backdrop);
  setTimeout(() => backdrop.querySelector("#task-title")?.focus(), 150);
}

// helpers
function ts(v) {
  if (!v) return 0;
  return (v.toDate ? v.toDate() : new Date(v)).getTime();
}
