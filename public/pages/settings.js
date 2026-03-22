// ============================================================
// pages/settings.js — Settings page
// ============================================================

import { updateUserProfile } from "../db.js";
import { logOut, resetPassword } from "../auth.js";
import { showSnackbar } from "../snackbar.js";
import { initNotifications, disableNotifications, isNotificationSupported, getNotificationPermission } from "../notifications.js";
import { applyTheme } from "../app.js";
import { escHtml } from "./dashboard.js";

export async function renderSettings(container, uid, profile, state) {
  const p = profile || {};
  const notifSupported = isNotificationSupported();
  const notifPerm = getNotificationPermission();

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Settings</h1>
    </div>

    <!-- Profile card -->
    <div class="card mb-md" style="text-align:center;padding:var(--space-xl) var(--space-md)">
      <div style="margin-bottom:var(--space-sm);color:var(--accent)"><i data-lucide="user-circle-2" style="width:52px;height:52px"></i></div>
      <div style="font-size:var(--font-size-xl);font-weight:700">${escHtml(p.displayName || "Student")}</div>
      <div class="text-muted text-sm">${escHtml(p.email || "")}</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:var(--space-md)" id="btn-edit-profile">Edit Profile</button>
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
        <div class="flex items-center gap-sm w-full justify-between">
          <span class="settings-item-icon"><i data-lucide="target" style="width:18px;height:18px"></i></span>
          <span class="settings-item-label" style="flex:1">Study Goal</span>
        </div>
        <input class="form-input" id="input-goals" style="font-size:13px" placeholder="e.g. Study 3 hours daily" value="${escHtml(p.studyGoals||"")}" />
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

    <!-- BTech Journey -->
    <div class="text-muted text-sm font-bold mb-sm" style="text-transform:uppercase;letter-spacing:.5px">🎓 BTech Journey</div>
    <div class="settings-list mb-md">
      <div class="settings-item" style="flex-direction:column;align-items:flex-start;gap:8px">
        <span class="settings-item-label" style="font-size:13px">Program Name</span>
        <input class="form-input" id="input-btech-name" style="font-size:13px" placeholder="e.g. B.Tech CSE" value="${escHtml(p.btechName||'')}" />
      </div>
      <div class="settings-item" style="flex-direction:column;align-items:flex-start;gap:8px">
        <span class="settings-item-label" style="font-size:13px">Start Date</span>
        <input class="form-input" type="date" id="input-btech-start" style="font-size:13px" value="${p.btechStart||''}" />
      </div>
      <div class="settings-item" style="flex-direction:column;align-items:flex-start;gap:8px">
        <span class="settings-item-label" style="font-size:13px">End Date (Graduation)</span>
        <input class="form-input" type="date" id="input-btech-end" style="font-size:13px" value="${p.btechEnd||''}" />
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

    <div class="text-center text-muted text-sm" style="margin:var(--space-xl) 0 var(--space-md)">
      StudyFlow v1.0.0 · Built with Firebase + Vercel
    </div>
    <div id="settings-msg" class="form-error hidden" style="text-align:center;margin-bottom:var(--space-md)"></div>
    <button class="btn btn-primary btn-full" id="btn-save-settings">Save Changes</button>
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

  // ── Save settings ─────────────────────────────────────────────
  document.getElementById("btn-save-settings")?.addEventListener("click", async () => {
    const weekStartDay = document.getElementById("sel-week-start")?.value || "monday";
    const studyGoals   = document.getElementById("input-goals")?.value?.trim() || "";
    const btechName    = document.getElementById("input-btech-name")?.value?.trim() || "";
    const btechStart   = document.getElementById("input-btech-start")?.value || "";
    const btechEnd     = document.getElementById("input-btech-end")?.value || "";
    await updateUserProfile(uid, { weekStartDay, studyGoals, btechName, btechStart, btechEnd });
    state.profile = { ...state.profile, weekStartDay, studyGoals, btechName, btechStart, btechEnd };
    const msg = document.getElementById("settings-msg");
    if (msg) {
      msg.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="check" style="width:16px;height:16px"></i> Settings saved!</span>`;
      msg.style.color = "var(--success)";
      msg.classList.remove("hidden");
      if (window.lucide) window.lucide.createIcons();
      setTimeout(() => msg.classList.add("hidden"), 3000);
    }
  });

  // ── Edit profile ──────────────────────────────────────────────
  document.getElementById("btn-edit-profile")?.addEventListener("click", () => openProfileModal(uid, profile, state));

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
      "Are you sure you want to sign out of StudyFlow?",
      "Sign Out",
      true
    );
    if (!confirmed) return;
    await logOut();
  });
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
        <button class="btn btn-secondary" id="profile-cancel">Cancel</button>
        <button class="btn btn-primary" id="profile-save">Save</button>
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
    // Re-render settings
    const { renderSettings } = await import("./settings.js");
    const container = document.getElementById("main-content");
    if (container) renderSettings(container, uid, state.profile, state);
  });

  document.body.appendChild(backdrop);
  setTimeout(() => backdrop.querySelector("#profile-name")?.focus(), 100);
}
