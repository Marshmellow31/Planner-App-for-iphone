/**
 * utils.js — Global DOM helpers, UI effects, and error formatting
 */

export const $ = (id) => document.getElementById(id);

export function showEl(...ids) { ids.forEach((id) => $(id)?.classList.remove("hidden")); }
export function hideEl(...ids) { ids.forEach((id) => $(id)?.classList.add("hidden")); }

/**
 * Friendly Firebase error mapper
 */
export function friendlyError(code) {
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

/**
 * Initialize ripple effects on elements with .ripple class
 */
export function initRipples() {
  document.querySelectorAll(".ripple").forEach(btn => {
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

/**
 * Safely escape HTML to prevent XSS in template literals
 */
export function escHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Format a date relative to today ("Today", "Tomorrow", or "Jan 5")
 */
export function formatDate(date) {
  const now = new Date();
  const d = new Date(date);
  if (d.toDateString() === now.toDateString()) return "Today";
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
/**
 * Schedule a task to run during idle time or after a delay.
 * @param {Function} fn 
 * @param {number} delay 
 * @returns {number|string} taskId
 */
export function scheduleTask(fn, delay = 0) {
  if (delay > 0) {
    return setTimeout(fn, delay);
  }
  if (window.requestIdleCallback) {
    return window.requestIdleCallback(fn, { timeout: 2000 });
  }
  return setTimeout(fn, 16);
}

/**
 * Process an array in small chunks to avoid blocking the main thread.
 * @param {Array} items 
 * @param {Function} processor (item, index) => void
 * @param {number} chunkSize 
 */
export async function chunkProcess(items, processor, chunkSize = 20) {
  let index = 0;
  async function doChunk() {
    const startTime = performance.now();
    const end = Math.min(index + chunkSize, items.length);
    
    for (; index < end; index++) {
      processor(items[index], index);
      // Safety check: if a single chunk takes too long, stop early (>12ms)
      if (performance.now() - startTime > 12) {
        index++; 
        break; 
      }
    }
    
    if (index < items.length) {
      return new Promise(resolve => {
        scheduleTask(async () => {
          await doChunk();
          resolve();
        });
      });
    }
  }
  return doChunk();
}

/**
 * Lightweight performance logging
 */
export function perfLog(label, startTime) {
  const duration = (performance.now() - startTime).toFixed(2);
  console.log(`[Perf] ${label}: ${duration}ms`);
}
