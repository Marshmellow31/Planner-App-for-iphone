// ============================================================
// pages/topics.js — Topics page (per subject)
// ============================================================

import { getTopics, createTopic, updateTopic, deleteTopic, getTasks } from "../db.js";
import { navigate } from "../app.js";
import { escHtml } from "./dashboard.js";
import { showSnackbar, showConfirmDialog } from "../snackbar.js";

export async function renderTopics(container, uid, subjectId, subjectName) {
  if (!subjectId) {
    navigate("subjects");
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="flex items-center gap-sm">
        <button class="btn-icon ripple" id="btn-back-subjects" style="background:none;border:none;color:var(--text-primary)"><i data-lucide="arrow-left"></i></button>
        <div>
          <div class="text-muted text-sm">Subject</div>
          <h2 class="page-title" style="font-size:var(--font-size-xl)">${escHtml(subjectName || "Topics")}</h2>
        </div>
      </div>
      <button class="btn btn-primary btn-sm ripple" id="btn-add-topic" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="plus" style="width:16px;height:16px"></i> Topic</button>
    </div>
    <div id="topics-loading" class="animate-pulse text-muted text-sm">Loading…</div>
    <div id="topics-list" class="hidden"></div>
  `;

  document.getElementById("btn-back-subjects")?.addEventListener("click", () => navigate("subjects"));
  document.getElementById("btn-add-topic")?.addEventListener("click", () =>
    openTopicModal(uid, subjectId, null, () => renderTopics(container, uid, subjectId, subjectName))
  );

  await loadTopics(container, uid, subjectId, subjectName);
}

async function loadTopics(container, uid, subjectId, subjectName) {
  try {
    const [topics, allTasks] = await Promise.all([
      getTopics(uid, subjectId),
      getTasks(uid, { subjectId }),
    ]);

    document.getElementById("topics-loading")?.remove();
    const list = document.getElementById("topics-list");
    if (!list) return;
    list.classList.remove("hidden");
    list.innerHTML = "";

    if (topics.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="folder"></i></div>
          <div class="empty-title">No topics yet</div>
          <div class="empty-desc">Tap "+ Topic" to create topics under this subject.</div>
        </div>`;
      return;
    }

    topics.forEach((topic, i) => {
      const tasks    = allTasks.filter((t) => t.topicId === topic.id);
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
            <div class="font-bold">${escHtml(topic.name)}</div>
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
        openTopicModal(uid, subjectId, topic, () => loadTopics(container, uid, subjectId, subjectName))
      );

      card.querySelector(".btn-delete").addEventListener("click", async () => {
        const confirmed = await showConfirmDialog(
          "Delete Topic",
          `Delete topic "${topic.name}"?`,
          "Delete",
          true
        );
        if (!confirmed) return;
        try {
          await deleteTopic(topic.id);
          showSnackbar("Topic deleted", "success");
          loadTopics(container, uid, subjectId, subjectName);
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
          <div class="empty-desc">Please try again.</div>
        </div>`;
    }
  }
}

// ── Topic Modal ───────────────────────────────────────────────
function openTopicModal(uid, subjectId, existing, onSave) {
  const isEdit = !!existing;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="drawer" style="max-width:480px;margin:0 auto">
      <div class="drawer-handle"></div>
      <h3 class="modal-title">${isEdit ? "Edit Topic" : "New Topic"}</h3>
      <div class="form-group">
        <label class="form-label">Topic Name</label>
        <input class="form-input" id="topic-name-input" value="${escHtml(existing?.name || "")}" placeholder="e.g. Chapter 3 - Trigonometry" />
      </div>
      <div id="topic-modal-err" class="form-error hidden"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary ripple" id="topic-cancel">Cancel</button>
        <button class="btn btn-primary ripple" id="topic-save">
          <span id="topic-save-text">${isEdit ? "Save" : "Create"}</span>
          <span id="topic-save-spinner" class="btn-spinner hidden"></span>
        </button>
      </div>
    </div>
  `;

  backdrop.querySelector("#topic-cancel").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector("#topic-save").addEventListener("click", async () => {
    const name = backdrop.querySelector("#topic-name-input").value.trim();
    const errEl = backdrop.querySelector("#topic-modal-err");
    const saveBtn = backdrop.querySelector("#topic-save");
    const saveText = backdrop.querySelector("#topic-save-text");
    const saveSpinner = backdrop.querySelector("#topic-save-spinner");

    if (!name) {
      errEl.textContent = "Topic name is required.";
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
        showSnackbar("Topic updated", "success");
      } else {
        await createTopic(uid, { subjectId, name });
        showSnackbar("Topic created", "success");
      }
      backdrop.remove();
      onSave();
    } catch (err) {
      saveBtn.disabled = false;
      saveText.textContent = isEdit ? "Save" : "Create";
      saveSpinner.classList.add("hidden");
      errEl.textContent = "Failed to save topic. Try again.";
      errEl.classList.remove("hidden");
      showSnackbar("Failed to save topic", "error");
      console.error("Save topic error:", err);
    }
  });

  document.body.appendChild(backdrop);
  setTimeout(() => backdrop.querySelector("#topic-name-input")?.focus(), 150);
}
