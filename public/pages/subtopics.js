// ============================================================
// pages/topics.js — Topics page (per subject)
// ============================================================

import { getTopics, createTopic, updateTopic, deleteTopic, getTasks } from "../db.js";
import { navigate } from "../app.js";
import { escHtml } from "../js/utils.js";
import { showSnackbar, showConfirmDialog } from "../snackbar.js";

export async function renderSubtopics(container, uid, topicId, topicName) {
  if (!topicId) {
    navigate("topics");
    return;
  }

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
    <div id="subtopics-loading" class="animate-pulse text-muted text-sm">Loading…</div>
    <div id="subtopics-list" class="hidden"></div>
  `;

  document.getElementById("btn-back-topics")?.addEventListener("click", () => navigate("topics"));
  document.getElementById("btn-add-subtopic")?.addEventListener("click", () =>
    openSubtopicModal(uid, topicId, null, () => renderSubtopics(container, uid, topicId, topicName))
  );

  await loadSubtopics(container, uid, topicId, topicName);

  return { cleanup: () => {} };
}

async function loadSubtopics(container, uid, topicId, topicName) {
  try {
    const [subtopics, allTasks] = await Promise.all([
      getTopics(uid, topicId),
      getTasks(uid, { subjectId: topicId }),
    ]);

    document.getElementById("subtopics-loading")?.remove();
    const list = document.getElementById("subtopics-list");
    if (!list) return;
    list.classList.remove("hidden");
    list.innerHTML = "";

    if (subtopics.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="folder"></i></div>
          <div class="empty-title">No sub-topics yet</div>
          <div class="empty-desc">Tap "+ Sub-topic" to create sub-topics under this topic.</div>
        </div>`;
      return;
    }

    subtopics.forEach((subt, i) => {
      const tasks    = allTasks.filter((t) => t.topicId === subt.id);
      const done     = tasks.filter((t) => t.isCompleted).length;
      const rate     = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
      const isDone   = tasks.length > 0 && done === tasks.length;

      const card = document.createElement("div");
      card.className = "card mb-sm stagger-item";
      card.style.animationDelay = `${i * 40}ms`;
      card.innerHTML = `
        <div class="flex justify-between items-center mb-sm">
          <div class="flex items-center gap-sm">
            <span style="color:var(--accent)">
              <i data-lucide="${isDone ? "check-circle" : "file-text"}" style="width:20px;height:20px"></i>
            </span>
            <div class="font-bold">${escHtml(subt.name)}</div>
          </div>
          <div class="flex gap-sm">
            <button class="btn-icon btn-edit ripple" style="width:34px;height:34px" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>
            <button class="btn-icon btn-delete ripple" style="width:34px;height:34px" title="Delete"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
          </div>
        </div>
        <div class="text-muted text-sm mb-sm">${done}/${tasks.length} tasks completed</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${rate}%"></div></div>
      `;

      card.querySelector(".btn-edit").addEventListener("click", () =>
        openSubtopicModal(uid, topicId, subt, () => loadSubtopics(container, uid, topicId, topicName))
      );

      card.querySelector(".btn-delete").addEventListener("click", async () => {
        const confirmed = await showConfirmDialog(
          "Delete Sub-topic",
          `Delete sub-topic "${subt.name}"?`,
          "Delete",
          true
        );
        if (!confirmed) return;
        try {
          await deleteTopic(subt.id);
          showSnackbar("Sub-topic deleted", "success");
          loadSubtopics(container, uid, topicId, topicName);
        } catch (err) {
          showSnackbar("Failed to delete sub-topic", "error");
          console.error("Delete sub-topic error:", err);
        }
      });

      list.appendChild(card);
    });
  } catch (err) {
    showSnackbar("Failed to load sub-topics", "error");
    console.error("Load sub-topics error:", err);
    document.getElementById("subtopics-loading")?.remove();
    const list = document.getElementById("subtopics-list");
    if (list) {
      list.classList.remove("hidden");
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="alert-triangle"></i></div>
          <div class="empty-title">Something went wrong</div>
          <div class="empty-desc">Please try again.</div>
        </div>`;
    }
  }
}

// ── Sub-topic Modal ───────────────────────────────────────────────
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
        <input class="form-input" id="subtopic-name-input" value="${escHtml(existing?.name || "")}" placeholder="e.g. Chapter 3 - Trigonometry" />
      </div>
      <div id="subtopic-modal-err" class="form-error hidden"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary ripple" id="subtopic-cancel">Cancel</button>
        <button class="btn btn-primary ripple" id="subtopic-save">
          <span id="subtopic-save-text">${isEdit ? "Save" : "Create"}</span>
          <span id="subtopic-save-spinner" class="btn-spinner hidden"></span>
        </button>
      </div>
    </div>
  `;

  backdrop.querySelector("#subtopic-cancel").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector("#subtopic-save").addEventListener("click", async () => {
    const name = backdrop.querySelector("#subtopic-name-input").value.trim();
    const errEl = backdrop.querySelector("#subtopic-modal-err");
    const saveBtn = backdrop.querySelector("#subtopic-save");
    const saveText = backdrop.querySelector("#subtopic-save-text");
    const saveSpinner = backdrop.querySelector("#subtopic-save-spinner");

    if (!name) {
      errEl.textContent = "Sub-topic name is required.";
      errEl.classList.remove("hidden");
      return;
    }

    errEl.classList.add("hidden");
    saveBtn.disabled = true;
    saveText.textContent = isEdit ? "Saving…" : "Creating…";
    saveSpinner.classList.remove("hidden");

    try {
      if (isEdit) {
        await updateTopic(existing.id, { name });
        showSnackbar("Sub-topic updated", "success");
      } else {
        await createTopic(uid, { subjectId: topicId, name });
        showSnackbar("Sub-topic created", "success");
      }
      backdrop.remove();
      onSave();
    } catch (err) {
      saveBtn.disabled = false;
      saveText.textContent = isEdit ? "Save" : "Create";
      saveSpinner.classList.add("hidden");
      errEl.textContent = "Failed to save sub-topic. Try again.";
      errEl.classList.remove("hidden");
      showSnackbar("Failed to save sub-topic", "error");
      console.error("Save sub-topic error:", err);
    }
  });

  document.body.appendChild(backdrop);
  setTimeout(() => backdrop.querySelector("#subtopic-name-input")?.focus(), 150);
}

