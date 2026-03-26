// ============================================================
// pages/settings.js — Settings page
// ============================================================

import { updateUserProfile } from "../db.js";
import { logOut, resetPassword } from "../auth.js";
import { showSnackbar, showConfirmDialog } from "../snackbar.js";
import { initNotifications, disableNotifications, isNotificationSupported, getNotificationPermission } from "../notifications.js";
import { applyTheme, navigate } from "../app.js";
import { escHtml } from "../js/utils.js";

export async function renderSettings(container, uid, profile, state) {
  const p = profile || {};
  const notifSupported = isNotificationSupported();
  const notifPerm = getNotificationPermission();

  container.innerHTML = `
    <div style="margin-top:20px;"></div>

    <!-- Profile card -->
    <div class="card mb-md" style="text-align:center;padding:var(--space-xl) var(--space-md)">
      <div style="margin-bottom:var(--space-sm);color:var(--accent)"><i data-lucide="user-circle-2" style="width:52px;height:52px"></i></div>
      <div style="font-size:var(--font-size-xl);font-weight:700">${escHtml(p.displayName || "Student")}</div>
      <div class="text-muted text-sm">${escHtml(p.email || "")}</div>
      <button class="btn btn-ghost btn-sm ripple" style="margin-top:var(--space-md); border-radius:var(--border-radius-full)" id="btn-edit-profile">Edit Profile</button>
    </div>

    <!-- Appearance -->
    <div class="text-muted text-sm font-bold mb-sm" style="text-transform:uppercase;letter-spacing:.5px">Appearance</div>
    <div class="settings-list mb-md">
      <div class="settings-item">
        <span class="settings-item-icon"><i data-lucide="moon" style="width:18px;height:18px"></i></span>
        <span class="settings-item-label">Dark Mode</span>
        <label class="toggle">
          <input type="checkbox" id="toggle-theme" ${p.theme !== "light" ? "checked" : ""} />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <!-- Planner Preferences -->
    <div class="text-muted text-sm font-bold mb-sm" style="text-transform:uppercase;letter-spacing:.5px">Planner</div>
    <div class="settings-list mb-md">
      <div class="settings-item">
        <span class="settings-item-icon"><i data-lucide="calendar" style="width:18px;height:18px"></i></span>
        <span class="settings-item-label">Week starts on</span>
        <select class="form-select" id="sel-week-start" style="width:auto;padding:6px 32px 6px 10px;font-size:13px;border-radius:8px">
          <option value="monday" ${p.weekStartDay==="monday"?"selected":""}>Monday</option>
          <option value="sunday" ${p.weekStartDay==="sunday"?"selected":""}>Sunday</option>
        </select>
      </div>
    </div>

    <!-- Notifications -->
    <div class="text-muted text-sm font-bold mb-sm" style="text-transform:uppercase;letter-spacing:.5px">Notifications</div>
    <div class="settings-list mb-md">
      <div class="settings-item">
        <span class="settings-item-icon"><i data-lucide="bell" style="width:18px;height:18px"></i></span>
        <span class="settings-item-label">Push Notifications</span>
        <label class="toggle">
          <input type="checkbox" id="toggle-notif" ${p.notificationEnabled ? "checked" : ""} ${!notifSupported ? "disabled" : ""} />
          <span class="toggle-slider"></span>
        </label>
      </div>
      ${!notifSupported ? `
      <div class="settings-item" style="cursor:default">
        <span class="settings-item-icon"><i data-lucide="info" style="width:18px;height:18px"></i></span>
        <span class="settings-item-label text-muted text-sm">Install app to Home Screen for notifications (iOS 16.4+)</span>
      </div>` : ""}
      ${notifSupported && notifPerm === "denied" ? `
      <div class="settings-item" style="cursor:default">
        <span class="settings-item-icon"><i data-lucide="alert-triangle" style="width:18px;height:18px"></i></span>
        <span class="settings-item-label text-muted text-sm">Notifications blocked in browser settings. Please allow manually.</span>
      </div>` : ""}
    </div>

    <!-- Course / Goal Section -->
    <div class="text-muted text-sm font-bold mb-sm" style="text-transform:uppercase;letter-spacing:.5px">🎯 Long-Term Focus</div>
    <div class="settings-list mb-md">
      <div class="settings-item" id="btn-edit-course">
        <span class="settings-item-icon"><i data-lucide="graduation-cap" style="width:18px;height:18px"></i></span>
        <span class="settings-item-label" id="course-label">${p.btechName ? escHtml(p.btechName) : "Add degree or goal (e.g., B.Tech)"}</span>
        <span class="settings-item-arrow" style="display:flex;align-items:center"><i data-lucide="chevron-right" style="width:16px;height:16px"></i></span>
      </div>
    </div>

    <!-- Support -->
    <div class="text-muted text-sm font-bold mb-sm" style="text-transform:uppercase;letter-spacing:.5px">Support</div>
    <div class="settings-list mb-md">
      <div class="settings-item" id="btn-how-to-use">
        <span class="settings-item-icon"><i data-lucide="help-circle" style="width:18px;height:18px"></i></span>
        <span class="settings-item-label">How to use</span>
        <span class="settings-item-arrow" style="display:flex;align-items:center"><i data-lucide="chevron-right" style="width:16px;height:16px"></i></span>
      </div>
    </div>

    <!-- Account -->
    <div class="text-muted text-sm font-bold mb-sm" style="text-transform:uppercase;letter-spacing:.5px">Account</div>
    <div class="settings-list mb-md">
      <div class="settings-item" id="btn-change-pw">
        <span class="settings-item-icon"><i data-lucide="key-round" style="width:18px;height:18px"></i></span>
        <span class="settings-item-label">Change Password</span>
        <span class="settings-item-arrow" style="display:flex;align-items:center"><i data-lucide="chevron-right" style="width:16px;height:16px"></i></span>
      </div>
      <div class="settings-item" id="btn-logout" style="color:var(--error)">
        <span class="settings-item-icon"><i data-lucide="log-out" style="width:18px;height:18px;color:var(--error)"></i></span>
        <span class="settings-item-label" style="color:var(--error)">Sign Out</span>
      </div>
    </div>

    <div class="text-center text-muted text-sm" style="margin:var(--space-xl) 0 var(--space-md); line-height:1.6">
      Your Day v1.0.0<br/>
      Designed & developed by Harshil<br/>
      <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:4px;">
        <span>Feedback and bug reports &rarr;</span>
        <a href="https://github.com/Marshmellow31/Planner-App-for-iphone" target="_blank" rel="noopener noreferrer" style="color:var(--text-primary); text-decoration:none; font-weight:600;">GitHub</a>
        <span style="color:var(--border-active); font-size:10px;">&bull;</span>
        <a href="https://www.linkedin.com/in/harshil-patel-5a7373333/" target="_blank" rel="noopener noreferrer" style="color:var(--text-primary); text-decoration:none; font-weight:600;">LinkedIn</a>
      </div>
    </div>
    <div id="settings-msg" class="form-error hidden" style="text-align:center;margin-bottom:var(--space-md)"></div>
    <button class="btn btn-primary btn-full hidden" id="btn-save-settings">Save Changes</button>
  `;

  // ── Theme toggle ─────────────────────────────────────────────
  document.getElementById("toggle-theme")?.addEventListener("change", async (e) => {
    const theme = e.target.checked ? "dark" : "light";
    applyTheme(theme);
    state.profile = { ...state.profile, theme };
    await updateUserProfile(uid, { theme });
  });

  // ── Notification toggle ───────────────────────────────────────
  document.getElementById("toggle-notif")?.addEventListener("change", async (e) => {
    if (e.target.checked) {
      const token = await initNotifications(uid);
      const enabled = !!token;
      e.target.checked = enabled;
      state.profile = { ...state.profile, notificationEnabled: enabled };
      await updateUserProfile(uid, { notificationEnabled: enabled });
    } else {
      await disableNotifications(uid);
      state.profile = { ...state.profile, notificationEnabled: false };
      await updateUserProfile(uid, { notificationEnabled: false });
    }
  });

  // ── Planner logic ─────────────────────────────────────────────
  document.getElementById("sel-week-start")?.addEventListener("change", async (e) => {
    const weekStartDay = e.target.value;
    await updateUserProfile(uid, { weekStartDay });
    state.profile = { ...state.profile, weekStartDay };
    showSnackbar("Preferences saved", "success");
  });

  // ── Edit profile ──────────────────────────────────────────────
  document.getElementById("btn-edit-profile")?.addEventListener("click", () => openProfileModal(uid, profile, state));

  // ── Course Details ───────────────────────────────────────────
  document.getElementById("btn-edit-course")?.addEventListener("click", () => openCourseModal(uid, profile, state));

  // ── How to use ──────────────────────────────────────────────
  document.getElementById("btn-how-to-use")?.addEventListener("click", () => openHowToModal());

  // ── Change password ───────────────────────────────────────────
  document.getElementById("btn-change-pw")?.addEventListener("click", async () => {
    if (!profile?.email) return;
    try {
      await resetPassword(profile.email);
      showSnackbar("Password reset email sent! Check your inbox.", "success", 5000);
    } catch (_) { 
      showSnackbar("Failed to send reset email.", "error"); 
    }
  });

  // ── Logout ────────────────────────────────────────────────────
  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    const confirmed = await showConfirmDialog(
      "Sign Out",
      "Are you sure you want to sign out of Your Day?",
      "Sign Out",
      true
    );
    if (!confirmed) return;
    await logOut();
  });

  if (window.lucide) window.lucide.createIcons();

  return { cleanup: () => {} };
}

// ── Profile edit modal ────────────────────────────────────────
function openProfileModal(uid, profile, state) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop centered";
  backdrop.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <h3 class="modal-title">Edit Profile</h3>
      <div class="form-group">
        <label class="form-label">Display Name</label>
        <input class="form-input" id="profile-name" value="${escHtml(profile?.displayName||"")}" placeholder="Your name" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="profile-cancel" style="border-radius:var(--border-radius-full)">Cancel</button>
        <button class="btn btn-primary" id="profile-save" style="border-radius:var(--border-radius-full)">Save</button>
      </div>
    </div>
  `;

  backdrop.querySelector("#profile-cancel").addEventListener("click", () => backdrop.remove());
  backdrop.querySelector("#profile-save").addEventListener("click", async () => {
    const displayName = backdrop.querySelector("#profile-name").value.trim();
    if (!displayName) return;
    await updateUserProfile(uid, { displayName });
    state.profile = { ...state.profile, displayName };
    backdrop.remove();
    navigate("settings");
  });

  document.body.appendChild(backdrop);
  setTimeout(() => backdrop.querySelector("#profile-name")?.focus(), 100);
}

// ── Course Edit Modal ──────────────────────────────────────────
function openCourseModal(uid, profile, state) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop centered";
  backdrop.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <h3 class="modal-title">Long-Term Focus</h3>
      
      <div class="form-group">
        <label class="form-label">Program or Goal</label>
        <input class="form-input" id="course-name" placeholder="e.g. B.Tech, Semester 6" value="${escHtml(profile?.btechName||'')}" />
      </div>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
        <div class="form-group">
          <label class="form-label">Start Date</label>
          <input class="form-input" type="date" id="course-start" value="${profile?.btechStart||''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Target Date</label>
          <input class="form-input" type="date" id="course-end" value="${profile?.btechEnd||''}" />
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" id="course-cancel" style="border-radius:var(--border-radius-full)">Cancel</button>
        <button class="btn btn-primary" id="course-save" style="border-radius:var(--border-radius-full)">Save Changes</button>
      </div>
    </div>
  `;

  backdrop.querySelector("#course-cancel").addEventListener("click", () => backdrop.remove());
  backdrop.querySelector("#course-save").addEventListener("click", async () => {
    const btechName = backdrop.querySelector("#course-name").value.trim();
    const btechStart = backdrop.querySelector("#course-start").value;
    const btechEnd = backdrop.querySelector("#course-end").value;
    
    await updateUserProfile(uid, { btechName, btechStart, btechEnd });
    state.profile = { ...state.profile, btechName, btechStart, btechEnd };
    backdrop.remove();
    navigate("settings");
  });

  document.body.appendChild(backdrop);
}

// ── How to use Modal ────────────────────────────────────────────
function openHowToModal() {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop centered";
  backdrop.innerHTML = `
    <div class="modal-box" style="max-width:450px; max-height:80vh; overflow-y:auto;">
      <h3 class="modal-title" style="display:flex; align-items:center; gap:8px">
        <i data-lucide="help-circle" style="color:var(--accent)"></i> How to use Your Day
      </h3>
      
      <div style="display:flex; flex-direction:column; gap:var(--space-md); margin-bottom:var(--space-lg)">
        
        <div style="display:flex; gap:12px;">
          <div style="color:var(--accent)"><i data-lucide="layout-dashboard"></i></div>
          <div>
            <div style="font-weight:600; font-size:15px">Dashboard</div>
            <div class="text-muted text-sm">Your central hub. View a summary of your day, quick stats, and upcoming high-priority tasks at a glance.</div>
          </div>
        </div>

        <div style="display:flex; gap:12px;">
          <div style="color:var(--accent)"><i data-lucide="check-square"></i></div>
          <div>
            <div style="font-weight:600; font-size:15px">Tasks</div>
            <div class="text-muted text-sm">Manage your to-do lists. Add sub-tasks, set priorities, and organize everything you need to get done.</div>
          </div>
        </div>

        <div style="display:flex; gap:12px;">
          <div style="color:var(--accent)"><i data-lucide="sparkles"></i></div>
          <div>
            <div style="font-weight:600; font-size:15px">AI Scheduler</div>
            <div class="text-muted text-sm">The brain of the app. It automatically organizes your tasks into your available study blocks based on urgency and priority.</div>
          </div>
        </div>

        <div style="display:flex; gap:12px;">
          <div style="color:var(--accent)"><i data-lucide="trending-up"></i></div>
          <div>
            <div style="font-weight:600; font-size:15px">Growth</div>
            <div class="text-muted text-sm">Focus on long-term goals. Set a target date and the app will automatically generate daily tasks to help you stay on track.</div>
          </div>
        </div>

        <div style="display:flex; gap:12px;">
          <div style="color:var(--accent)"><i data-lucide="settings"></i></div>
          <div>
            <div style="font-weight:600; font-size:15px">Profile</div>
            <div class="text-muted text-sm">Personalize your experience. Adjust themes, manage notifications, and update your course details.</div>
          </div>
        </div>

      </div>

      <button class="btn btn-primary btn-full" id="how-to-close" style="border-radius:var(--border-radius-full)">Got it!</button>
    </div>
  `;

  backdrop.querySelector("#how-to-close").addEventListener("click", () => backdrop.remove());
  document.body.appendChild(backdrop);
  if (window.lucide) window.lucide.createIcons();
}
