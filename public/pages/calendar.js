// ============================================================
// pages/calendar.js — Academic Calendar with Indian festivals
// ============================================================
import { getSemesterData, saveSemesterData, getCustomEvents, saveCustomEvents } from "../db.js";
import { showSnackbar } from "../snackbar.js";
import { escHtml } from "./dashboard.js";

// ── Indian Festival Database (2025–2026) ─────────────────────
const INDIAN_FESTIVALS = {
  "2025-01-14": [{ title: "Makar Sankranti", icon: "🪁" }],
  "2025-01-23": [{ title: "Netaji Jayanti", icon: "🇮🇳" }],
  "2025-01-26": [{ title: "Republic Day", icon: "🇮🇳" }],
  "2025-02-02": [{ title: "Basant Panchami", icon: "🌸" }],
  "2025-02-19": [{ title: "Chhatrapati Shivaji Jayanti", icon: "⚔️" }],
  "2025-02-26": [{ title: "Maha Shivaratri", icon: "🕉️" }],
  "2025-03-14": [{ title: "Holi", icon: "🎨" }],
  "2025-03-30": [{ title: "Ram Navami", icon: "🙏" }],
  "2025-04-06": [{ title: "Mahavir Jayanti", icon: "🏛️" }],
  "2025-04-14": [{ title: "Ambedkar Jayanti / Baisakhi", icon: "🌾" }],
  "2025-04-18": [{ title: "Good Friday", icon: "✝️" }],
  "2025-05-12": [{ title: "Buddha Purnima", icon: "☸️" }],
  "2025-06-07": [{ title: "Eid ul-Adha", icon: "🌙" }],
  "2025-07-06": [{ title: "Rath Yatra", icon: "🎪" }],
  "2025-08-09": [{ title: "Muharram", icon: "🌙" }],
  "2025-08-15": [{ title: "Independence Day", icon: "🇮🇳" }],
  "2025-08-16": [{ title: "Janmashtami", icon: "🪔" }],
  "2025-08-27": [{ title: "Ganesh Chaturthi", icon: "🐘" }],
  "2025-09-05": [{ title: "Onam / Teachers Day", icon: "📚" }],
  "2025-10-02": [{ title: "Gandhi Jayanti / Navratri", icon: "🇮🇳" }],
  "2025-10-02": [{ title: "Gandhi Jayanti", icon: "🇮🇳" }],
  "2025-10-12": [{ title: "Navratri starts", icon: "🎉" }],
  "2025-10-20": [{ title: "Dussehra", icon: "🏹" }],
  "2025-10-20": [{ title: "Dussehra", icon: "🏹" }],
  "2025-10-31": [{ title: "Halloween / Sardar Patel Jayanti", icon: "🎃" }],
  "2025-11-01": [{ title: "Diwali", icon: "🪔" }],
  "2025-11-05": [{ title: "Bhai Dooj", icon: "🎁" }],
  "2025-11-15": [{ title: "Guru Nanak Jayanti", icon: "🙏" }],
  "2025-12-25": [{ title: "Christmas", icon: "🎄" }],
  "2026-01-14": [{ title: "Makar Sankranti", icon: "🪁" }],
  "2026-01-26": [{ title: "Republic Day", icon: "🇮🇳" }],
  "2026-03-03": [{ title: "Holi", icon: "🎨" }],
  "2026-03-19": [{ title: "Maha Shivaratri", icon: "🕉️" }],
  "2026-04-14": [{ title: "Baisakhi", icon: "🌾" }],
  "2026-08-15": [{ title: "Independence Day", icon: "🇮🇳" }],
  "2026-10-02": [{ title: "Gandhi Jayanti", icon: "🇮🇳" }],
  "2026-10-19": [{ title: "Diwali", icon: "🪔" }],
  "2026-12-25": [{ title: "Christmas", icon: "🎄" }],
};

function dateKeyFromParts(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str + "T00:00:00");
  return isNaN(d) ? null : d;
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

export async function renderCalendar(container, uid) {
  let semData = {};
  let customEvents = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();

  async function load() {
    [semData, customEvents] = await Promise.all([getSemesterData(uid), getCustomEvents(uid)]);
  }

  function renderSemVisualizer() {
    const el = document.getElementById("sem-visualizer");
    if (!el) return;
    const semStart = parseDate(semData.semStart);
    const semEnd = parseDate(semData.semEnd);
    const examStart = parseDate(semData.examStart);
    const examEnd = parseDate(semData.examEnd);

    if (!semStart || !semEnd || semEnd <= semStart) {
      el.innerHTML = `
        <div class="sem-vis-empty">
          <i data-lucide="calendar-x" style="width:28px;height:28px;color:var(--text-muted)"></i>
          <p class="text-muted text-sm" style="margin-top:8px">Set up your semester below to see progress</p>
        </div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const totalDays = daysBetween(semStart, semEnd);
    const elapsed = Math.min(Math.max(daysBetween(semStart, today), 0), totalDays);
    const remaining = totalDays - elapsed;
    const pct = Math.round((elapsed / totalDays) * 100);

    // Build segment percentages
    const examPct = examStart && examEnd && examStart >= semStart && examEnd <= semEnd
      ? { left: (daysBetween(semStart, examStart) / totalDays) * 100, width: (daysBetween(examStart, examEnd) / totalDays) * 100 }
      : null;

    const todayPct = (elapsed / totalDays) * 100;

    // Vacations
    const vacSegs = (semData.vacations || [])
      .filter(v => parseDate(v.from) && parseDate(v.to))
      .map(v => ({
        label: v.name || "Holiday",
        left: (daysBetween(semStart, parseDate(v.from)) / totalDays) * 100,
        width: (daysBetween(parseDate(v.from), parseDate(v.to)) / totalDays) * 100,
      }));

    el.innerHTML = `
      <div class="sem-vis-header">
        <span class="sem-vis-title">${escHtml(semData.semName || "Current Semester")}</span>
        <span class="sem-vis-badge">${pct}% done</span>
      </div>
      <div class="sem-vis-bar-wrap">
        <!-- grey base -->
        <div class="sem-vis-bar-base"></div>
        <!-- completed (purple) -->
        <div class="sem-vis-seg completed-seg" style="width:${todayPct}%"></div>
        <!-- vacation segs (green) -->
        ${vacSegs.map(v => `<div class="sem-vis-seg vac-seg" style="left:${v.left}%;width:${v.width}%" title="${escHtml(v.label)}"></div>`).join("")}
        <!-- exam seg (orange) -->
        ${examPct ? `<div class="sem-vis-seg exam-seg" style="left:${examPct.left}%;width:${examPct.width}%"></div>` : ""}
        <!-- today marker -->
        <div class="sem-vis-today-marker" style="left:${todayPct}%"><div class="sem-vis-today-dot"></div></div>
      </div>
      <div class="sem-vis-meta">
        <span>${semStart.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>
        <div class="sem-vis-legend">
          <span class="vis-legend-dot completed-dot"></span>Done
          ${examPct ? `<span class="vis-legend-dot exam-dot"></span>Exams` : ""}
          ${vacSegs.length ? `<span class="vis-legend-dot vac-dot"></span>Vacation` : ""}
        </div>
        <span>${semEnd.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>
      </div>
      <div class="sem-vis-stats-row">
        <div class="sem-vis-stat"><div class="vis-stat-num">${elapsed}</div><div class="vis-stat-label">Days Done</div></div>
        <div class="sem-vis-stat"><div class="vis-stat-num">${remaining}</div><div class="vis-stat-label">Days Left</div></div>
        <div class="sem-vis-stat"><div class="vis-stat-num">${totalDays}</div><div class="vis-stat-label">Total Days</div></div>
        <div class="sem-vis-stat"><div class="vis-stat-num">${pct}%</div><div class="vis-stat-label">Progress</div></div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  function renderMonthGrid() {
    const gridEl = document.getElementById("cal-month-grid");
    if (!gridEl) return;
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const monthName = new Date(viewYear, viewMonth).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const semStart = parseDate(semData.semStart);
    const semEnd = parseDate(semData.semEnd);
    const examStart = parseDate(semData.examStart);
    const examEnd = parseDate(semData.examEnd);
    const vacRanges = (semData.vacations || []).map(v => ({ from: parseDate(v.from), to: parseDate(v.to), name: v.name }));

    let html = `
      <div class="cal-nav">
        <button class="btn btn-ghost btn-sm" id="cal-prev"><i data-lucide="chevron-left" style="width:18px;height:18px"></i></button>
        <span class="cal-month-label">${monthName}</span>
        <button class="btn btn-ghost btn-sm" id="cal-next"><i data-lucide="chevron-right" style="width:18px;height:18px"></i></button>
      </div>
      <div class="cal-grid">
        ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>`<div class="cal-dow">${d}</div>`).join("")}
    `;

    for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKeyFromParts(viewYear, viewMonth, d);
      const cellDate = new Date(viewYear, viewMonth, d);
      const isToday = cellDate.getTime() === today.getTime();
      const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
      const inSem = semStart && semEnd && cellDate >= semStart && cellDate <= semEnd;
      const inExam = examStart && examEnd && cellDate >= examStart && cellDate <= examEnd;
      const inVac = vacRanges.find(v => v.from && v.to && cellDate >= v.from && cellDate <= v.to);
      const festivals = INDIAN_FESTIVALS[key] || [];
      const customEvts = customEvents[key] || [];
      const paperDates = (semData.paperDates || []).filter(p => p.date === key);

      let classes = "cal-cell";
      if (isToday) classes += " cal-today";
      if (isWeekend) classes += " cal-weekend";
      if (inSem && !inExam && !inVac) classes += " in-sem";
      if (inExam) classes += " in-exam";
      if (inVac) classes += " in-vac";

      const chips = [
        ...festivals.map(f => `<div class="cal-chip festival-chip">${f.icon} ${f.title}</div>`),
        ...paperDates.map(p => `<div class="cal-chip exam-chip">📝 ${escHtml(p.name)}</div>`),
        ...customEvts.map(ev => `<div class="cal-chip custom-chip">✨ ${escHtml(ev.title)}</div>`),
        inVac ? `<div class="cal-chip vac-chip">🏖️ ${escHtml(inVac.name)}</div>` : "",
      ].join("");

      html += `
        <div class="${classes}" data-key="${key}">
          <div class="cal-day-num ${isWeekend ? "weekend-num" : ""}">${d}</div>
          ${inExam ? `<div class="cal-exam-tag">EXAM</div>` : ""}
          ${chips ? `<div class="cal-chips">${chips}</div>` : ""}
        </div>
      `;
    }
    html += `</div>`;
    gridEl.innerHTML = html;

    document.getElementById("cal-prev")?.addEventListener("click", () => {
      viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      renderMonthGrid();
    });
    document.getElementById("cal-next")?.addEventListener("click", () => {
      viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      renderMonthGrid();
    });
    if (window.lucide) window.lucide.createIcons();
  }

  function renderSetupForm() {
    const formEl = document.getElementById("sem-setup-form");
    if (!formEl) return;
    const vacs = semData.vacations || [];
    const papers = semData.paperDates || [];

    formEl.innerHTML = `
      <div class="setup-section-title"><i data-lucide="settings" style="width:16px;height:16px;margin-right:6px"></i>Semester Setup</div>
      <div class="form-group">
        <label class="form-label">Semester Name</label>
        <input type="text" id="sem-name" class="form-input" value="${escHtml(semData.semName||"")}" placeholder="e.g. Semester 4 (Jan–May 2025)" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Semester Start</label>
          <input type="date" id="sem-start" class="form-input" value="${semData.semStart||""}" />
        </div>
        <div class="form-group">
          <label class="form-label">Semester End</label>
          <input type="date" id="sem-end" class="form-input" value="${semData.semEnd||""}" />
        </div>
        <div class="form-group">
          <label class="form-label">Exam Period Start</label>
          <input type="date" id="exam-start" class="form-input" value="${semData.examStart||""}" />
        </div>
        <div class="form-group">
          <label class="form-label">Exam Period End</label>
          <input type="date" id="exam-end" class="form-input" value="${semData.examEnd||""}" />
        </div>
      </div>

      <div class="setup-section-title" style="margin-top:var(--space-md)">Vacations</div>
      <div id="vac-list">
        ${vacs.map((v, i) => `
          <div class="vac-row" data-i="${i}">
            <input type="text" class="form-input vac-name" value="${escHtml(v.name)}" placeholder="Vacation name" style="flex:2;font-size:13px"/>
            <input type="date" class="form-input vac-from" value="${v.from||""}" style="flex:1;font-size:13px"/>
            <input type="date" class="form-input vac-to" value="${v.to||""}" style="flex:1;font-size:13px"/>
            <button class="btn btn-ghost btn-sm remove-vac" data-i="${i}"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
          </div>`).join("")}
      </div>
      <button class="btn btn-ghost btn-sm" id="btn-add-vac" style="margin-top:8px">
        <i data-lucide="plus" style="width:14px;height:14px;margin-right:4px"></i> Add Vacation
      </button>

      <div class="setup-section-title" style="margin-top:var(--space-md)">Paper / Exam Dates</div>
      <div id="paper-list">
        ${papers.map((p, i) => `
          <div class="paper-row" data-i="${i}">
            <input type="text" class="form-input paper-name" value="${escHtml(p.name)}" placeholder="Subject / Paper" style="flex:2;font-size:13px"/>
            <input type="date" class="form-input paper-date" value="${p.date||""}" style="flex:1;font-size:13px"/>
            <button class="btn btn-ghost btn-sm remove-paper" data-i="${i}"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
          </div>`).join("")}
      </div>
      <button class="btn btn-ghost btn-sm" id="btn-add-paper" style="margin-top:8px">
        <i data-lucide="plus" style="width:14px;height:14px;margin-right:4px"></i> Add Exam Date
      </button>

      <button class="btn btn-primary btn-full ripple" id="btn-save-sem" style="margin-top:var(--space-md)">
        <i data-lucide="save" style="width:16px;height:16px;margin-right:6px"></i>Save & Update Calendar
      </button>
    `;

    // Add vac
    document.getElementById("btn-add-vac")?.addEventListener("click", () => {
      semData.vacations = semData.vacations || [];
      semData.vacations.push({ name: "", from: "", to: "" });
      renderSetupForm();
    });

    // Remove vac
    formEl.querySelectorAll(".remove-vac").forEach(btn => {
      btn.addEventListener("click", () => {
        semData.vacations.splice(Number(btn.dataset.i), 1);
        renderSetupForm();
      });
    });

    // Add paper
    document.getElementById("btn-add-paper")?.addEventListener("click", () => {
      semData.paperDates = semData.paperDates || [];
      semData.paperDates.push({ name: "", date: "" });
      renderSetupForm();
    });

    // Remove paper
    formEl.querySelectorAll(".remove-paper").forEach(btn => {
      btn.addEventListener("click", () => {
        semData.paperDates.splice(Number(btn.dataset.i), 1);
        renderSetupForm();
      });
    });

    // Save
    document.getElementById("btn-save-sem")?.addEventListener("click", async () => {
      // Collect form values
      semData.semName = document.getElementById("sem-name")?.value.trim();
      semData.semStart = document.getElementById("sem-start")?.value;
      semData.semEnd = document.getElementById("sem-end")?.value;
      semData.examStart = document.getElementById("exam-start")?.value;
      semData.examEnd = document.getElementById("exam-end")?.value;

      // Collect vacations
      semData.vacations = [...formEl.querySelectorAll(".vac-row")].map(row => ({
        name: row.querySelector(".vac-name")?.value.trim() || "",
        from: row.querySelector(".vac-from")?.value || "",
        to: row.querySelector(".vac-to")?.value || "",
      }));

      // Collect papers
      semData.paperDates = [...formEl.querySelectorAll(".paper-row")].map(row => ({
        name: row.querySelector(".paper-name")?.value.trim() || "",
        date: row.querySelector(".paper-date")?.value || "",
      }));

      try {
        await saveSemesterData(uid, semData);
        showSnackbar("Semester saved!", "success");
        renderSemVisualizer();
        renderMonthGrid();
      } catch (err) {
        showSnackbar("Failed to save semester", "error");
      }
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Scaffold the page
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Academic Calendar</h1>
    </div>

    <!-- Semester Visualizer -->
    <div class="card mb-md" id="sem-visualizer"></div>

    <!-- Month Grid -->
    <div class="card mb-md" id="cal-month-grid"></div>

    <!-- Setup Form -->
    <div class="card" id="sem-setup-form"></div>
  `;

  await load();
  renderSemVisualizer();
  renderMonthGrid();
  renderSetupForm();
}
