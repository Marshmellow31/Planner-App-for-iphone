// ============================================================
// app.js — Main router, auth watcher, global state
// ============================================================

import { onAuthStateChanged, logOut, signUp, logIn, resetPassword, logInWithGoogle } from "./auth.js";
import { getUserProfile, updateUserProfile } from "./db.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderSubjects } from "./pages/subjects.js";
import { renderTopics } from "./pages/topics.js";
import { renderTasks } from "./pages/tasks.js";
import { renderAnalytics } from "./pages/analytics.js";
import { renderSettings } from "./pages/settings.js";
import { showInAppNotification, onForegroundMessage } from "./notifications.js";
import { showSnackbar } from "./snackbar.js";

// ── Global State ──────────────────────────────────────────────────────────────
export const state = {
  user: null,
  profile: null,
  currentPage: "dashboard",
  selectedSubjectId: null,     // for topic drill-down
  selectedSubjectName: null,
};

// ── DOM helpers ───────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showEl(...ids) { ids.forEach((id) => $( id)?.classList.remove("hidden")); }
function hideEl(...ids) { ids.forEach((id) => $(id)?.classList.add("hidden")); }

// ── Show Landing / Auth / App shells ──────────────────────────────────────────
function showLanding()  { hideEl("page-auth","page-app"); showEl("page-landing"); }
function showAuthPage() { hideEl("page-landing","page-app"); showEl("page-auth"); }
function showAppPage()  { hideEl("page-landing","page-auth"); showEl("page-app"); }

// ── Apply saved theme ─────────────────────────────────────────────────────────
export function applyTheme(theme = "dark") {
  document.documentElement.setAttribute("data-theme", theme);
}

// ── Ripple Effect logic ───────────────────────────────────────────────────────
function initRipples() {
  document.querySelectorAll(".ripple").forEach(btn => {
    // avoid multiple listeners
    if (btn.dataset.rippleInit) return;
    btn.dataset.rippleInit = "true";

    btn.addEventListener("click", function(e) {
      const rect = this.getBoundingClientRect();
      const radius = Math.max(rect.width, rect.height);
      const circle = document.createElement("span");
      
      const diameter = radius * 2;
      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.classList.add("ripple-pulse");
      
      this.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    });
  });
}

// ── Navigate between app pages ────────────────────────────────────────────────
export async function navigate(page, params = {}) {
  state.currentPage = page;
  if (params.subjectId) state.selectedSubjectId = params.subjectId;
  if (params.subjectName) state.selectedSubjectName = params.subjectName;

  // Update bottom nav active state
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  const content = $("main-content");
  if (!content) return;
  content.innerHTML = ""; // clear

  const uid = state.user?.uid;
  const profile = state.profile;

  // Add subtle page transition
  content.classList.remove("fadeSlideUp");
  // force reflow
  void content.offsetWidth;
  content.classList.add("fadeSlideUp");

  switch (page) {
    case "dashboard":  await renderDashboard(content, uid, profile); break;
    case "subjects":   await renderSubjects(content, uid, profile); break;
    case "topics":     await renderTopics(content, uid, params.subjectId || state.selectedSubjectId, params.subjectName || state.selectedSubjectName); break;
    case "tasks":      await renderTasks(content, uid, profile); break;
    case "analytics":  await renderAnalytics(content, uid, profile); break;
    case "settings":   await renderSettings(content, uid, profile, state); break;
  }

  // Bind ripples to newly rendered content
  initRipples();

  // Initialize Lucide icons for new content
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ── Auth flows ────────────────────────────────────────────────────────────────
function initAuthForms() {
  // ── Login ─────────────────────────────────────────────────
  $("form-login")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("login-error");
    errEl.classList.add("hidden");
    const btn = $("btn-login");
    btn.textContent = "Signing in…";
    btn.disabled = true;
    try {
      await logIn($("login-email").value.trim(), $("login-password").value);
    } catch (err) {
      errEl.textContent = friendlyError(err.code);
      errEl.classList.remove("hidden");
      btn.textContent = "Sign In";
      btn.disabled = false;
    }
  });

  // ── Signup ────────────────────────────────────────────────
  $("form-signup")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("signup-error");
    errEl.classList.add("hidden");
    const btn = $("btn-signup");
    btn.textContent = "Creating…";
    btn.disabled = true;
    try {
      await signUp(
        $("signup-email").value.trim(),
        $("signup-password").value,
        $("signup-name").value.trim() || "Student"
      );
    } catch (err) {
      errEl.textContent = friendlyError(err.code);
      errEl.classList.remove("hidden");
      btn.textContent = "Create Account";
      btn.disabled = false;
    }
  });

  // ── Password reset ────────────────────────────────────────
  $("form-forgot")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = $("forgot-msg");
    try {
      await resetPassword($("forgot-email").value.trim());
      msgEl.style.color = "var(--success)";
      msgEl.textContent = "✓ Reset link sent! Check your inbox.";
      msgEl.classList.remove("hidden");
    } catch (err) {
      msgEl.style.color = "var(--error)";
      msgEl.textContent = friendlyError(err.code);
      msgEl.classList.remove("hidden");
    }
  });

  // ── Google Sign In ────────────────────────────────────────
  const handleGoogleAuth = async () => {
    try {
      await logInWithGoogle();
    } catch (err) {
      console.error("Google Auth Error:", err);
      // For now just alert or log; app.js logic handles onAuthStateChanged
    }
  };

  $("btn-google-login")?.addEventListener("click", handleGoogleAuth);
  $("btn-google-signup")?.addEventListener("click", handleGoogleAuth);

  // ── Navigation between auth screens ──────────────────────
  const show = (id) => {
    ["auth-login","auth-signup","auth-forgot"].forEach((x) =>
      document.getElementById(x)?.classList.toggle("hidden", x !== id)
    );
  };
  $("link-to-signup")?.addEventListener("click", (e) => { e.preventDefault(); show("auth-signup"); });
  $("link-to-login")?.addEventListener("click",  (e) => { e.preventDefault(); show("auth-login"); });
  $("link-forgot-pw")?.addEventListener("click", (e) => { e.preventDefault(); show("auth-forgot"); });
  $("link-back-to-login")?.addEventListener("click", (e) => { e.preventDefault(); show("auth-login"); });

  // ── Close auth ───────────────────────────────────────────
  document.querySelectorAll(".auth-close-btn").forEach((btn) => {
    btn.addEventListener("click", () => showLanding());
  });
}

function initLanding() {
  $("btn-get-started")?.addEventListener("click", () => {
    showAuthPage();
    document.getElementById("auth-signup")?.classList.remove("hidden");
    document.getElementById("auth-login")?.classList.add("hidden");
    document.getElementById("auth-forgot")?.classList.add("hidden");
  });
  $("btn-landing-login")?.addEventListener("click", () => {
    showAuthPage();
    document.getElementById("auth-login")?.classList.remove("hidden");
    document.getElementById("auth-signup")?.classList.add("hidden");
    document.getElementById("auth-forgot")?.classList.add("hidden");
  });
}

// ── Bottom navigation ─────────────────────────────────────────────────────────
function initBottomNav() {
  document.querySelectorAll(".nav-item[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.page));
  });
}

// ── FAB quick-add task ────────────────────────────────────────────────────────
function initFab() {
  $("fab-add-task")?.addEventListener("click", async () => {
    const { openTaskModal } = await import("./pages/tasks.js");
    openTaskModal(state.user.uid, state.profile, () => {
      if (state.currentPage === "tasks" || state.currentPage === "dashboard") {
        navigate(state.currentPage);
      }
    });
  });
}

// ── Install prompt (iOS Safari) ───────────────────────────────────────────────
function initInstallPrompt() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;

  if (isIOS && !isStandalone) {
    const dismissed = localStorage.getItem("sf_install_dismissed");
    if (!dismissed) {
      setTimeout(() => {
        const prompt = $("install-prompt");
        if (prompt) prompt.classList.remove("hidden");
      }, 30000); // show after 30s of engagement
    }
  }

  $("install-prompt-close")?.addEventListener("click", () => {
    $("install-prompt")?.classList.add("hidden");
    localStorage.setItem("sf_install_dismissed", "1");
  });

  // Standard beforeinstallprompt for Android / desktop
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    const prompt = $("install-prompt");
    if (prompt) {
      prompt.querySelector(".install-prompt-desc").textContent = "Install StudyFlow for the best experience";
      prompt.classList.remove("hidden");
      prompt.addEventListener("click", () => e.prompt(), { once: true });
    }
  });
}

// ── Foreground push message handler ───────────────────────────────────────────
function initForegroundMessages() {
  try {
    onForegroundMessage((payload) => {
      const title = payload.notification?.title || "StudyFlow";
      const body  = payload.notification?.body  || "You have a reminder.";
      showInAppNotification(title, body);
    });
  } catch (_) {}
}

// ── Error messages ────────────────────────────────────────────────────────────
function friendlyError(code) {
  const map = {
    "auth/user-not-found":      "No account found with that email.",
    "auth/wrong-password":      "Incorrect password. Try again.",
    "auth/email-already-in-use":"That email is already registered.",
    "auth/invalid-email":       "Please enter a valid email address.",
    "auth/weak-password":       "Password must be at least 6 characters.",
    "auth/too-many-requests":   "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return map[code] || `Error: ${code}`;
}

// ── Entry point ───────────────────────────────────────────────────────────────
function main() {
  initLanding();
  initAuthForms();
  initInstallPrompt();

  onAuthStateChanged(async (user) => {
    if (user) {
      state.user = user;

      // Load profile
      const profile = await getUserProfile(user.uid);
      state.profile = profile;

      // Apply saved theme
      applyTheme(profile?.theme || "dark");

      // Show app
      showAppPage();
      initBottomNav();
      initFab();
      initForegroundMessages();

      // Check for action shortcut in URL
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "add-task") {
        const { openTaskModal } = await import("./pages/tasks.js");
        openTaskModal(user.uid, profile, () => navigate("tasks"));
      }

      await navigate("dashboard");
    } else {
      state.user = null;
      state.profile = null;
      showLanding();
    }
  });
}

main();
