import { 
  getTasks, createTask, updateTask, deleteTask, completeTask, reopenTask, 
  getSubjects, createSubject, updateSubject, deleteSubject,
  getTopics, getGoal, getGoalTask
} from "../db.js";
import { markGoalProgress } from "../utils/personalDevelopment.js";
import { escHtml, formatDate, chunkProcess } from "../js/utils.js";
import { showSnackbar, showConfirmDialog } from "../snackbar.js";
import { cacheManager } from "../utils/cacheManager.js";

const PRIORITIES = ["high", "medium", "low"];

export async function renderTasks(container, uid, profile, initialData = null) {
  container.innerHTML = `
    <div id="tasks-main-grid">
      <div id="tasks-list-col">
        <div id="tasks-content" style="margin-top:5px;"></div>
        <!-- Filter bar -->
        <div class="filter-wrapper">
          <div class="filter-row">
            <div class="custom-select-wrapper" id="wrapper-status">
              <div class="filter-select ripple" id="select-status" data-value="pending">Status: Pending</div>
              <div class="custom-dropdown-menu" id="menu-status">
                <div class="dropdown-item" data-value="all">Status: All</div>
                <div class="dropdown-item" data-value="today">Today</div>
                <div class="dropdown-item active" data-value="pending">Pending</div>
                <div class="dropdown-item" data-value="completed">Completed</div>
                <div class="dropdown-item" data-value="overdue">Overdue</div>
              </div>
            </div>
            
            <div class="custom-select-wrapper" id="wrapper-priority">
              <div class="filter-select ripple" id="select-priority" data-value="all">Priority: All</div>
              <div class="custom-dropdown-menu" id="menu-priority">
                <div class="dropdown-item active" data-value="all">Priority: All</div>
                <div class="dropdown-item" data-value="high">High</div>
                <div class="dropdown-item" data-value="medium">Medium</div>
                <div class="dropdown-item" data-value="low">Low</div>
              </div>
            </div>

            <div class="custom-select-wrapper" id="wrapper-topic">
              <div class="filter-select ripple" id="select-topic" data-value="all">Topic: All</div>
              <div class="custom-dropdown-menu" id="menu-topic">
                <div class="dropdown-item active" data-value="all">Topic: All</div>
                <!-- Dynamic topics -->
              </div>
            </div>

            <button class="filter-pill-btn ripple hidden-desktop" id="btn-manage-topics" title="Manage Topics">
              <i data-lucide="settings-2" style="width:14px;height:14px"></i>
            </button>
          </div>
        </div>

        <!-- Sort & Count -->
        <div class="flex justify-between items-center mb-md px-md">
          <span class="text-muted text-sm" id="task-count">${initialData ? 'Syncing...' : 'Loading…'}</span>
          <div class="custom-select-wrapper" id="wrapper-sort">
            <div class="filter-select ripple" id="select-sort" data-value="newest">Newest first</div>
            <div class="custom-dropdown-menu" id="menu-sort" style="right:0; left:auto;">
              <div class="dropdown-item active" data-value="newest">Newest first</div>
              <div class="dropdown-item" data-value="oldest">Oldest first</div>
              <div class="dropdown-item" data-value="due">Due date</div>
              <div class="dropdown-item" data-value="priority">Priority Order</div>
            </div>
          </div>
        </div>
        <div id="tasks-list"></div>
      </div>

      <div id="tasks-topics-col" class="hidden-mobile">
        <div class="topic-sidebar-header">
          <div class="sidebar-label">Your Topics</div>
          <button class="btn-manage-sidebar ripple" id="btn-sidebar-manage" title="Manage Topics">
            <i data-lucide="settings-2" style="width:16px;height:16px"></i>
          </button>
        </div>
        <div id="tasks-topics-list" class="topics-sidebar-list">
          <!-- Dynamic topics list -->
        </div>
      </div>
    </div>
  `;

  let activeStatus   = "pending";
  let activePriority = "all";
  let activeTopic    = "all";
  let activeSort     = "newest";
  let allTasks       = initialData?.tasks || [];
  let allTopics      = initialData?.topics || [];

  const refreshTaskList = async (isBackground = false) => {
    try {
      if (!isBackground) console.log("[Tasks] Fetching fresh data...");
      const [tasks, topics] = await Promise.all([getTasks(uid), getSubjects(uid)]);
      
      const cacheKey = `tasks_${uid}`;
      const previousRevision = cacheManager.getRevision(cacheKey);

      // Always update on foreground refresh; use revision check for background
      const shouldUpdate = !isBackground || cacheManager.hasChanged(cacheKey, previousRevision) || !previousRevision;

      if (shouldUpdate) {
        allTasks = tasks;
        allTopics = topics;
        
        const subMenu = document.getElementById("menu-topic");
        const subSelect = document.getElementById("select-topic");
        if (subMenu && subSelect) {
          subMenu.innerHTML = `<div class="dropdown-item ${activeTopic === 'all' ? 'active' : ''}" data-value="all">Topic: All</div>` +
            allTopics.map(s =>
              `<div class="dropdown-item ${activeTopic === s.id ? 'active' : ''}" data-value="${s.id}">${escHtml(s.name)}</div>`
            ).join('');
        }

        const sidebarList = document.getElementById("tasks-topics-list");
        if (sidebarList) {
          sidebarList.innerHTML = `
            <div class="topic-sidebar-item ripple ${activeTopic === 'all' ? 'active' : ''}" data-id="all">
              <div class="topic-name">All Topics</div>
            </div>
          ` + allTopics.map(s => `
            <div class="topic-sidebar-item ripple ${activeTopic === s.id ? 'active' : ''}" data-id="${s.id}">
              <div class="topic-name">${escHtml(s.name)}</div>
            </div>
          `).join('');
          
          sidebarList.querySelectorAll(".topic-sidebar-item").forEach(el => {
            el.addEventListener("click", () => {
              activeTopic = el.dataset.id;
              if (activeTopic === 'all') {
                subSelect.textContent = "Topic: All";
              } else {
                subSelect.textContent = `Topic: ${el.querySelector('.topic-name').textContent}`;
              }
              renderFiltered(false); // No stagger on click
              sidebarList.querySelectorAll(".topic-sidebar-item").forEach(item => item.classList.toggle("active", item === el));
            });
          });
          if (window.lucide) window.lucide.createIcons();

          const btnManage = document.getElementById("btn-sidebar-manage");
          if (btnManage) {
            btnManage.onclick = () => {
              openTopicManagementModal(uid, () => refreshTaskList());
            };
          }

          const btnManageMobile = document.getElementById("btn-manage-topics");
          if (btnManageMobile) {
            btnManageMobile.onclick = () => {
              openTopicManagementModal(uid, () => refreshTaskList());
            };
          }
        }

        if (subMenu && subSelect) {
          const modalContainer = document.getElementById("modal-container");
          if (modalContainer && subMenu.parentElement !== modalContainer) {
            modalContainer.appendChild(subMenu);
          }

          subMenu.querySelectorAll(".dropdown-item").forEach(item => {
            item.onclick = (e) => {
              e.stopPropagation();
              activeTopic = item.dataset.value;
              subSelect.textContent = item.textContent;
              subSelect.dataset.value = activeTopic;
              subMenu.querySelectorAll(".dropdown-item").forEach(i => i.classList.remove("active"));
              item.classList.add("active");
              document.getElementById("wrapper-topic").classList.remove("open");
              subMenu.classList.remove("open");
              renderFiltered(false); // No stagger on dropdown change
            };
          });
          
          updateDropdownPosition("topic");
        }
        
        renderFiltered(!isBackground); // use stagger only if NOT background
        cacheManager.set(cacheKey, { tasks, topics });
      } else {
        console.log("[Tasks] Data unchanged, skipping refresh");
      }
    } catch (err) {
      if (!isBackground) showSnackbar("Failed to load tasks", "error");
      console.error("Load tasks error:", err);
    }
  };

  const renderFiltered = (useStagger = true) => {
    const now   = new Date();
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);

    let tasks = [...allTasks];

    // Status Filter
    if (activeStatus === "today")
      tasks = tasks.filter((t) => {
        if (!t.dueDate) return false;
        const d = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
        return d >= today && d < tomorrow;
      });
    else if (activeStatus === "pending")   tasks = tasks.filter((t) => !t.isCompleted);
    else if (activeStatus === "completed") tasks = tasks.filter((t) => t.isCompleted);
    else if (activeStatus === "overdue")   tasks = tasks.filter((t) => {
      if (t.isCompleted || !t.dueDate) return false;
      const d = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
      return d < now;
    });

    // Priority Filter
    if (activePriority !== "all") {
      tasks = tasks.filter(t => t.priority === activePriority);
    }

    // Topic Filter
    if (activeTopic !== "all") {
      tasks = tasks.filter(t => t.subjectId === activeTopic);
    }

    // Sort
    const priorityOrder = { high:0, medium:1, low:2 };
    const ts = (v) => {
      if (!v) return 0;
      return (v.toDate ? v.toDate() : new Date(v)).getTime();
    };

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
      list.innerHTML = `<div class="empty-state"><div class="empty-icon"><i data-lucide="party-popper"></i></div><div class="empty-title">Nothing here</div><div class="empty-desc">No tasks match these filters.</div></div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    chunkProcess(tasks, (task, i) => {
      const card = renderTaskCard(task, uid, refreshTaskList, allTopics);
      if (useStagger) {
        card.classList.add("stagger-item");
        card.style.animationDelay = `${i * 20}ms`;
      }
      list.appendChild(card);
    }, 20).then(() => {
      if (window.lucide) {
        const list = document.getElementById("tasks-list");
        if (list) window.lucide.createIcons({ nodes: list.querySelectorAll('[data-lucide]') });
      }
    });
  };

  // Setup Dropdown Interactions
  const updateDropdownPosition = (id) => {
    const wrapper = document.getElementById(`wrapper-${id}`);
    const select = document.getElementById(`select-${id}`);
    const menu = document.getElementById(`menu-${id}`);
    if (!wrapper || !select || !menu || !menu.classList.contains("open")) return;

    const rect = select.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 8}px`;
    
    // Check if button is on the right half of the screen to prevent overflow
    if (rect.left > window.innerWidth / 2 || id === 'sort') {
      menu.style.left = 'auto';
      menu.style.right = `${window.innerWidth - rect.right}px`;
      menu.style.minWidth = id === 'sort' ? '180px' : '200px';
    } else {
      menu.style.right = 'auto';
      menu.style.left = `${rect.left}px`;
      menu.style.minWidth = `${rect.width}px`;
    }
  };

  const initDropdown = (id, onChange) => {
    const wrapper = document.getElementById(`wrapper-${id}`);
    const select = document.getElementById(`select-${id}`);
    const menu = document.getElementById(`menu-${id}`);
    if (!wrapper || !select || !menu) return;

    select.onclick = (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains("open");
      // Close all others first
      document.querySelectorAll(".custom-select-wrapper").forEach(w => w.classList.remove("open"));
      document.querySelectorAll(".custom-dropdown-menu").forEach(m => m.classList.remove("open"));
      
      if (!isOpen) {
        wrapper.classList.add("open");
        menu.classList.add("open");
        updateDropdownPosition(id);
      }
    };

    menu.querySelectorAll(".dropdown-item").forEach(item => {
      item.onclick = (e) => {
        e.stopPropagation();
        const val = item.dataset.value;
        select.textContent = item.textContent;
        select.dataset.value = val;
        
        menu.querySelectorAll(".dropdown-item").forEach(i => i.classList.remove("active"));
        item.classList.add("active");
        
        wrapper.classList.remove("open");
        menu.classList.remove("open");
        onChange(val);
      };
    });
  };

  initDropdown("status", (v) => { activeStatus = v; renderFiltered(false); });
  initDropdown("priority", (v) => { activePriority = v; renderFiltered(false); });
  initDropdown("topic", (v) => { activeTopic = v; renderFiltered(false); });
  initDropdown("sort", (v) => { activeSort = v; renderFiltered(false); });
  
  // Re-init subject dropdown on refreshTaskList population
  // handled by initDropdown("subject", ...) if we ensure the structure exists

  // Manage Topics
  document.getElementById("btn-manage-topics")?.addEventListener("click", () => {
    openTopicManagementModal(uid, refreshTaskList);
  });

  // ── Global Event Listeners ──
  const handleScroll = () => {
    document.querySelectorAll(".custom-select-wrapper.open").forEach(w => {
      const id = w.id.replace("wrapper-", "");
      updateDropdownPosition(id);
    });
  };

  const handleResize = () => {
    document.querySelectorAll(".custom-select-wrapper").forEach(w => w.classList.remove("open"));
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest(".custom-select-wrapper") && !e.target.closest(".custom-dropdown-menu")) {
      document.querySelectorAll(".custom-select-wrapper").forEach(w => w.classList.remove("open"));
      document.querySelectorAll(".custom-dropdown-menu").forEach(m => m.classList.remove("open"));
    }
  };

  window.addEventListener("scroll", handleScroll, true);
  window.addEventListener("resize", handleResize);
  document.addEventListener("click", handleClickOutside);

  // Portal: Move all static menus to modal-container to avoid iOS clipping
  const modalContainer = document.getElementById("modal-container");
  const menusToPortal = container.querySelectorAll(".custom-dropdown-menu");
  if (modalContainer) {
    menusToPortal.forEach(m => modalContainer.appendChild(m));
  }

  // SWR: Immediate render if cached
  if (initialData) {
    console.log("[Tasks] SWR: Rendering from cache");
    requestAnimationFrame(() => renderFiltered(true)); // Allow stagger for first cache hit
  }

  // Background refresh
  refreshTaskList(!!initialData);

  // Return cleanup controller
  return {
    cleanup: () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("click", handleClickOutside);
      // Remove portaled menus
      menusToPortal.forEach(m => m.remove());
    }
  };
}

export function isTaskOverdue(task) {
  if (!task.dueDate) return false;
  return new Date() > new Date(task.dueDate + "T23:59:59");
}

export function shouldShowStatusActions(task) {
  if (task.isCompleted || task.status === "completed") return false;
  if (task.status === "missed") return false;
  return isTaskOverdue(task);
}

export async function updateTaskStatus(taskId, newStatus, refreshCallback) {
  try {
    const updates = { status: newStatus };
    await updateTask(taskId, updates);
    // Persist to localStorage as requested for state backups
    localStorage.setItem(`task_status_${taskId}`, newStatus);
    
    // Invalidate related caches
    cacheManager.invalidatePrefix("analytics_");
    cacheManager.invalidatePrefix("dashboard_");
    
    if (refreshCallback) await refreshCallback();
  } catch (err) {
    console.error("Failed to update status", err);
    showSnackbar("Failed to update status", "error");
  }
}

function renderTaskCard(task, uid, onUpdate, allTopics = []) {
  const card = document.createElement("div");
  const isDone = task.isCompleted;
  const priority = task.priority || "medium";
  const due = task.dueDate?.toDate ? task.dueDate.toDate() : (task.dueDate ? new Date(task.dueDate) : null);
  const isOverdue = due && due < new Date() && !isDone;

  card.className = `task-card priority-${priority}${isDone ? " completed" : ""}`;
  card.innerHTML = `
    <div class="task-header" style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:12px;">
      <div class="task-title" style="flex:1; font-size:15px;">${escHtml(task.title)}</div>
      <button class="btn ${isDone ? "btn-secondary" : "btn-primary"} btn-check btn-circle ripple" title="${isDone ? "Undo" : "Done"}">
        <i data-lucide="${isDone ? "rotate-ccw" : "check"}" style="width:14px;height:14px;"></i>
      </button>
    </div>
    
    <div class="task-details">
      <div class="task-main-section">
        <div class="flex justify-between items-center mb-sm">
          <div class="priority-label ${priority.toLowerCase()}">${priority}</div>
           ${task.status ? `<span class="badge ${task.status === 'missed' ? 'badge-high' : 'badge-low'}">${task.status}</span>` : ""}
        </div>
        
        ${task.description ? `<div class="text-muted text-sm" style="margin-bottom: 8px">${escHtml(task.description)}</div>` : ""}
        
        <div class="flex flex-wrap items-center gap-md">
          ${task.subjectId ? `
            <div class="task-topic-tag" style="margin-bottom:0">
              <i data-lucide="tag" style="width:10px;height:10px;"></i>
              ${escHtml(allTopics.find(s => s.id === task.subjectId)?.name || "Topic")}
            </div>
          ` : ""}

          <div class="task-meta">
            ${due ? `<span class="task-due${isOverdue ? " overdue" : ""}" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="calendar" style="width:12px;height:12px"></i> ${formatDate(due)}</span>` : `<span class="task-due" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="calendar-off" style="width:12px;height:12px"></i> No date</span>`}

          </div>
        </div>

        <div class="task-actions" style="margin-top:16px; justify-content: flex-end;">

          <button class="btn btn-ghost btn-edit btn-circle ripple" aria-label="Edit" title="Edit">
            <i data-lucide="pencil" style="width:14px;height:14px"></i>
          </button>
          <button class="btn btn-danger btn-del btn-circle ripple" aria-label="Delete" title="Delete">
            <i data-lucide="trash-2" style="width:14px;height:14px"></i>
          </button>
        </div>
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

    card.querySelector(".task-details .task-main-section").appendChild(actionsRow);
  }

  // Toggle expansion logic
  card.addEventListener("click", () => {
    // Toggle the expansion class
    card.classList.toggle("expanded");
  });

  card.querySelector(".btn-check").addEventListener("click", async (e) => {
    e.stopPropagation();
    try {
      if (isDone) {
        await reopenTask(task.id);
        showSnackbar("Task reopened", "info");
      } else {
        card.classList.add("task-completing");
        await completeTask(task.id);
        
        // Sync with Growth/Personal Development Goal
        if (task.sourceGoalTaskId) {
          try {
            const gtask = await getGoalTask(task.sourceGoalTaskId);
            if (gtask && gtask.status !== "completed") {
              const goal = await getGoal(gtask.sourceGoalId);
              if (goal) {
                const { completed } = await markGoalProgress(goal, 1);
                await updateGoalTask(gtask.id, { status: "completed" });
                showSnackbar(`Goal progress updated! +1 ${goal.unit}${completed ? " — Goal Accomplished! 🏆" : ""}`, "success");
              }
            }
          } catch (syncErr) {
            console.warn("[Sync] Goal update failed:", syncErr);
          }
        }

        showSnackbar("Task completed! 🎉", "success");
      }
      
      // Invalidate related caches
      cacheManager.invalidatePrefix("analytics_");
      cacheManager.invalidatePrefix("dashboard_");
      
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
      
      // Invalidate related caches
      cacheManager.invalidatePrefix("analytics_");
      cacheManager.invalidatePrefix("dashboard_");
      
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
  if (document.querySelector(".modal-backdrop")) return;
  const isEdit = !!existing;
  const [subjects, topics] = await Promise.all([getSubjects(uid), getTopics(uid)]);

  const fmt = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toISOString().slice(0, 16);
  };

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop centered";
  backdrop.innerHTML = `
    <div class="modal-box" style="max-width:480px;">
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
          <label class="form-label">Topic</label>
          <select class="form-select" id="task-topic">
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
        <label class="form-label">Sub-topic</label>
        <select class="form-select" id="task-subtopic">
          <option value="">— None —</option>
          ${topics.map((t) => `<option value="${t.id}" data-sub="${t.subjectId}" ${existing?.topicId===t.id?"selected":""}>${escHtml(t.name)}</option>`).join("")}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Due Date</label>
          <input class="form-input" type="datetime-local" id="task-due" value="${fmt(existing?.dueDate)}" />
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

  // Filter topics by selected topic
  const subjSel  = backdrop.querySelector("#task-topic");
  const topicSel = backdrop.querySelector("#task-subtopic");
  const filterTopics = () => {
    const sid = subjSel.value;
    topicSel.querySelectorAll("option[data-sub]").forEach((opt) => {
      opt.hidden = sid ? opt.dataset.sub !== sid : false;
    });
    if (topicSel.selectedOptions[0]?.hidden) topicSel.value = "";
  };
  subjSel.addEventListener("change", filterTopics);
  filterTopics();

    const closeModal = (isPopState = false) => {
      // If closing manually (not via popstate), pop the state we pushed
      if (!isPopState && history.state?.modal) {
        history.back();
      }
      backdrop.classList.add("modal-exit");
      setTimeout(() => {
        backdrop.remove();
      }, 200);
    };

    backdrop.querySelector("#task-cancel").addEventListener("click", () => closeModal(false));
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(false); });
    
    // Portal the backdrop to ensure it's on top
    const modalContainer = document.getElementById("modal-container") || document.body;
    modalContainer.appendChild(backdrop);

    // Track for popstate
    backdrop._closeModal = closeModal;
    
    // Support Android/Browser Back Gesture
    history.pushState({ modal: 'task' }, "");

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
        subjectId:  backdrop.querySelector("#task-topic").value  || null,
        topicId:    backdrop.querySelector("#task-subtopic").value    || null,
        priority:   backdrop.querySelector("#task-priority").value || "medium",
        dueDate:    backdrop.querySelector("#task-due").value      || null,
      };

      try {
        if (isEdit) {
          await updateTask(existing.id, data);
          showSnackbar("Task updated!", "success");
        } else {
          await createTask(uid, data);
          showSnackbar("Task created!", "success");
        }
        
        // Invalidate all related task/stats caches
        cacheManager.invalidatePrefix("tasks_");
        cacheManager.invalidatePrefix("analytics_");
        cacheManager.invalidatePrefix("dashboard_");
        
        closeModal();
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

// ── Topic Management Modal ────────────────────────────────
async function openTopicManagementModal(uid, onUpdate) {
  const topics = await getSubjects(uid);
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop centered";
  backdrop.innerHTML = `
    <div class="modal-box" style="max-width:480px;">
      <div class="flex justify-between items-center mb-md">
        <h3 class="modal-title" style="margin:0">Manage Topics</h3>
        <button class="btn btn-primary btn-sm ripple" id="btn-new-topic">
          <i data-lucide="plus" style="width:16px;height:16px"></i> Add
        </button>
      </div>
      
      <div id="topics-list-modal" class="modal-list-container">
        ${topics.length === 0 ? '<div class="text-muted text-center py-xl">No topics yet.</div>' : ''}
        ${topics.map(s => `
          <div class="modal-list-item">
            <div class="flex-1">
              <div class="task-topic-tag">${escHtml(s.name)}</div>
            </div>
            <div class="flex gap-sm">
              <button class="btn-circle ripple btn-edit-top" data-id="${s.id}" data-name="${s.name}">
                <i data-lucide="pencil" style="width:16px;height:16px"></i>
              </button>
              <button class="btn-circle ripple btn-del-top" data-id="${s.id}" data-name="${s.name}">
                <i data-lucide="trash-2" style="width:16px;height:16px"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="modal-actions pt-md">
        <button class="btn btn-secondary w-full ripple" id="top-mgmt-close">Close</button>
      </div>
    </div>
  `;

  const refreshModalList = async () => {
    const updated = await getSubjects(uid);
    const listEl = backdrop.querySelector("#topics-list-modal");
    listEl.innerHTML = updated.length === 0 ? '<div class="text-muted text-center py-xl">No topics yet.</div>' : 
      updated.map(s => `
        <div class="modal-list-item">
          <div class="flex-1">
            <div class="font-bold">${escHtml(s.name)}</div>
          </div>
          <div class="flex gap-sm">
            <button class="btn-circle ripple btn-edit-top" data-id="${s.id}" data-name="${s.name}">
              <i data-lucide="pencil" style="width:16px;height:16px"></i>
            </button>
            <button class="btn-circle ripple btn-del-top" data-id="${s.id}" data-name="${s.name}">
              <i data-lucide="trash-2" style="width:16px;height:16px"></i>
            </button>
          </div>
        </div>
      `).join('');
    if (window.lucide) window.lucide.createIcons();
    attachListeners();
    onUpdate(); 
  };

  const attachListeners = () => {
    backdrop.querySelectorAll(".btn-edit-top").forEach(btn => {
      btn.onclick = () => openTopicEditModal(uid, { id: btn.dataset.id, name: btn.dataset.name }, refreshModalList);
    });
    backdrop.querySelectorAll(".btn-del-top").forEach(btn => {
      btn.onclick = async () => {
        const confirmed = await showConfirmDialog("Delete Topic", `Delete "${btn.dataset.name}"? Tasks remain but will lose their topic tag.`, "Delete", true);
        if (confirmed) {
          await deleteSubject(btn.dataset.id);
          showSnackbar("Topic deleted", "success");
          refreshModalList();
        }
      };
    });
  };

  const closeModal = (isPopState = false) => {
    if (!isPopState && history.state?.modal) {
      history.back();
    }
    backdrop.remove();
  };

  backdrop.querySelector("#btn-new-topic").onclick = () => openTopicEditModal(uid, null, refreshModalList);
  backdrop.querySelector("#top-mgmt-close").onclick = () => closeModal(false);
  backdrop._closeModal = closeModal;
  
  history.pushState({ modal: 'topics' }, "");
  
  document.body.appendChild(backdrop);
  if (window.lucide) window.lucide.createIcons();
  attachListeners();
}

async function openTopicEditModal(uid, existing, onSave) {
  const isEdit = !!existing;
  const subBackdrop = document.createElement("div");
  subBackdrop.className = "modal-backdrop centered sub-modal";
  subBackdrop.innerHTML = `
    <div class="modal-box" style="max-width:400px;z-index:11000">
      <h3 class="modal-title">${isEdit ? "Edit Topic" : "New Topic"}</h3>
      <div class="form-group">
        <label class="form-label">Name</label>
        <input class="form-input" id="top-name-inp" value="${escHtml(existing?.name||'')}" placeholder="e.g. Science" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary ripple" id="top-edit-cancel">Cancel</button>
        <button class="btn btn-primary ripple" id="top-edit-save">Save</button>
      </div>
    </div>
  `;

  subBackdrop.querySelector("#top-edit-cancel").onclick = () => subBackdrop.remove();
  subBackdrop.querySelector("#top-edit-save").onclick = async () => {
    const name = subBackdrop.querySelector("#top-name-inp").value.trim();
    if (!name) return showSnackbar("Name required", "error");
    try {
      if (isEdit) await updateSubject(existing.id, { name });
      else await createSubject(uid, { name });
      showSnackbar("Topic saved", "success");
      subBackdrop.remove();
      onSave();
    } catch (err) {
      showSnackbar("Error saving topic", "error");
    }
  };

  document.body.appendChild(subBackdrop);
  setTimeout(() => subBackdrop.querySelector("#top-name-inp").focus(), 150);
}

// helpers
function ts(v) {
  if (!v) return 0;
  return (v.toDate ? v.toDate() : new Date(v)).getTime();
}
