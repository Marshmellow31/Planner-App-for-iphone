import { getTopics, createTopic, updateTopic, deleteTopic, getTasks } from "../db.js";
import { navigate } from "../app.js";
import { escHtml } from "../js/utils.js";
import { showSnackbar, showConfirmDialog } from "../snackbar.js";
import { cacheManager } from "../utils/cacheManager.js";

export async function renderSubtopics(container, uid, topicId, topicName, initialData = null) {
  if (!topicId) {
    navigate("topics");
    return;
  }

  // 1. SWR: Instant render from cache
  const renderShell = (data = null) => {
    container.innerHTML = `
      <div class="page-header">
        <div class="flex items-center gap-sm">
          <button class="btn-icon ripple" id="btn-back-topics" style="background:none;border:none;color:var(--text-primary)"><i data-lucide="arrow-left"></i></button>
          <div>
            <div class="text-muted text-sm">Topic</div>
            <h2 class="page-title" style="font-size:var(--font-size-xl)">${escHtml(topicName || "Sub-topics")}</h2>
          </div>
        </div>
        <button class="btn btn-primary btn-sm ripple" id="btn-add-subtopic" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="plus" style="width:16px;height:16px"></i> Sub-topic</button>
      </div>
      <div id="subtopics-list">
        ${data ? renderSubtopicsListHTML(data.subtopics, data.tasks) : '<div id="subtopics-loading" class="animate-pulse text-muted text-sm">Loading…</div>'}
      </div>
    `;

    document.getElementById("btn-back-topics")?.addEventListener("click", () => navigate("topics"));
    document.getElementById("btn-add-subtopic")?.addEventListener("click", () =>
      openSubtopicModal(uid, topicId, null, () => loadSubtopics(container, uid, topicId, topicName))
    );
    
    if (data) bindListEvents(container, uid, topicId, topicName, data.subtopics);
    if (window.lucide) window.lucide.createIcons();
  };

  renderShell(initialData);

  // 2. Background refresh
  requestAnimationFrame(() => {
    loadSubtopics(container, uid, topicId, topicName, !!initialData);
  });

  return { cleanup: () => {} };
}

async function loadSubtopics(container, uid, topicId, topicName, isBackground = false) {
  try {
    const [subtopics, allTasks] = await Promise.all([
      getTopics(uid, topicId),
      getTasks(uid, { subjectId: topicId }),
    ]);

    const cacheKey = `subtopics_${uid}_${topicId}`;
    const newData = { subtopics, tasks: allTasks };
    const oldCache = cacheManager.get(cacheKey);
    const hasChanged = !oldCache || JSON.stringify(newData) !== JSON.stringify(oldCache);

    if (hasChanged || !isBackground) {
      const listEl = document.getElementById("subtopics-list");
      if (listEl) {
        listEl.innerHTML = renderSubtopicsListHTML(subtopics, allTasks);
        bindListEvents(container, uid, topicId, topicName, subtopics);
        if (window.lucide) window.lucide.createIcons();
      }
      cacheManager.set(cacheKey, newData);
    }
  } catch (err) {
    console.error("Load sub-topics error:", err);
    if (!isBackground) showSnackbar("Failed to load sub-topics", "error");
  }
}

function renderSubtopicsListHTML(subtopics, allTasks) {
  if (subtopics.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="folder"></i></div>
        <div class="empty-title">No sub-topics yet</div>
        <div class="empty-desc">Tap "+ Sub-topic" to create sub-topics under this topic.</div>
      </div>`;
  }

  return subtopics.map((subt, i) => {
    const tasks = allTasks.filter((t) => t.topicId === subt.id);
    const done = tasks.filter((t) => t.isCompleted).length;
    const rate = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
    const isDone = tasks.length > 0 && done === tasks.length;

    return `
      <div class="card mb-sm stagger-item" style="animation-delay:${i * 40}ms">
        <div class="flex justify-between items-center mb-sm">
          <div class="flex items-center gap-sm">
            <span style="color:var(--accent)">
              <i data-lucide="${isDone ? "check-circle" : "file-text"}" style="width:20px;height:20px"></i>
            </span>
            <div class="font-bold">${escHtml(subt.name)}</div>
          </div>
          <div class="flex gap-sm">
            <button class="btn-icon btn-edit ripple" style="width:34px;height:34px" title="Edit" data-id="${subt.id}"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>
            <button class="btn-icon btn-delete ripple" style="width:34px;height:34px" title="Delete" data-id="${subt.id}"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
          </div>
        </div>
        <div class="text-muted text-sm mb-sm">${done}/${tasks.length} tasks completed</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${rate}%"></div></div>
      </div>
    `;
  }).join("");
}

function bindListEvents(container, uid, topicId, topicName, subtopics) {
  const listEl = document.getElementById("subtopics-list");
  if (!listEl) return;

  listEl.querySelectorAll(".btn-edit").forEach(btn => {
    btn.onclick = () => {
      const subt = subtopics.find(s => s.id === btn.dataset.id);
      if (subt) openSubtopicModal(uid, topicId, subt, () => loadSubtopics(container, uid, topicId, topicName));
    };
  });

  listEl.querySelectorAll(".btn-delete").forEach(btn => {
    btn.onclick = async () => {
      const subt = subtopics.find(s => s.id === btn.dataset.id);
      if (!subt) return;
      const confirmed = await showConfirmDialog("Delete Sub-topic", `Delete "${subt.name}"?`, "Delete", true);
      if (!confirmed) return;
      try {
        await deleteTopic(subt.id);
        showSnackbar("Sub-topic deleted", "success");
        loadSubtopics(container, uid, topicId, topicName);
      } catch (err) {
        showSnackbar("Failed to delete", "error");
      }
    };
  });
}

function openSubtopicModal(uid, topicId, existing, onSave) {
  const isEdit = !!existing;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="drawer" style="max-width:480px;margin:0 auto">
      <div class="drawer-handle"></div>
      <h3 class="modal-title">${isEdit ? "Edit Sub-topic" : "New Sub-topic"}</h3>
      <div class="form-group">
        <label class="form-label">Sub-topic Name</label>
        <input class="form-input" id="subtopic-name-input" value="${escHtml(existing?.name || "")}" placeholder="e.g. Chapter 3" />
      </div>
      <div id="subtopic-modal-err" class="form-error hidden"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary ripple" id="subtopic-cancel">Cancel</button>
        <button class="btn btn-primary ripple" id="subtopic-save">${isEdit ? "Save" : "Create"}</button>
      </div>
    </div>
  `;

  backdrop.querySelector("#subtopic-cancel").onclick = () => backdrop.remove();
  backdrop.querySelector("#subtopic-save").onclick = async () => {
    const name = backdrop.querySelector("#subtopic-name-input").value.trim();
    if (!name) return;
    try {
      if (isEdit) await updateTopic(existing.id, { name });
      else await createTopic(uid, { subjectId: topicId, name });
      backdrop.remove();
      onSave();
    } catch (err) { showSnackbar("Failed to save", "error"); }
  };
  document.body.appendChild(backdrop);
}
