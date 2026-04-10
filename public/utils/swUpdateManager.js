/**
 * swUpdateManager.js — Robust Service Worker Update Manager
 * 
 * Handles SW lifecycle for PWA updates, with special attention to iOS Safari
 * which doesn't support skipWaiting the same way as Chrome/Android.
 * 
 * Usage: import and call initSWUpdater() in your app entry point.
 */

const SW_CHECK_INTERVAL = 60 * 1000; // Check for updates every 60 seconds
const SW_PATH = '/sw.js';

let _registration = null;
let _updateBannerShown = false;
let _checkInterval = null;

/**
 * Initialize the Service Worker update manager.
 * Should be called once from your app entry point.
 */
export function initSWUpdater() {
  if (!('serviceWorker' in navigator)) return;

  // Register the service worker
  navigator.serviceWorker.register(SW_PATH, { scope: '/' })
    .then((reg) => {
      _registration = reg;
      console.log('[SW] Registered successfully');

      // If there's already a waiting worker (e.g. user opened a stale tab), show banner immediately
      if (reg.waiting) {
        console.log('[SW] Update already waiting on load');
        showUpdateBanner(reg.waiting);
      }

      // Listen for new service workers being installed
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        console.log('[SW] New service worker installing...');

        newWorker.addEventListener('statechange', () => {
          // When the new SW is installed and waiting to activate
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New version installed and waiting');
            showUpdateBanner(newWorker);
          }
        });
      });

      // Periodic update checks (critical for iOS which doesn't auto-check frequently)
      startPeriodicChecks(reg);

      // Also check on visibility change (user comes back to the app)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && reg) {
          console.log('[SW] App became visible, checking for updates...');
          reg.update().catch(err => console.warn('[SW] Update check failed:', err));
        }
      });

      // Check on focus (belt and suspenders for iOS)
      window.addEventListener('focus', () => {
        if (reg) {
          reg.update().catch(err => console.warn('[SW] Focus update check failed:', err));
        }
      });
    })
    .catch((err) => {
      console.error('[SW] Registration failed:', err);
    });

  // Listen for the controlling service worker changing (after skipWaiting)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[SW] Controller changed — reloading page');
    // Use a flag to prevent infinite reload loops
    if (!sessionStorage.getItem('sw_reloading')) {
      sessionStorage.setItem('sw_reloading', 'true');
      window.location.reload();
    }
  });

  // Clear the reload flag after successful load
  sessionStorage.removeItem('sw_reloading');
}

/**
 * Start periodic background checks for SW updates.
 * iOS Safari only checks for SW updates on navigation, not on focus/visibility.
 * This ensures we catch updates even if the user keeps the app open.
 */
function startPeriodicChecks(registration) {
  if (_checkInterval) clearInterval(_checkInterval);

  _checkInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      registration.update().catch(err => 
        console.warn('[SW] Periodic update check failed:', err)
      );
    }
  }, SW_CHECK_INTERVAL);
}

/**
 * Show the "Update Available" banner to the user.
 * The user taps "Update Now" → we tell the waiting SW to skipWaiting.
 */
function showUpdateBanner(waitingWorker) {
  if (_updateBannerShown) return;
  _updateBannerShown = true;

  const banner = document.getElementById('sw-update-banner');
  if (!banner) {
    console.warn('[SW] Update banner element not found in DOM');
    // Fallback: auto-update without user prompt
    applyUpdate(waitingWorker);
    return;
  }

  // Show the banner with animation
  banner.classList.remove('hidden');
  requestAnimationFrame(() => {
    banner.classList.add('sw-banner-visible');
  });

  // Wire up the "Update Now" button
  const updateBtn = document.getElementById('btn-sw-update');
  const dismissBtn = document.getElementById('btn-sw-dismiss');

  if (updateBtn) {
    updateBtn.addEventListener('click', () => {
      updateBtn.disabled = true;
      updateBtn.textContent = 'Updating...';
      applyUpdate(waitingWorker);
    }, { once: true });
  }

  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      banner.classList.remove('sw-banner-visible');
      setTimeout(() => banner.classList.add('hidden'), 300);
      _updateBannerShown = false;
    }, { once: true });
  }
}

/**
 * Tell the waiting service worker to take over.
 * The controllerchange listener will handle the page reload.
 */
function applyUpdate(waitingWorker) {
  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Force check for updates (can be called from settings page, etc.)
 */
export function checkForUpdates() {
  if (_registration) {
    return _registration.update();
  }
  return Promise.resolve();
}

/**
 * Get the current SW registration (for debugging/status checking)
 */
export function getSWRegistration() {
  return _registration;
}
