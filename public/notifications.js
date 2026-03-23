// ============================================================
// notifications.js — Web Push / FCM subscription management
// ============================================================

import { messaging, VAPID_KEY } from "./firebase-config.js";
import { saveFcmToken, removeFcmToken } from "./db.js";
import {
  getToken,
  deleteToken,
  onMessage,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

// ── Request notification permission + get FCM token ───────────────────────────
export async function initNotifications(uid) {
  if (!messaging) {
    console.warn("FCM messaging not supported in this browser/context.");
    return false;
  }

  if (!("Notification" in window)) {
    console.warn("Notifications not supported.");
    return false;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("Notification permission denied.");
    return false;
  }

  try {
    // Register service worker first (FCM requirement)
    await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      await saveFcmToken(uid, token);
      console.log("FCM token saved:", token.substring(0, 20) + "...");
      return token;
    }
  } catch (err) {
    console.error("FCM token error:", err);
  }

  return false;
}

// ── Disable notifications — remove token from Firestore ──────────────────────
export async function disableNotifications(uid) {
  if (!messaging) return;
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      await deleteToken(messaging);
      await removeFcmToken(uid, token);
    }
  } catch (err) {
    console.error("Error removing FCM token:", err);
  }
}

// ── Listen for foreground push messages ──────────────────────────────────────
export function onForegroundMessage(callback) {
  if (!messaging) return;
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}

// ── iOS / Safari push permission check ───────────────────────────────────────
export function isNotificationSupported() {
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export function getNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

// ── Show a local in-app notification (fallback for foreground) ────────────────
export function showInAppNotification(title, body, onAction = null) {
  const el = document.createElement("div");
  el.className = "toast-notification";
  el.innerHTML = `
    <div class="toast-icon">🔔</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-body">${body}</div>
    </div>
    <button class="toast-close" aria-label="Close">✕</button>
  `;

  el.querySelector(".toast-close").addEventListener("click", () => el.remove());
  if (onAction) el.addEventListener("click", onAction);

  document.body.appendChild(el);
  // Auto-remove after 5 seconds
  setTimeout(() => el.classList.add("fade-out"), 4500);
  setTimeout(() => el.remove(), 5000);
}
