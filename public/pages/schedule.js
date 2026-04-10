import { getScheduleBlocks, updateScheduleBlock, createScheduleBlock, deleteScheduleBlock } from "../db.js";
import { showSnackbar, showConfirmDialog } from "../snackbar.js";
import { startFocusSession } from "../utils/focusEngine.js";

// Layout Constants
const HOUR_HEIGHT = 100; // Must match --hour-height in CSS
const TIMELINE_LEFT_OFFSET = 70; // Must match .hour-label + padding in CSS

export async function renderSchedule(container, uid, profile, cachedData) {
  let blocks = cachedData || [];
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

  // 1. Initial Shell
  container.innerHTML = `
    <div class="schedule-tab-container fade-in">
      <div class="schedule-header">
        <h2 class="schedule-title">Execution Core</h2>
        <div class="schedule-date">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
      </div>
      
      <div class="schedule-timeline-viewport" id="timeline-viewport">
        <div class="timeline-grid" id="timeline-grid">
          <!-- Hour markers and blocks will render here -->
        </div>
      </div>
      
      <!-- FAB moved outside viewport for fixed positioning -->
      <button class="fab-btn ripple" id="fab-add-block" title="Add Block">
        <i data-lucide="plus"></i>
      </button>

      <!-- Custom Modal Overlay moved outside viewport -->
      <div id="block-modal-overlay" class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <h2 id="modal-title-text">New Schedule Block</h2>
            <button class="btn-icon ripple" id="btn-modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-input-group">
              <label class="modal-label">Execution Target</label>
              <input type="text" id="input-block-title" class="modal-input" placeholder="e.g. System Design, Math, Deep Work">
            </div>
            <div class="modal-row">
              <div class="modal-input-group">
                <label class="modal-label">Start Time</label>
                <input type="time" id="input-block-start" class="modal-input">
              </div>
              <div class="modal-input-group">
                <label class="modal-label">End Time</label>
                <input type="time" id="input-block-end" class="modal-input">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost ripple btn-modal-cancel" id="btn-block-delete" style="color:#ef4444; border-color:rgba(239,68,68,0.2); display:none;">Delete</button>
            <div style="flex:1"></div>
            <button class="btn btn-accent ripple" id="btn-block-save">Save Block</button>
          </div>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  const gridEl = document.getElementById("timeline-grid");
  const modalOverlay = document.getElementById("block-modal-overlay");
  const inputTitle = document.getElementById("input-block-title");
  const inputStart = document.getElementById("input-block-start");
  const inputEnd = document.getElementById("input-block-end");
  const btnSave = document.getElementById("btn-block-save");
  const btnDelete = document.getElementById("btn-block-delete");
  const btnClose = document.getElementById("btn-modal-close");
  const btnFab = document.getElementById("fab-add-block");
  
  let editingBlockId = null;

  // ── Render Logic ───────────────────────────────────────────────────

  function renderGrid() {
    let gridHtml = "";
    // Create 24 hour markers
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      gridHtml += `
        <div class="hour-marker">
          <div class="hour-label">${hour}:00</div>
          <div class="hour-line"></div>
        </div>
      `;
    }
    gridEl.innerHTML = gridHtml;
    renderBlocks();
  }

  function renderBlocks() {
    // 1. Sort blocks by start time for overlap grouping
    const sorted = [...blocks].sort((a,b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));

    // 2. Identify Overlap Groups (Side-by-side)
    const groups = [];
    if (sorted.length > 0) {
      let currentGroup = [sorted[0]];
      let currentMaxEnd = sorted[0].endTime || "00:00";

      for (let i = 1; i < sorted.length; i++) {
        const b = sorted[i];
        if ((b.startTime || "00:00") < currentMaxEnd) {
          currentGroup.push(b);
          if (b.endTime > currentMaxEnd) currentMaxEnd = b.endTime;
        } else {
          groups.push(currentGroup);
          currentGroup = [b];
          currentMaxEnd = b.endTime;
        }
      }
      groups.push(currentGroup);
    }

    // 3. Render Cards
    groups.forEach(group => {
      const groupSize = group.length;
      group.forEach((block, idx) => {
        const card = createBlockCard(block, idx, groupSize);
        gridEl.appendChild(card);
      });
    });
    
    if (window.lucide) window.lucide.createIcons();
    attachBlockListeners();
  }

  function createBlockCard(block, idx, groupSize) {
    const card = document.createElement("div");
    card.className = `schedule-block-card block-card-${block.status}`;
    if (block.status === 'active') card.classList.add('block-card-active');
    
    // Position Logic
    const [sh, sm] = (block.startTime || "00:00").split(":").map(Number);
    const [eh, em] = (block.endTime || "00:00").split(":").map(Number);
    
    const startPos = (sh + sm/60) * HOUR_HEIGHT;
    const endPos = (eh + em/60) * HOUR_HEIGHT;
    const height = Math.max(endPos - startPos, 40); // Min height 40px
    
    // Horizontal Slicing for Overlap
    const widthPercent = 100 / groupSize;
    const leftPercent = idx * widthPercent;

    card.style.top = `${startPos}px`;
    card.style.height = `${height}px`;
    card.style.width = `calc(${widthPercent}% - 70px - 4px)`; // Offset for timeline labels
    card.style.left = `calc(${TIMELINE_LEFT_OFFSET}px + ${leftPercent}%)`;
    card.dataset.id = block.id;

    const displayStart = formatTime(block.startTime);
    const displayEnd = formatTime(block.endTime);

    card.innerHTML = `
      <div>
        <div class="block-card-status">${block.status === 'active' ? 'Active' : block.status}</div>
        <div class="block-card-title">${escHtml(block.title)}</div>
        <div class="block-card-time"><i data-lucide="clock" style="width:10px;height:10px"></i> ${displayStart} - ${displayEnd}</div>
      </div>
      <div class="block-card-footer">
        ${block.status !== 'completed' ? `<button class="btn-card-focus ripple"><i data-lucide="zap" style="width:12px;height:12px"></i> Execution</button>` : ''}
      </div>
    `;

    return card;
  }

  // ── Modal Logic ────────────────────────────────────────────────────

  function openModal(block = null) {
    editingBlockId = block ? block.id : null;
    modalOverlay.classList.add("active");
    
    if (block) {
      document.getElementById("modal-title-text").textContent = "Edit Block";
      inputTitle.value = block.title;
      inputStart.value = block.startTime;
      inputEnd.value = block.endTime;
      btnDelete.style.display = "block";
    } else {
      document.getElementById("modal-title-text").textContent = "New Execution Block";
      inputTitle.value = "";
      
      // Default duration 30 mins
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      now.setMinutes(now.getMinutes() + 30);
      const hEnd = now.getHours().toString().padStart(2, '0');
      const mEnd = now.getMinutes().toString().padStart(2, '0');
      
      inputStart.value = `${h}:${m}`;
      inputEnd.value = `${hEnd}:${mEnd}`;
      btnDelete.style.display = "none";
    }
    inputTitle.focus();
  }

  function closeModal() {
    modalOverlay.classList.remove("active");
  }

  async function handleSave() {
    const title = inputTitle.value.trim();
    const start = inputStart.value;
    const end = inputEnd.value;

    if (!title || !start || !end) {
      showSnackbar("Please fill all fields", "warning");
      return;
    }

    if (start >= end) {
      showSnackbar("End time must be after start time", "warning");
      return;
    }

    btnSave.disabled = true;
    try {
      if (editingBlockId) {
        await updateScheduleBlock(editingBlockId, { title, startTime: start, endTime: end });
        showSnackbar("Block updated", "success");
      } else {
        await createScheduleBlock(uid, { title, startTime: start, endTime: end, date: todayStr });
        showSnackbar("Execution block scheduled", "success");
      }
      closeModal();
      loadData();
    } catch (err) {
      showSnackbar("Failed to save block", "error");
    } finally {
      btnSave.disabled = false;
    }
  }

  async function handleDelete() {
    if (!editingBlockId) return;
    const confirmed = await showConfirmDialog("Delete Block", "Are you sure you want to remove this execution slot?");
    if (!confirmed) return;
    
    try {
      await deleteScheduleBlock(editingBlockId);
      showSnackbar("Block removed", "success");
      closeModal();
      loadData();
    } catch (err) {
      showSnackbar("Failed to delete", "error");
    }
  }

  // ── Data & Listeners ───────────────────────────────────────────────

  async function loadData() {
    try {
      blocks = await getScheduleBlocks(uid, todayStr);
      renderGrid();
    } catch (err) {
      showSnackbar("Failed to load execution stack", "error");
    }
  }

  function attachBlockListeners() {
    gridEl.querySelectorAll(".schedule-block-card").forEach(el => {
      const id = el.dataset.id;
      const block = blocks.find(b => b.id === id);
      
      // Card click -> Edit Modal (except when clicking Execution button)
      el.addEventListener("click", (e) => {
        if (e.target.closest(".btn-card-focus")) {
          handleFocusStart(block);
        } else {
          openModal(block);
        }
      });
    });
  }

  async function handleFocusStart(block) {
    const [sh, sm] = (block.startTime || "00:00").split(":").map(Number);
    const [eh, em] = (block.endTime || "00:00").split(":").map(Number);
    const durationMs = (eh*60 + em - (sh*60 + sm)) * 60000;
    
    // Update block to active
    try {
      await updateScheduleBlock(block.id, { status: "active" });
      startFocusSession(uid, block, durationMs);
      loadData();
    } catch(err) {
      console.error(err);
    }
  }

  // Event Listeners
  btnFab.addEventListener("click", () => openModal());
  btnClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModal(); });
  btnSave.addEventListener("click", handleSave);
  btnDelete.addEventListener("click", handleDelete);
  
  // Auto-reload on session end
  window.addEventListener("focus-session-ended", loadData);

  // Helper Esc
  function escHtml(str) {
    const p = document.createElement("p");
    p.textContent = str;
    return p.innerHTML;
  }

  function formatTime(hm) {
    let [h, m] = hm.split(":").map(Number);
    let ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  // Start
  loadData();

  // Scroll to current hour
  setTimeout(() => {
    const currentHour = new Date().getHours();
    const viewport = document.getElementById("timeline-viewport");
    if (viewport) viewport.scrollTop = Math.max(0, currentHour * HOUR_HEIGHT - 60);
  }, 500);

  return { cleanup: () => {
    window.removeEventListener("focus-session-ended", loadData);
  }};
}
