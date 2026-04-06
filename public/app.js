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
  createIcons: (config = {}) => {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => createIcons({ icons, ...config }));
    } else {
      setTimeout(() => createIcons({ icons, ...config }), 0);
    }
  }, 
  icons 
};
import { onAuthStateChanged } from "./auth.js";
import { getUserProfile } from "./db.js";
import { showFirstTimeGuide } from "./js/utils/userGuide.js";
import { renderDashboard } from "./pages/dashboard.js";
// Non-critical pages moved to dynamic imports inside navigate() and preloadRoutes()
import { $, showEl, hideEl, initRipples } from "./js/utils.js";
import { initAuthForms } from "./js/auth_ui.js";
import { initLanding, triggerLandingEntrance, triggerLandingReEnter } from "./js/landing.js";

import { cacheManager } from "./utils/cacheManager.js";


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
  // Slider logic handles the specific view (login/signup/forgot/verify)
  ["auth-login", "auth-signup", "auth-forgot", "auth-verify"].forEach(id => {
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
  cacheManager.set("user_theme", theme);
}

// ── Navigation Logic ──────────────────────────────────────────────────────────
const navDebounce = new Map();

/**
 * Navigate to a different tab or sub-page
 */
export async function navigate(page, params = {}) {
  const now = Date.now();
  if ((navDebounce.get(page) || 0) > now - 300) return; // 300ms debounce
  navDebounce.set(page, now);

  // ── Lifecycle Cleanup ──
  if (state.currentPageController?.cleanup) {
    try {
      state.currentPageController.cleanup();
    } catch (err) {
      console.warn(`Cleanup failed for page: ${state.currentPage}`, err);
    }
  }
  state.currentPageController = null;

  const oldPage = state.currentPage;
  state.currentPage = page;
  if (params.topicId) state.selectedTopicId = params.topicId;
  if (params.topicName) state.selectedTopicName = params.topicName;

  // ── History Management ──
  if (!params.noPush) {
    const url = page === "dashboard" ? "/" : `#${page}`;
    history.pushState({ page, params }, "", url);
  }

  document.querySelectorAll(".nav-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  const content = $("main-content");
  if (!content) return;
  
  // ── SWR Caching Step ──
  const uid = state.user?.uid || 'guest';
  let cacheKey = `${page}_${uid}`;
  
  // Specific overrides for pages with custom or unified keys
  if (page === 'growth' || page === 'personalDevelopment') {
    cacheKey = `pd_${uid}`;
  } else if (page === 'subtopics' && state.selectedTopicId) {
    cacheKey = `subtopics_${uid}_${state.selectedTopicId}`;
  }
  
  const cachedData = cacheManager.get(cacheKey);

  // Apply visual transition
  content.classList.remove("fadeSlideUp");
  void content.offsetWidth;
  content.classList.add("fadeSlideUp");

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
      growth: "Growth",
      subtopics: state.selectedTopicName || "Topics"
    };
    headerTitle.textContent = titles[page] || "Ascend";
  }

  // If no cache, show a lightweight loading shell
  if (!cachedData) {
    renderLoadingShell(page.charAt(0).toUpperCase() + page.slice(1));
  } else {
    // If we have cache, we might want to skip the "Loading..." text in the shell
    // but keep some structure if needed. For now, most pages will render immediately
    // from cache anyway.
    console.log(`[PWA] Instant render from cache: ${page}`);
  }

  let controller = null;
  const moduleCache = window._moduleCache || (window._moduleCache = new Map());
  const profile = state.profile;

  try {
    switch (page) {
      case "dashboard": {
        // Dashboard is usually pre-imported, but we ensure it supports initialData
        controller = renderDashboard(content, uid, profile, cachedData);
        break;
      }
      case "tasks": {
        const pageModule = moduleCache.get("tasks") || (await import("./pages/tasks.js"));
        moduleCache.set("tasks", pageModule);
        controller = await pageModule.renderTasks(content, uid, profile, cachedData);
        break;
      }
      case "analytics": {
        const pageModule = moduleCache.get("analytics") || (await import("./pages/analytics.js"));
        moduleCache.set("analytics", pageModule);
        controller = await pageModule.renderAnalytics(content, uid, profile, cachedData);
        break;
      }
      case "settings": {
        const pageModule = moduleCache.get("settings") || (await import("./pages/settings.js"));
        moduleCache.set("settings", pageModule);
        controller = await pageModule.renderSettings(content, uid, profile, state, cachedData);
        break;
      }
      case "scheduler": {
        const pageModule = moduleCache.get("scheduler") || (await import("./pages/scheduler.js"));
        moduleCache.set("scheduler", pageModule);
        controller = await pageModule.renderSchedulerTab(content, uid, profile, cachedData); 
        break;
      }
      case "personalDevelopment":
      case "growth": {
        const pageModule = moduleCache.get("growth") || (await import("./pages/personalDevelopment.js"));
        moduleCache.set("growth", pageModule);
        controller = await pageModule.renderPersonalDevelopment(content, uid, profile, cachedData);
        break;
      }
      case "topics": {
        const pageModule = moduleCache.get("topics") || (await import("./pages/topics.js"));
        moduleCache.set("topics", pageModule);
        controller = await pageModule.renderTopics(content, uid, profile, cachedData);
        break;
      }
      case "subtopics": {
        const pageModule = moduleCache.get("subtopics") || (await import("./pages/subtopics.js"));
        moduleCache.set("subtopics", pageModule);
        controller = await pageModule.renderSubtopics(content, uid, state.selectedTopicId, state.selectedTopicName, cachedData);
        break;
      }
    }
  } catch (err) {
    console.error(`Navigation failed for ${page}`, err);
    content.innerHTML = `<div class="error-state">Failed to load ${page}. Please try again.</div>`;
  }

  state.currentPageController = controller;
  initRipples();
  if (window.lucide) {
    // Defer icon creation to avoid blocking main thread during transitions
    const runCreate = () => window.lucide.createIcons({ nodes: content.querySelectorAll('[data-lucide]') });
    if (window.requestIdleCallback) window.requestIdleCallback(runCreate);
    else setTimeout(runCreate, 0);
  }
}

// ── Back Gesture & History Listener ──
window.addEventListener("popstate", (e) => {
  // If we have a page in state, navigate to it without pushing to history again
  if (e.state && e.state.page) {
    navigate(e.state.page, { ...e.state.params, noPush: true });
  } else if (window.location.hash) {
    // Fallback for direct hash changes or initial pops
    const page = window.location.hash.slice(1);
    if (page) navigate(page, { noPush: true });
  } else {
    // Default to dashboard
    navigate("dashboard", { noPush: true });
  }
  
  // Close any open modals/drawers when backing out
  const backdrops = document.querySelectorAll(".modal-backdrop:not(.sub-modal)");
  backdrops.forEach(b => {
    // If the modal has a custom closer that handles popstate correctly, use it
    if (b._closeModal) {
      b._closeModal(true);
    } else {
      // Fallback for other modals
      b.querySelector("#task-cancel")?.click();
      b.querySelector("#top-mgmt-close")?.click();
      if (!b.querySelector("#task-cancel") && !b.querySelector("#top-mgmt-close")) {
        b.remove();
      }
    }
  });
});


// ── Sub-component Init ────────────────────────────────────────────────────────
function initNavigation() {
  document.querySelectorAll(".nav-tab[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.page));
  });

  $("btn-analytics")?.addEventListener("click", () => navigate("analytics"));
}

function initFab() {
  $("btn-header-add-task")?.addEventListener("click", async () => {
    // ── Singleton Guard: Prevent multiple overlapping modals ──
    if (document.querySelector(".modal-backdrop")) {
      console.log("[PWA] Modal already open, ignoring click.");
      return;
    }

    const { user, profile, currentPage } = state;
    if (!user) return;

    // Use cached modules if available for instant response
    const moduleCache = window._moduleCache || (window._moduleCache = new Map());

    if (currentPage === "growth") {
      try {
        const pageModule = moduleCache.get("growth") || (await import("./pages/personalDevelopment.js"));
        moduleCache.set("growth", pageModule);
        pageModule.openGoalForm(user.uid, null, () => navigate("growth"));
      } catch (err) {
        console.error("Failed to open goal form", err);
      }
    } else {
      try {
        const pageModule = moduleCache.get("tasks") || (await import("./pages/tasks.js"));
        moduleCache.set("tasks", pageModule);
        pageModule.openTaskModal(user.uid, profile, () => {
          if (state.currentPage === "tasks") navigate("tasks");
          else if (state.currentPage === "dashboard") navigate("dashboard");
          else if (state.currentPage === "scheduler") navigate("scheduler");
        });
      } catch (err) {
        console.error("Failed to open task modal", err);
      }
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

function renderLoadingShell(pageName) {
  const content = $("main-content");
  if (!content) return;
  content.innerHTML = `
    <div class="premium-header">
      <div class="premium-greeting">Loading...</div>
      <h1 class="premium-name">${pageName}</h1>
      <div class="premium-subtitle">Hang tight, we're getting things ready.</div>
    </div>
    <div class="stats-row mb-lg">
      <div class="stat-card skeleton" style="height:80px"></div>
      <div class="stat-card skeleton" style="height:80px"></div>
    </div>
    <div class="task-card skeleton" style="height:120px"></div>
    <div class="task-card skeleton" style="height:120px"></div>
  `;
}

async function handleUserAuth(user) {
  // 0. Security: Enforce email verification for password-based users
  const isPasswordUser = user.providerData.some(p => p.providerId === "password");
  if (isPasswordUser && !user.emailVerified) {
    console.log("[PWA] User not verified. Showing verification screen.");
    showAuthPage("auth-verify");
    return;
  }

  state.user = user;

  // 1. SWR: Initial profile from cache for instant transition
  const profileCacheKey = `profile_${user.uid}`;
  const cachedProfile = cacheManager.get(profileCacheKey);
  
  // High-priority: Restore from swr_cache first for immediate consistency
  const cachedTheme = cacheManager.get("user_theme");
  if (cachedTheme) {
    applyTheme(cachedTheme);
  } else if (cachedProfile) {
    applyTheme(cachedProfile.theme || "dark");
  }

  if (cachedProfile) {
    console.log("[PWA] SWR: Instant profile from cache");
    state.profile = cachedProfile;
  }

  // 2. Show app shell immediately (even if profile is just from cache)
  showAppPage();
  initNavigation();
  initFab();


  // 4. Background: Navigation and Fresh Profile Fetch
  // Determine initial page from hash or default to dashboard
  const hash = window.location.hash.slice(1);
  const initialPage = (hash && ["dashboard", "tasks", "analytics", "settings", "scheduler", "growth", "personalDevelopment"].includes(hash)) 
    ? hash 
    : "dashboard";
    
  navigate(initialPage);
  
  getUserProfile(user.uid).then(async (profile) => {
    if (!profile) return;
    
    const oldProfile = state.profile;
    const hasChanged = JSON.stringify(profile) !== JSON.stringify(oldProfile);
    state.profile = profile;
    cacheManager.set(profileCacheKey, profile);

    if (hasChanged) {
      console.log("[PWA] Profile updated from server, refreshing UI");
      applyTheme(profile.theme || "dark");
      if (state.currentPage === "dashboard" && state.currentPageController?.update) {
        state.currentPageController.update(profile);
      }
    }

    // User Guide is now manually accessible via Settings
  });
  
  // ── Background Preloading ──
  // After initial paint, we preload other routes in the background during idle time
  // Wait a few seconds for the dashboard staggered content to settle
  setTimeout(() => {
    requestIdlePreload([
      () => import("./pages/tasks.js"),
      () => import("./pages/analytics.js"),
      () => import("./pages/settings.js"),
      () => import("./pages/scheduler.js"),
      () => import("./pages/personalDevelopment.js")
    ]);
  }, 3000);
}

/**
 * Preload modules during idle periods
 * @param {string[]} paths 
 */
function requestIdlePreload(factories) {
  const runner = window.requestIdleCallback || ((cb) => setTimeout(cb, 2000));
  
  factories.forEach((factory, index) => {
    // Stagger preloading to avoid any potential network congestion
    runner(() => {
      factory().then(() => {
        console.log(`[PWA] Preloaded module ${index} ✓`);
      }).catch(err => {
        console.warn(`[PWA] Preload failed for module ${index}`, err);
      });
    }, { timeout: 3000 + (index * 1500) });
  });
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
