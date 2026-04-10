import { createFocusSession, updateFocusSession } from "../db.js";
import { showSnackbar } from "../snackbar.js";

let currentSession = null;
let timerInterval = null;
let currentDurationMs = 0;
let overlayEl = null;

// Digital Obsidian Theme Focus Engine Overlay
export function initFocusEngineOverlay() {
  if (document.getElementById("focus-engine-overlay")) return;

  overlayEl = document.createElement("div");
  overlayEl.id = "focus-engine-overlay";
  overlayEl.className = "focus-engine-hidden";
  overlayEl.innerHTML = `
    <div class="focus-engine-content">
      <h2 id="focus-task-title" class="focus-task-title">Deep Work</h2>
      <div id="focus-timer-display" class="focus-timer-display">00:00</div>
      
      <div class="focus-controls">
        <button id="focus-pause-btn" class="btn btn-secondary ripple outline-btn">
          <i data-lucide="pause"></i> Pause
        </button>
        <button id="focus-complete-btn" class="btn btn-accent ripple">
          <i data-lucide="check"></i> Complete
        </button>
      </div>

      <button id="focus-distraction-btn" class="btn btn-ghost ripple focus-distraction-btn">
        <i data-lucide="alert-triangle"></i> Log Distraction
      </button>
    </div>
  `;
  document.body.appendChild(overlayEl);
  if (window.lucide) window.lucide.createIcons();

  // Attach Listeners
  document.getElementById("focus-pause-btn").addEventListener("click", togglePause);
  document.getElementById("focus-complete-btn").addEventListener("click", completeFocusSession);
  document.getElementById("focus-distraction-btn").addEventListener("click", logDistraction);
}

function renderTimer() {
  if (!currentSession) return;
  const display = document.getElementById("focus-timer-display");
  if (!display) return;

  const totalSeconds = Math.max(0, Math.floor(currentDurationMs / 1000));
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  
  display.textContent = `${m}:${s}`;
}

export async function startFocusSession(uid, block, initialDurationMs) {
  if (currentSession && currentSession.status === 'active') {
    showSnackbar("A session is already active", "warning");
    return;
  }

  initFocusEngineOverlay();

  currentDurationMs = initialDurationMs;
  
  // Set UI
  document.getElementById("focus-task-title").textContent = block.title || "Deep Work";
  renderTimer();
  
  overlayEl.classList.remove("focus-engine-hidden");
  overlayEl.classList.add("focus-engine-active");

  try {
    const docRef = await createFocusSession(uid, {
      blockId: block.id,
      taskId: block.taskId,
      status: "active"
    });
    
    currentSession = {
      id: docRef.id,
      uid,
      blockId: block.id,
      taskId: block.taskId,
      distractionCount: 0,
      status: "active"
    };

    resumeTimer();
  } catch (err) {
    showSnackbar("Failed to start session", "error");
    overlayEl.classList.remove("focus-engine-active");
    overlayEl.classList.add("focus-engine-hidden");
  }
}

function togglePause() {
  if (!currentSession) return;
  
  const pauseBtn = document.getElementById("focus-pause-btn");
  
  if (currentSession.status === "active") {
    currentSession.status = "paused";
    pauseBtn.innerHTML = `<i data-lucide="play"></i> Resume`;
    clearInterval(timerInterval);
    updateFocusSession(currentSession.id, { status: "paused" }).catch(console.error);
  } else {
    currentSession.status = "active";
    pauseBtn.innerHTML = `<i data-lucide="pause"></i> Pause`;
    resumeTimer();
    updateFocusSession(currentSession.id, { status: "active" }).catch(console.error);
  }
  if (window.lucide) window.lucide.createIcons();
}

function resumeTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    currentDurationMs -= 1000;
    
    if (currentDurationMs <= 0) {
      currentDurationMs = 0;
      renderTimer();
      showSnackbar("Focus Session Auto-Ended!", "success");
      completeFocusSession();
    } else {
      renderTimer();
    }
  }, 1000);
}

async function completeFocusSession() {
  if (!currentSession) return;
  
  clearInterval(timerInterval);
  const sessionId = currentSession.id;
  
  overlayEl.classList.remove("focus-engine-active");
  overlayEl.classList.add("focus-engine-hidden");
  
  try {
    await updateFocusSession(sessionId, {
      status: "completed",
      durationMs: currentDurationMs,
      distractionCount: currentSession.distractionCount
    });
    
    // Potentially update the associated schedule block to 'completed'
    if (currentSession.blockId) {
      const { updateScheduleBlock } = await import("../db.js");
      await updateScheduleBlock(currentSession.blockId, { status: "completed" });
    }
    
    showSnackbar("Session completed successfully", "success");
    currentSession = null;
    
    // Auto-transition signal could go here
    window.dispatchEvent(new CustomEvent("focus-session-ended"));
  } catch (err) {
    showSnackbar("Error completing session", "error");
  }
}

function logDistraction() {
  if (!currentSession) return;
  currentSession.distractionCount += 1;
  showSnackbar(`Distraction logged (${currentSession.distractionCount})`, "warning");
}

export function getCurrentSession() {
  return currentSession;
}
