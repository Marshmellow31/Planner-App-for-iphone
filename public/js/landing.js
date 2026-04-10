/**
 * landing.js — Landing page logic and animations
 */
import { $, showEl, hideEl } from "./utils.js";

export function initLanding(showAuthPage) {
  function animateCtaThenGo(btnId, authView) {
    const btn = $(btnId);
    const landing = $("page-landing");
    if (!btn) return;
    btn.addEventListener("click", () => {
      btn.classList.add("btn-cta-pressed");
      landing?.classList.add("page-exit");
      setTimeout(() => {
        btn.classList.remove("btn-cta-pressed");
        landing?.classList.remove("page-exit");
        showAuthPage(authView);
      }, 320);
    });
  }
  animateCtaThenGo("btn-get-started", "auth-signup");
  animateCtaThenGo("btn-landing-login", "auth-login");
}

export function triggerLandingEntrance() {
  const landing = $("page-landing");
  if (!landing) return;
  landing.classList.remove("landing-animate-in", "page-enter");
  // Double-rAF to reset animation without layout thrashing
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      landing.classList.add("landing-animate-in");
    });
  });
}

export function triggerLandingReEnter() {
  const landing = $("page-landing");
  if (!landing) return;
  landing.classList.remove("page-enter", "landing-animate-in");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      landing.classList.add("page-enter");
    });
  });
}
