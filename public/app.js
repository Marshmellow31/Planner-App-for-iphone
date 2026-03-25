import "./styles.css";
import { onAuthStateChanged } from "./auth.js";
import { getUserProfile } from "./db.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderSubjects } from "./pages/subjects.js";
import { renderTopics } from "./pages/topics.js";
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
  selectedSubjectId: null,
  selectedSubjectName: null,
};

// ── Show Landing / Auth / App shells ──────────────────────────────────────────
function showLanding(animateIn = false) {
  hideEl("page-auth", "page-app");
  showEl("page-landing");
  if (animateIn) triggerLandingReEnter();
  else triggerLandingEntrance();
}

function showAuthPage(view = "auth-login") {
  hideEl("page-landing", "page-app");
  showEl("page-auth");
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
  hideEl("page-landing", "page-auth");
  showEl("page-app");
}

// ── Theme Application ─────────────────────────────────────────────────────────
export function applyTheme(theme = "dark") {
  document.documentElement.setAttribute("data-theme", theme);
}

// ── Navigation Logic ──────────────────────────────────────────────────────────
export async function navigate(page, params = {}) {
  state.currentPage = page;
  if (params.subjectId) state.selectedSubjectId = params.subjectId;
  if (params.subjectName) state.selectedSubjectName = params.subjectName;

  document.querySelectorAll(".drawer-item").forEach((btn) => {
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
  
  // Toggle FAB visibility
  const fab = $("fab-add-task");
  if (fab) {
    const hideFabPages = ["subjects", "personalDevelopment", "settings", "analytics", "scheduler"];
    fab.classList.toggle("hidden", hideFabPages.includes(page));
  }

  switch (page) {
    case "dashboard":  await renderDashboard(content, uid, profile); break;
    case "subjects":   await renderSubjects(content, uid, profile); break;
    case "topics":     await renderTopics(content, uid, params.subjectId || state.selectedSubjectId, params.subjectName || state.selectedSubjectName); break;
    case "tasks":      await renderTasks(content, uid, profile); break;
    case "analytics":  await renderAnalytics(content, uid, profile); break;
    case "settings":   await renderSettings(content, uid, profile, state); break;
    case "scheduler":   
      const { renderSchedulerTab } = await import("./pages/scheduler.js");
      await renderSchedulerTab(content, uid, profile); 
      break;
    case "personalDevelopment":
      const { renderPersonalDevelopment } = await import("./pages/personalDevelopment.js");
      await renderPersonalDevelopment(content, uid, profile);
      break;
  }

  initRipples();
  if (window.lucide) window.lucide.createIcons();
}

// ── Sub-component Init ────────────────────────────────────────────────────────
function initNavigation() {
  const drawer = $("side-drawer"), 
        overlay = $("drawer-overlay"), 
        toggleBtn = $("btn-menu-toggle"), 
        closeBtn = $("btn-close-drawer");

  const open = () => { drawer?.classList.add("open"); overlay?.classList.add("active"); };
  const close = () => { drawer?.classList.remove("open"); overlay?.classList.remove("active"); };

  toggleBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  overlay?.addEventListener("click", close);

  document.querySelectorAll(".drawer-item[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => { navigate(btn.dataset.page); close(); });
  });

  // ── Swipe Gestures ──
  let touchStartX = 0;
  let touchTranslateX = 0;
  const SWIPE_THRESHOLD = 80;
  const EDGE_THRESHOLD = 40;

  document.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    const isOpen = drawer?.classList.contains("open");

    if (!isOpen) {
      // Swipe to Open (from left edge)
      if (touchStartX < EDGE_THRESHOLD && deltaX > SWIPE_THRESHOLD) {
        open();
      }
    } else {
      // Swipe to Close (anywhere leftwards)
      if (deltaX < -SWIPE_THRESHOLD) {
        close();
      }
    }
  }, { passive: true });
}

function initFab() {
  $("fab-add-task")?.addEventListener("click", async () => {
    const { openTaskModal } = await import("./pages/tasks.js");
    openTaskModal(state.user.uid, state.profile, () => {
      if (state.currentPage === "tasks" || state.currentPage === "dashboard") navigate(state.currentPage);
    });
  });
}

function initInstallPrompt() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (isIOS && !isStandalone && !localStorage.getItem("sf_install_dismissed")) {
    setTimeout(() => $("install-prompt")?.classList.remove("hidden"), 30000);
  }
  $("install-prompt-close")?.addEventListener("click", () => {
    $("install-prompt")?.classList.add("hidden");
    localStorage.setItem("sf_install_dismissed", "1");
  });
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    const p = $("install-prompt");
    if (p) {
      p.querySelector(".install-prompt-desc").textContent = "Install Your Day for the best experience";
      p.classList.remove("hidden");
      p.addEventListener("click", () => e.prompt(), { once: true });
    }
  });
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

  // Home Button Logic
  $("btn-home")?.addEventListener("click", () => navigate("dashboard"));

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
  
  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // In dev mode, VitePWA may serve sw.js at the root or as /dev-sw.js?dev-sw
      // By using /sw.js, we target the production-ready path which VitePWA handles
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => {
          console.log('SW registered:', reg);
        })
        .catch(err => {
          console.log('SW registration failed:', err);
        });
    });
  }

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
