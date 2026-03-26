// ============================================================
// pages/subjects.js — Subjects CRUD page
// ============================================================

import { getSubjects, createSubject, updateSubject, deleteSubject, getTopics, getTasks } from "../db.js";
import { navigate } from "../app.js";
import { escHtml } from "../js/utils.js";
import { showSnackbar, showConfirmDialog } from "../snackbar.js";

export async function renderTopics(container, uid, profile) {
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Topics</h1>
      <button class="btn btn-primary btn-sm ripple" id="btn-add-topic" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="plus" style="width:16px;height:16px"></i> Add</button>
    </div>
    <div id="topics-loading" class="animate-pulse text-muted text-sm">Loading…</div>
    <div id="topics-list" class="hidden"></div>
  `;

  document.getElementById("btn-add-topic")?.addEventListener("click", () =>
    openTopicModal(uid, null, () => renderTopics(container, uid, profile))
  );

  await loadTopics(container, uid, profile);

  return { cleanup: () => {} };
}

async function loadTopics(container, uid, profile) {
  try {
    const [topics, allSubtopics, allTasks] = await Promise.all([
      getSubjects(uid),
      getTopics(uid),
      getTasks(uid),
    ]);

    document.getElementById("topics-loading")?.remove();
    const list = document.getElementById("topics-list");
    if (!list) return;
    list.classList.remove("hidden");
    list.innerHTML = "";

    if (topics.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="book"></i></div>
          <div class="empty-title">No topics yet</div>
          <div class="empty-desc">Tap "+ Add" to create your first topic.</div>
        </div>`;
      return;
    }

    topics.forEach((top, index) => {
      const subtopics = allSubtopics.filter((t) => t.subjectId === top.id);
      const tasks  = allTasks.filter((t) => t.subjectId === top.id);
      const done   = tasks.filter((t) => t.isCompleted).length;
      const rate   = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

      const card = document.createElement("div");
      card.className = "topic-card clickable stagger-item";
      card.style.animationDelay = `${index * 60}ms`;
      card.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <div class="topic-name">${escHtml(top.name)}</div>
            <div class="topic-stats">${subtopics.length} sub-topic${subtopics.length !== 1 ? "s" : ""} · ${done}/${tasks.length} tasks done</div>
          </div>
          <div class="flex gap-sm" style="margin-left: 12px; gap: 8px;">
            <button class="btn-topic-action btn-edit" title="Edit"><i data-lucide="pencil" style="width:16px;height:16px"></i></button>
            <button class="btn-topic-action btn-delete" title="Delete"><i data-lucide="trash-2" style="width:16px;height:16px"></i></button>
          </div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${rate}%"></div></div>
      `;

      card.addEventListener("click", (e) => {
        if (e.target.closest(".btn-edit") || e.target.closest(".btn-delete")) return;
        navigate("subtopics", { topicId: top.id, topicName: top.name });
      });

      card.querySelector(".btn-edit").addEventListener("click", (e) => {
        e.stopPropagation();
        openTopicModal(uid, top, () => renderTopics(container, uid, profile));
      });

      card.querySelector(".btn-delete").addEventListener("click", async (e) => {
        e.stopPropagation();
        const confirmed = await showConfirmDialog(
          "Delete Topic",
          `Delete "${top.name}" and all its sub-topics? Tasks will remain.`,
          "Delete",
          true
        );
        if (!confirmed) return;
        try {
          await deleteSubject(top.id);
          showSnackbar(`"${top.name}" deleted`, "success");
          renderTopics(container, uid, profile);
        } catch (err) {
          showSnackbar("Failed to delete topic", "error");
          console.error("Delete topic error:", err);
        }
      });

      list.appendChild(card);
    });
  } catch (err) {
    showSnackbar("Failed to load topics", "error");
    console.error("Load topics error:", err);
    document.getElementById("topics-loading")?.remove();
    const list = document.getElementById("topics-list");
    if (list) {
      list.classList.remove("hidden");
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="alert-triangle"></i></div>
          <div class="empty-title">Something went wrong</div>
          <div class="empty-desc">Error: ${err.message || 'Please check your connection.'}</div>
        </div>`;
    }
  }
}

async function openTopicModal(uid, existing, onSave) {
  const isEdit = !!existing;

  // Fetch existing topics for duplicate check
  let existingTopics = [];
  try {
    existingTopics = await getSubjects(uid);
  } catch (_) {}

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
        <button class="btn btn-primary ripple" id="top-save">
          <span id="top-save-text">${isEdit ? "Save" : "Create"}</span>
          <span id="top-save-spinner" class="btn-spinner hidden"></span>
        </button>
      </div>
    </div>
  `;

  backdrop.querySelector("#top-cancel").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector("#top-save").addEventListener("click", async () => {
    const name = backdrop.querySelector("#top-name-input").value.trim();
    const errEl = backdrop.querySelector("#top-modal-err");
    const saveBtn = backdrop.querySelector("#top-save");
    const saveText = backdrop.querySelector("#top-save-text");
    const saveSpinner = backdrop.querySelector("#top-save-spinner");

    if (!name) {
      errEl.textContent = "Topic name is required.";
      errEl.classList.remove("hidden");
      return;
    }

    const isDuplicate = existingTopics.some(
      (s) => s.name.toLowerCase() === name.toLowerCase() && (!isEdit || s.id !== existing.id)
    );
    if (isDuplicate) {
      errEl.textContent = `A topic named "${name}" already exists.`;
      errEl.classList.remove("hidden");
      return;
    }

    errEl.classList.add("hidden");
    saveBtn.disabled = true;
    saveText.textContent = isEdit ? "Saving…" : "Creating…";
    saveSpinner.classList.remove("hidden");

    try {
      if (isEdit) {
        await updateSubject(existing.id, { name });
        showSnackbar("Topic updated!", "success");
      } else {
        await createSubject(uid, { name });
        showSnackbar(`"${name}" created!`, "success");
      }
      backdrop.remove();
      onSave();
    } catch (err) {
      saveBtn.disabled = false;
      saveText.textContent = isEdit ? "Save" : "Create";
      saveSpinner.classList.add("hidden");
      errEl.textContent = "Failed to save. Please try again.";
      errEl.classList.remove("hidden");
      showSnackbar("Failed to save topic", "error");
      console.error("Save topic error:", err);
    }
  });

  document.body.appendChild(backdrop);
  setTimeout(() => backdrop.querySelector("#top-name-input")?.focus(), 150);
}
