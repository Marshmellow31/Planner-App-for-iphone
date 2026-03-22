// ============================================================
// pages/topics.js — Topics page (per subject)
// ============================================================

import { getTopics, createTopic, updateTopic, deleteTopic, getTasks } from "../db.js";
import { navigate } from "../app.js";
import { escHtml } from "./dashboard.js";

export async function renderTopics(container, uid, subjectId, subjectName) {
  if (!subjectId) {
    navigate("subjects");
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="flex items-center gap-sm">
        <button class="btn-icon" id="btn-back-subjects" style="font-size:20px;background:none;border:none;color:var(--text-primary)">←</button>
        <div>
          <div class="text-muted text-sm">Subject</div>
          <h2 class="page-title" style="font-size:var(--font-size-xl)">${escHtml(subjectName || "Topics")}</h2>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-add-topic">+ Topic</button>
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
        <div class="empty-icon">🗂</div>
        <div class="empty-title">No topics yet</div>
        <div class="empty-desc">Tap "+ Topic" to create topics under this subject.</div>
      </div>`;
    return;
  }

  topics.forEach((topic) => {
    const tasks    = allTasks.filter((t) => t.topicId === topic.id);
    const done     = tasks.filter((t) => t.isCompleted).length;
    const rate     = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
    const isDone   = tasks.length > 0 && done === tasks.length;

    const card = document.createElement("div");
    card.className = "card mb-sm";
    card.innerHTML = `
      <div class="flex justify-between items-center mb-sm">
        <div class="flex items-center gap-sm">
          <span style="font-size:20px">${isDone ? "✅" : "📄"}</span>
          <div class="font-bold">${escHtml(topic.name)}</div>
        </div>
        <div class="flex gap-sm">
          <button class="btn-icon btn-edit" style="width:34px;height:34px;font-size:14px" title="Edit">✏️</button>
          <button class="btn-icon btn-delete" style="width:34px;height:34px;font-size:14px" title="Delete">🗑</button>
        </div>
      </div>
      <div class="text-muted text-sm mb-sm">${done}/${tasks.length} tasks completed</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${rate}%"></div></div>
    `;

    card.querySelector(".btn-edit").addEventListener("click", () =>
      openTopicModal(uid, subjectId, topic, () => loadTopics(container, uid, subjectId, subjectName))
    );

    card.querySelector(".btn-delete").addEventListener("click", async () => {
      if (!confirm(`Delete topic "${topic.name}"?`)) return;
      await deleteTopic(topic.id);
      loadTopics(container, uid, subjectId, subjectName);
    });

    list.appendChild(card);
  });
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
      <div class="modal-actions">
        <button class="btn btn-secondary" id="topic-cancel">Cancel</button>
        <button class="btn btn-primary" id="topic-save">${isEdit ? "Save" : "Create"}</button>
      </div>
    </div>
  `;

  backdrop.querySelector("#topic-cancel").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector("#topic-save").addEventListener("click", async () => {
    const name = backdrop.querySelector("#topic-name-input").value.trim();
    if (!name) return;
    if (isEdit) await updateTopic(existing.id, { name });
    else await createTopic(uid, { subjectId, name });
    backdrop.remove();
    onSave();
  });

  document.body.appendChild(backdrop);
  setTimeout(() => backdrop.querySelector("#topic-name-input")?.focus(), 150);
}
