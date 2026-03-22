// ============================================================
// pages/diary.js — Daily Diary page
// ============================================================
import { getDiaryEntry, saveDiaryEntry, getDiaryMonth } from "../db.js";
import { showSnackbar } from "../snackbar.js";
import { escHtml } from "./dashboard.js";

const MOODS = ["😭", "😕", "😐", "🙂", "😄"];
const MOOD_LABELS = ["Terrible", "Bad", "Okay", "Good", "Great"];
const DEFAULT_MILESTONES = [
  "Drank 8 glasses of water",
  "Exercised / walked",
  "Studied on schedule",
  "Read something",
  "Slept before midnight",
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function yearMonthStr(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function formatDisplayDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export async function renderDiary(container, uid) {
  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedDate = todayKey();

  // Load current month's entry dots and today's entry
  let monthEntries = {};
  let currentEntry = null;

  async function loadMonth() {
    monthEntries = await getDiaryMonth(uid, yearMonthStr(viewYear, viewMonth));
  }

  async function loadEntry(dateStr) {
    currentEntry = await getDiaryEntry(uid, dateStr);
    if (!currentEntry) {
      currentEntry = {
        mood: 2,
        milestones: DEFAULT_MILESTONES.map((m) => ({ label: m, done: false })),
        expenses: [],
        journal: "",
      };
    }
    renderEntryPanel();
  }

  function renderMiniCal() {
    const calEl = document.getElementById("diary-mini-cal");
    if (!calEl) return;
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const monthName = new Date(viewYear, viewMonth).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    let html = `
      <div class="diary-cal-header">
        <button class="btn btn-ghost btn-sm" id="diary-prev-month"><i data-lucide="chevron-left" style="width:18px;height:18px"></i></button>
        <span class="diary-cal-month">${monthName}</span>
        <button class="btn btn-ghost btn-sm" id="diary-next-month"><i data-lucide="chevron-right" style="width:18px;height:18px"></i></button>
      </div>
      <div class="diary-cal-grid">
        <div class="diary-cal-dow">S</div><div class="diary-cal-dow">M</div><div class="diary-cal-dow">T</div>
        <div class="diary-cal-dow">W</div><div class="diary-cal-dow">T</div><div class="diary-cal-dow">F</div>
        <div class="diary-cal-dow">S</div>
    `;
    for (let i = 0; i < firstDay; i++) html += `<div></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(viewYear, viewMonth, d);
      const isToday = key === todayKey();
      const isSel = key === selectedDate;
      const hasEntry = !!monthEntries[key];
      html += `
        <div class="diary-cal-day ${isToday ? "is-today" : ""} ${isSel ? "is-selected" : ""}" data-key="${key}">
          ${d}
          ${hasEntry ? `<span class="diary-dot"></span>` : ""}
        </div>`;
    }
    html += `</div>`;
    calEl.innerHTML = html;

    document.getElementById("diary-prev-month")?.addEventListener("click", () => {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      loadMonth().then(renderMiniCal);
    });
    document.getElementById("diary-next-month")?.addEventListener("click", () => {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      loadMonth().then(renderMiniCal);
    });

    calEl.querySelectorAll(".diary-cal-day").forEach((el) => {
      el.addEventListener("click", () => {
        selectedDate = el.dataset.key;
        renderMiniCal();
        loadEntry(selectedDate);
      });
    });
    if (window.lucide) window.lucide.createIcons();
  }

  function renderEntryPanel() {
    const panel = document.getElementById("diary-entry-panel");
    if (!panel) return;
    const e = currentEntry;
    const moodIdx = e.mood ?? 2;
    const milestones = e.milestones || DEFAULT_MILESTONES.map((m) => ({ label: m, done: false }));
    const expenses = e.expenses || [];
    const doneMilestones = milestones.filter((m) => m.done).length;
    const score = milestones.length > 0 ? Math.round((doneMilestones / milestones.length) * 100) : 0;

    panel.innerHTML = `
      <div class="diary-entry-date">${formatDisplayDate(selectedDate)}</div>

      <!-- Mood -->
      <div class="diary-section-label">How was your day?</div>
      <div class="diary-mood-row" id="diary-mood-row">
        ${MOODS.map((em, i) => `
          <button class="diary-mood-btn ${i === moodIdx ? "active" : ""}" data-i="${i}" title="${MOOD_LABELS[i]}">
            <span>${em}</span>
            <span style="font-size:10px;display:block;color:var(--text-muted)">${MOOD_LABELS[i]}</span>
          </button>`).join("")}
      </div>

      <!-- Day Score -->
      <div class="diary-section-label">Day Score — ${score}%</div>
      <div class="diary-score-bar mb-sm">
        <div class="diary-score-fill" style="width:${score}%"></div>
      </div>

      <!-- Milestones -->
      <div class="diary-section-label" style="margin-bottom:4px">Milestones</div>
      <div id="diary-milestones">
        ${milestones.map((m, i) => `
          <div class="diary-milestone-item" data-i="${i}">
            <label class="diary-milestone-check">
              <input type="checkbox" class="milestone-cb" data-i="${i}" ${m.done ? "checked" : ""}/>
              <span class="diary-milestone-label ${m.done ? "done" : ""}">${escHtml(m.label)}</span>
            </label>
            <button class="diary-milestone-del btn btn-ghost btn-sm" data-i="${i}" title="Remove">×</button>
          </div>`).join("")}
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input type="text" id="new-milestone-input" class="form-input" style="font-size:13px;flex:1" placeholder="Add milestone…" />
        <button class="btn btn-primary btn-sm" id="btn-add-milestone">Add</button>
      </div>

      <!-- Expenses -->
      <div class="diary-section-label" style="margin-top:var(--space-md)">Expenses</div>
      <div id="diary-expenses">
        ${expenses.map((ex, i) => `
          <div class="diary-expense-row" data-i="${i}">
            <span class="diary-expense-desc">${escHtml(ex.desc)}</span>
            <span class="diary-expense-amt">₹${ex.amount}</span>
            <button class="diary-expense-del btn btn-ghost btn-sm" data-i="${i}">×</button>
          </div>`).join("")}
        ${expenses.length === 0 ? `<div class="text-muted text-sm" style="padding:8px 0">No expenses today.</div>` : ""}
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
        <input type="text" id="exp-desc-input" class="form-input" style="font-size:13px;flex:2" placeholder="What for?" />
        <input type="number" id="exp-amt-input" class="form-input" style="font-size:13px;flex:1;max-width:90px" placeholder="₹0" min="0" />
        <button class="btn btn-primary btn-sm" id="btn-add-expense">Add</button>
      </div>
      <div class="diary-expense-total">Total: ₹${expenses.reduce((a, b) => a + Number(b.amount || 0), 0)}</div>

      <!-- Journal -->
      <div class="diary-section-label" style="margin-top:var(--space-md)">Journal</div>
      <textarea id="diary-journal" class="diary-journal" rows="5" placeholder="Write about your day…">${escHtml(e.journal || "")}</textarea>

      <button class="btn btn-primary btn-full ripple" id="btn-save-diary" style="margin-top:var(--space-md)">
        <i data-lucide="save" style="width:16px;height:16px;margin-right:6px"></i>
        Save Entry
      </button>
    `;

    // Mood
    panel.querySelectorAll(".diary-mood-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentEntry.mood = Number(btn.dataset.i);
        renderEntryPanel();
      });
    });

    // Milestone checkboxes
    panel.querySelectorAll(".milestone-cb").forEach((cb) => {
      cb.addEventListener("change", () => {
        currentEntry.milestones[Number(cb.dataset.i)].done = cb.checked;
        renderEntryPanel();
      });
    });

    // Milestone delete
    panel.querySelectorAll(".diary-milestone-del").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentEntry.milestones.splice(Number(btn.dataset.i), 1);
        renderEntryPanel();
      });
    });

    // Add milestone
    document.getElementById("btn-add-milestone")?.addEventListener("click", () => {
      const val = document.getElementById("new-milestone-input")?.value.trim();
      if (!val) return;
      currentEntry.milestones.push({ label: val, done: false });
      renderEntryPanel();
    });

    // Add expense
    document.getElementById("btn-add-expense")?.addEventListener("click", () => {
      const desc = document.getElementById("exp-desc-input")?.value.trim();
      const amt = parseFloat(document.getElementById("exp-amt-input")?.value || "0");
      if (!desc) return;
      currentEntry.expenses.push({ desc, amount: amt });
      renderEntryPanel();
    });

    // Delete expense
    panel.querySelectorAll(".diary-expense-del").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentEntry.expenses.splice(Number(btn.dataset.i), 1);
        renderEntryPanel();
      });
    });

    // Save
    document.getElementById("btn-save-diary")?.addEventListener("click", async () => {
      currentEntry.journal = document.getElementById("diary-journal")?.value || "";
      try {
        await saveDiaryEntry(uid, selectedDate, currentEntry);
        monthEntries[selectedDate] = currentEntry;
        renderMiniCal();
        showSnackbar("Diary entry saved", "success");
      } catch (err) {
        showSnackbar("Failed to save entry", "error");
      }
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Scaffold
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">My Diary</h1>
    </div>
    <div id="diary-mini-cal" class="diary-mini-cal card mb-md"></div>
    <div id="diary-entry-panel" class="card diary-entry-panel"></div>
  `;

  await loadMonth();
  renderMiniCal();
  await loadEntry(selectedDate);
}
