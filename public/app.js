// ── Capture beforeinstallprompt ASAP (before async imports can delay us) ─────
// This must be at the very top of the module so it runs synchronously on load.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
  console.log('[PWA] beforeinstallprompt captured ✓');
  // Notify initInstallPrompt if it's already been called (late capture)
  window.dispatchEvent(new Event('pwa-prompt-ready'));
});

import "./styles.css";
import { createIcons, icons } from "lucide";
window.lucide = { 
  createIcons: (config = {}) => createIcons({ icons, ...config }), 
  icons 
};
import { onAuthStateChanged } from "./auth.js";
import { getUserProfile } from "./db.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderTasks } from "./pages/tasks.js";
import { renderAnalytics } from "./pages/analytics.js";
import { renderSettings } from "./pages/settings.js";
import { onForegroundMessage } from "./notifications.js";
import { $, showEl, hideEl, initRipples } from "./js/utils.js";
import { initAuthForms } from "./js/auth_ui.js";
import { initLanding, triggerLandingEntrance, triggerLandingReEnter } from "./js/landing.js";

// ── Global State ──────────────────────────────────────────────────────────────
export const state = {
  user: null,
  profile: null,
  currentPage: "dashboard",
  selectedTopicId: null,
  selectedTopicName: null,
  currentPageController: null, // Tracks the currently active page for cleanup
};

// ── Show Landing / Auth / App shells ──────────────────────────────────────────
function showLanding(animateIn = false) {
  hideEl("page-auth", "page-app");
  showEl("page-landing", "landing-bg");
  if (animateIn) triggerLandingReEnter();
  else triggerLandingEntrance();
}

function showAuthPage(view = "auth-login") {
  hideEl("page-landing", "page-app");
  showEl("page-auth", "landing-bg");
  // Slider logic handles the specific view (login/signup/forgot)
  ["auth-login", "auth-signup", "auth-forgot"].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.classList.toggle("hidden", id !== view);
    if (id === view) {
      el.classList.remove("auth-slide-in");
      void el.offsetWidth;
      el.classList.add("auth-slide-in");
    }
  });
}

function showAppPage() {
  hideEl("page-landing", "page-auth", "landing-bg");
  showEl("page-app");
}

// ── Theme Application ─────────────────────────────────────────────────────────
export function applyTheme(theme = "dark") {
  document.documentElement.setAttribute("data-theme", theme);
}

// ── Navigation Logic ──────────────────────────────────────────────────────────
export async function navigate(page, params = {}) {
  // ── Lifecycle Cleanup ──
  if (state.currentPageController?.cleanup) {
    try {
      state.currentPageController.cleanup();
    } catch (err) {
      console.warn(`Cleanup failed for page: ${state.currentPage}`, err);
    }
  }
  state.currentPageController = null;

  state.currentPage = page;
  if (params.topicId) state.selectedTopicId = params.topicId;
  if (params.topicName) state.selectedTopicName = params.topicName;

  document.querySelectorAll(".nav-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  const content = $("main-content");
  if (!content) return;
  content.innerHTML = "";

  const uid = state.user?.uid;
  const profile = state.profile;

  content.classList.remove("fadeSlideUp");
  void content.offsetWidth;
  content.classList.add("fadeSlideUp");
  
  // No longer need to toggle Home/FAB visibility as they are replaced by fixed nav/header
  // Update header title based on page
  const headerTitle = document.querySelector(".header-title");
  if (headerTitle) {
    const titles = {
      dashboard: "Dashboard",
      tasks: "Tasks",
      analytics: "Analytics",
      settings: "Profile",
      scheduler: "AI Scheduler",
      personalDevelopment: "Growth",
      growth: "Growth"
    };
    headerTitle.textContent = titles[page] || "Your Day";
  }

  let controller = null;

  switch (page) {
    case "dashboard":  controller = await renderDashboard(content, uid, profile); break;
    case "tasks":      controller = await renderTasks(content, uid, profile); break;
    case "analytics":  controller = await renderAnalytics(content, uid, profile); break;
    case "settings":   controller = await renderSettings(content, uid, profile, state); break;
    case "scheduler":   
      const { renderSchedulerTab } = await import("./pages/scheduler.js");
      controller = await renderSchedulerTab(content, uid, profile); 
      break;
    case "personalDevelopment":
    case "growth":
      const { renderPersonalDevelopment } = await import("./pages/personalDevelopment.js");
      controller = await renderPersonalDevelopment(content, uid, profile);
      break;
  }

  state.currentPageController = controller;
  initRipples();
  if (window.lucide) window.lucide.createIcons();
}

// ── Sub-component Init ────────────────────────────────────────────────────────
function initNavigation() {
  document.querySelectorAll(".nav-tab[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.page));
  });

  $("btn-analytics")?.addEventListener("click", () => navigate("analytics"));
}

function initFab() {
  $("btn-header-add-task")?.addEventListener("click", async () => {
    if (state.currentPage === "growth") {
      const { openGoalForm } = await import("./pages/personalDevelopment.js");
      openGoalForm(state.user.uid, null, () => navigate("growth"));
    } else {
      const { openTaskModal } = await import("./pages/tasks.js");
      openTaskModal(state.user.uid, state.profile, () => {
        if (state.currentPage === "tasks") navigate("tasks");
        else if (state.currentPage === "dashboard") navigate("dashboard");
        else if (state.currentPage === "scheduler") navigate("scheduler");
      });
    }
  });
}

function initInstallPrompt() {
  const banner = $("install-banner");
  const installBtn = $("btn-install-app");
  const dismissBtn = $("btn-dismiss-install");

  if (!banner || !installBtn || !dismissBtn) return;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  // Don't show on iOS (manual instructions already on landing) or if already installed
  if (isIOS || isStandalone) return;

  // 3-day cooldown check
  const lastDismissed = localStorage.getItem("install_prompt_dismissed");
  if (lastDismissed) {
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (Date.now() - parseInt(lastDismissed) < threeDays) return;
  }

  // The beforeinstallprompt listener at the top of this file already captured
  // the event into window.deferredPrompt. We just need to react to it here.
  function maybeShowBanner() {
    if (window.deferredPrompt) {
      // Small delay so the user has a moment to engage with the page
      setTimeout(() => { if (window.deferredPrompt) showInstallBanner(); }, 3000);
    }
  }

  if (window.deferredPrompt) {
    // Event was already captured before initInstallPrompt ran
    maybeShowBanner();
  } else {
    // Wait for the top-level listener to capture it and dispatch the custom event
    window.addEventListener('pwa-prompt-ready', maybeShowBanner, { once: true });
  }

  installBtn.addEventListener("click", async () => {
    if (!window.deferredPrompt) return;

    window.deferredPrompt.prompt();
    const { outcome } = await window.deferredPrompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);

    window.deferredPrompt = null;
    hideInstallBanner();
  });

  dismissBtn.addEventListener("click", () => {
    hideInstallBanner();
    localStorage.setItem("install_prompt_dismissed", Date.now().toString());
  });

  function showInstallBanner() {
    banner.classList.remove("hidden", "animate-out");
    banner.classList.add("animate-in");
  }

  function hideInstallBanner() {
    banner.classList.remove("animate-in");
    banner.classList.add("animate-out");
    setTimeout(() => {
      banner.classList.add("hidden");
      banner.classList.remove("animate-out");
    }, 200);
  }
}

async function handleUserAuth(user) {
  state.user = user;

  // Load profile
  const profile = await getUserProfile(user.uid);
  state.profile = profile;

  // Apply saved theme
  applyTheme(profile?.theme || "dark");

  // Show app
  showAppPage();
  initNavigation();
  initFab();



  // Foreground push message listener
  try {
    onForegroundMessage((p) => {
      import("./notifications.js").then(({ showInAppNotification }) => {
        showInAppNotification(p.notification?.title || "Your Day", p.notification?.body || "You have a reminder.");
      });
    });
  } catch (_) {}

  // Check for action shortcut in URL
  const params = new URLSearchParams(window.location.search);
  if (params.get("action") === "add-task") {
    const { openTaskModal } = await import("./pages/tasks.js");
    openTaskModal(user.uid, profile, () => navigate("tasks"));
  }

  await navigate("dashboard");
}

// ── Entry point ───────────────────────────────────────────────────────────────
function main() {
  initLanding(showAuthPage);
  initAuthForms(handleUserAuth, showLanding);
  initInstallPrompt();
  
  // Service worker is managed by VitePWA in the build, 
  // but we keep a generic registration for dev/fallback if needed.
  // Actually, Vite-plugin-PWA handles this automatically when injectRegister is 'auto'.
  // So we remove manual registration to avoid conflicts with 'auto' mode.

  onAuthStateChanged(async (user) => {
    if (user) await handleUserAuth(user);
    else { state.user = state.profile = null; showLanding(); }
    hideSplash();
  });
}

function hideSplash() {
  const splash = $("app-splash");
  if (splash) {
    splash.classList.add("splash-hide");
    setTimeout(() => splash.remove(), 600);
  }
}

main();
