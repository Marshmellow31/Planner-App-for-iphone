// ============================================================
// pages/subjects.js — Subjects CRUD page
// ============================================================

import { getSubjects, createSubject, updateSubject, deleteSubject, getTopics, getTasks } from "../db.js";
import { navigate } from "../app.js";
import { escHtml } from "./dashboard.js";
import { showSnackbar, showConfirmDialog } from "../snackbar.js";

const COLORS = ["#6c63ff","#ff6b81","#ffa502","#2ed573","#1e90ff","#ff6348","#7bed9f","#eccc68"];

export async function renderSubjects(container, uid, profile) {
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Subjects</h1>
      <button class="btn btn-primary btn-sm ripple" id="btn-add-subject">+ Add</button>
    </div>
    <div id="subjects-loading" class="animate-pulse text-muted text-sm">Loading…</div>
    <div id="subjects-list" class="hidden"></div>
  `;

  document.getElementById("btn-add-subject")?.addEventListener("click", () =>
    openSubjectModal(uid, null, () => renderSubjects(container, uid, profile))
  );

  await loadSubjects(container, uid, profile);
}

async function loadSubjects(container, uid, profile) {
  try {
    const [subjects, allTopics, allTasks] = await Promise.all([
      getSubjects(uid),
      getTopics(uid),
      getTasks(uid),
    ]);

    document.getElementById("subjects-loading")?.remove();
    const list = document.getElementById("subjects-list");
    if (!list) return;
    list.classList.remove("hidden");
    list.innerHTML = "";

    if (subjects.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📖</div>
          <div class="empty-title">No subjects yet</div>
          <div class="empty-desc">Tap "+ Add" to create your first subject.</div>
        </div>`;
      return;
    }

    subjects.forEach((sub, index) => {
      const topics = allTopics.filter((t) => t.subjectId === sub.id);
      const tasks  = allTasks.filter((t) => t.subjectId === sub.id);
      const done   = tasks.filter((t) => t.isCompleted).length;
      const rate   = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

      const card = document.createElement("div");
      card.className = "subject-card mb-sm clickable stagger-item";
      card.style.setProperty("--subject-color", sub.color);
      card.style.animationDelay = `${index * 60}ms`;
      card.innerHTML = `
        <div class="flex justify-between items-center mb-sm">
          <div class="subject-name">${escHtml(sub.name)}</div>
          <div class="flex gap-sm">
            <button class="btn-icon btn-edit ripple" style="width:34px;height:34px;font-size:14px" title="Edit">✏️</button>
            <button class="btn-icon btn-delete ripple" style="width:34px;height:34px;font-size:14px" title="Delete">🗑</button>
          </div>
        </div>
        <div class="subject-stats">${topics.length} topic${topics.length !== 1 ? "s" : ""} · ${done}/${tasks.length} tasks done</div>
        <div class="progress-bar mt-sm"><div class="progress-fill" style="width:${rate}%"></div></div>
      `;

      card.addEventListener("click", (e) => {
        if (e.target.closest(".btn-edit") || e.target.closest(".btn-delete")) return;
        navigate("topics", { subjectId: sub.id, subjectName: sub.name });
      });

      card.querySelector(".btn-edit").addEventListener("click", (e) => {
        e.stopPropagation();
        openSubjectModal(uid, sub, () => renderSubjects(container, uid, profile));
      });

      card.querySelector(".btn-delete").addEventListener("click", async (e) => {
        e.stopPropagation();
        const confirmed = await showConfirmDialog(
          "Delete Subject",
          `Delete "${sub.name}" and all its topics? Tasks will remain.`,
          "Delete",
          true
        );
        if (!confirmed) return;
        try {
          await deleteSubject(sub.id);
          showSnackbar(`"${sub.name}" deleted`, "success");
          renderSubjects(container, uid, profile);
        } catch (err) {
          showSnackbar("Failed to delete subject", "error");
          console.error("Delete subject error:", err);
        }
      });

      list.appendChild(card);
    });
  } catch (err) {
    showSnackbar("Failed to load subjects", "error");
    console.error("Load subjects error:", err);
    document.getElementById("subjects-loading")?.remove();
    const list = document.getElementById("subjects-list");
    if (list) {
      list.classList.remove("hidden");
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Something went wrong</div>
          <div class="empty-desc">Please check your connection and try again.</div>
        </div>`;
    }
  }
}

// ── Subject Modal ─────────────────────────────────────────────
async function openSubjectModal(uid, existing, onSave) {
  const isEdit = !!existing;
  const selectedColor = existing?.color || COLORS[0];

  // Fetch existing subjects for duplicate check
  let existingSubjects = [];
  try {
    existingSubjects = await getSubjects(uid);
  } catch (_) {}

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="drawer" style="max-width:480px;margin:0 auto">
      <div class="drawer-handle"></div>
      <h3 class="modal-title">${isEdit ? "Edit Subject" : "New Subject"}</h3>
      <div class="form-group">
        <label class="form-label">Subject Name</label>
        <input class="form-input" id="sub-name-input" value="${escHtml(existing?.name || "")}" placeholder="e.g. Mathematics" />
      </div>
      <div id="sub-modal-err" class="form-error hidden"></div>
      <div class="form-group">
        <label class="form-label">Color</label>
        <div class="color-row" id="color-row"></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary ripple" id="sub-cancel">Cancel</button>
        <button class="btn btn-primary ripple" id="sub-save">
          <span id="sub-save-text">${isEdit ? "Save" : "Create"}</span>
          <span id="sub-save-spinner" class="btn-spinner hidden"></span>
        </button>
      </div>
    </div>
  `;

  // Color swatches
  const row = backdrop.querySelector("#color-row");
  let pickedColor = selectedColor;
  COLORS.forEach((c) => {
    const sw = document.createElement("button");
    sw.className = "color-swatch" + (c === selectedColor ? " selected" : "");
    sw.style.background = c;
    sw.title = c;
    sw.addEventListener("click", () => {
      row.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("selected"));
      sw.classList.add("selected");
      pickedColor = c;
    });
    row.appendChild(sw);
  });

  backdrop.querySelector("#sub-cancel").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector("#sub-save").addEventListener("click", async () => {
    const name = backdrop.querySelector("#sub-name-input").value.trim();
    const errEl = backdrop.querySelector("#sub-modal-err");
    const saveBtn = backdrop.querySelector("#sub-save");
    const saveText = backdrop.querySelector("#sub-save-text");
    const saveSpinner = backdrop.querySelector("#sub-save-spinner");

    // Validate empty
    if (!name) {
      errEl.textContent = "Subject name is required.";
      errEl.classList.remove("hidden");
      return;
    }

    // Validate duplicate
    const isDuplicate = existingSubjects.some(
      (s) => s.name.toLowerCase() === name.toLowerCase() && (!isEdit || s.id !== existing.id)
    );
    if (isDuplicate) {
      errEl.textContent = `A subject named "${name}" already exists.`;
      errEl.classList.remove("hidden");
      return;
    }

    errEl.classList.add("hidden");

    // Show loading
    saveBtn.disabled = true;
    saveText.textContent = isEdit ? "Saving…" : "Creating…";
    saveSpinner.classList.remove("hidden");

    try {
      if (isEdit) {
        await updateSubject(existing.id, { name, color: pickedColor });
        showSnackbar("Subject updated!", "success");
      } else {
        await createSubject(uid, { name, color: pickedColor });
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
      showSnackbar("Failed to save subject", "error");
      console.error("Save subject error:", err);
    }
  });

  document.body.appendChild(backdrop);
  setTimeout(() => backdrop.querySelector("#sub-name-input")?.focus(), 150);
}
