import { getSubjects, createSubject, updateSubject, deleteSubject, getTopics, getTasks } from "../db.js";
import { navigate } from "../app.js";
import { escHtml } from "../js/utils.js";
import { showSnackbar, showConfirmDialog } from "../snackbar.js";
import { cacheManager } from "../utils/cacheManager.js";

export async function renderTopics(container, uid, profile, initialData = null) {
  // 1. SWR: Instant render from cache
  const renderShell = (data = null) => {
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Topics</h1>
        <button class="btn btn-primary btn-sm ripple" id="btn-add-topic" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="plus" style="width:16px;height:16px"></i> Add</button>
      </div>
      <div id="topics-list">
        ${data ? renderTopicsListHTML(data.topics, data.subtopics, data.tasks) : '<div id="topics-loading" class="animate-pulse text-muted text-sm" style="margin-top:20px">Loading…</div>'}
      </div>
    `;

    document.getElementById("btn-add-topic")?.addEventListener("click", () =>
      openTopicModal(uid, null, () => loadTopics(container, uid, profile))
    );
    
    if (data) bindTopicEvents(container, uid, profile, data.topics);
    if (window.lucide) window.lucide.createIcons();
  };

  renderShell(initialData);

  // 2. Background refresh
  requestAnimationFrame(() => {
    loadTopics(container, uid, profile, !!initialData);
  });

  return { cleanup: () => {} };
}

async function loadTopics(container, uid, profile, isBackground = false) {
  try {
    const [topics, allSubtopics, allTasks] = await Promise.all([
      getSubjects(uid),
      getTopics(uid),
      getTasks(uid),
    ]);

    const cacheKey = `topics_${uid}`;
    const newData = { topics, subtopics: allSubtopics, tasks: allTasks };
    const oldCache = cacheManager.get(cacheKey);
    const hasChanged = !oldCache || JSON.stringify(newData) !== JSON.stringify(oldCache);

    if (hasChanged || !isBackground) {
      const listEl = document.getElementById("topics-list");
      if (listEl) {
        listEl.innerHTML = renderTopicsListHTML(topics, allSubtopics, allTasks);
        bindTopicEvents(container, uid, profile, topics);
        if (window.lucide) window.lucide.createIcons();
      }
      cacheManager.set(cacheKey, newData);
    }
  } catch (err) {
    console.error("Load topics error:", err);
    if (!isBackground) showSnackbar("Failed to load topics", "error");
  }
}

function renderTopicsListHTML(topics, allSubtopics, allTasks) {
  if (topics.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="book"></i></div>
        <div class="empty-title">No topics yet</div>
        <div class="empty-desc">Tap "+ Add" to create your first topic.</div>
      </div>`;
  }

  return topics.map((top, index) => {
    const subtopics = allSubtopics.filter((t) => t.subjectId === top.id);
    const tasks = allTasks.filter((t) => t.subjectId === top.id);
    const done = tasks.filter((t) => t.isCompleted).length;
    const rate = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

    return `
      <div class="topic-card clickable stagger-item" style="animation-delay:${index * 60}ms" data-id="${top.id}" data-name="${escHtml(top.name)}">
        <div class="flex justify-between items-start">
          <div>
            <div class="topic-name">${escHtml(top.name)}</div>
            <div class="topic-stats">${subtopics.length} sub-topic${subtopics.length !== 1 ? "s" : ""} · ${done}/${tasks.length} tasks done</div>
          </div>
          <div class="flex gap-sm" style="margin-left: 12px; gap: 8px;">
            <button class="btn-topic-action btn-edit" title="Edit" data-id="${top.id}"><i data-lucide="pencil" style="width:16px;height:16px"></i></button>
            <button class="btn-topic-action btn-delete" title="Delete" data-id="${top.id}"><i data-lucide="trash-2" style="width:16px;height:16px"></i></button>
          </div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${rate}%"></div></div>
      </div>
    `;
  }).join("");
}

function bindTopicEvents(container, uid, profile, topics) {
  const listEl = document.getElementById("topics-list");
  if (!listEl) return;

  listEl.querySelectorAll(".topic-card").forEach(card => {
    card.onclick = (e) => {
      if (e.target.closest(".btn-edit") || e.target.closest(".btn-delete")) return;
      navigate("subtopics", { topicId: card.dataset.id, topicName: card.dataset.name });
    };

    const editBtn = card.querySelector(".btn-edit");
    editBtn.onclick = (e) => {
      e.stopPropagation();
      const top = topics.find(t => t.id === editBtn.dataset.id);
      if (top) openTopicModal(uid, top, () => loadTopics(container, uid, profile));
    };

    const delBtn = card.querySelector(".btn-delete");
    delBtn.onclick = async (e) => {
      e.stopPropagation();
      const top = topics.find(t => t.id === delBtn.dataset.id);
      if (!top) return;
      const confirmed = await showConfirmDialog("Delete Topic", `Delete "${top.name}"?`, "Delete", true);
      if (!confirmed) return;
      try {
        await deleteSubject(top.id);
        showSnackbar(`"${top.name}" deleted`, "success");
        loadTopics(container, uid, profile);
      } catch (err) { showSnackbar("Failed to delete", "error"); }
    };
  });
}

function openTopicModal(uid, existing, onSave) {
  const isEdit = !!existing;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="drawer" style="max-width:480px;margin:0 auto">
      <div class="drawer-handle"></div>
      <h3 class="modal-title">${isEdit ? "Edit Topic" : "New Topic"}</h3>
      <div class="form-group">
        <label class="form-label">Topic Name</label>
        <input class="form-input" id="top-name-input" value="${escHtml(existing?.name || "")}" placeholder="e.g. Mathematics" />
      </div>
      <div id="top-modal-err" class="form-error hidden"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary ripple" id="top-cancel">Cancel</button>
        <button class="btn btn-primary ripple" id="top-save">${isEdit ? "Save" : "Create"}</button>
      </div>
    </div>
  `;

  backdrop.querySelector("#top-cancel").onclick = () => backdrop.remove();
  backdrop.querySelector("#top-save").onclick = async () => {
    const name = backdrop.querySelector("#top-name-input").value.trim();
    if (!name) return;
    try {
      if (isEdit) await updateSubject(existing.id, { name });
      else await createSubject(uid, { name });
      backdrop.remove();
      onSave();
    } catch (err) { showSnackbar("Failed to save", "error"); }
  };
  document.body.appendChild(backdrop);
}
