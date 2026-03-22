// ============================================================
// auth.js — Firebase Authentication helpers
// ============================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged as _onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Sign up with email/password ───────────────────────────────────────────────
export async function signUp(email, password, displayName) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Update Firebase Auth profile
  await updateProfile(user, { displayName });

  // Create Firestore user profile document
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    displayName,
    email: user.email,
    photoURL: user.photoURL || null,
    theme: "dark",
    weekStartDay: "monday",
    notificationEnabled: false,
    reminderSettings: {
      defaultMinutesBefore: 30,
    },
    studyGoals: "",
    subjectsGrouped: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
}

// ── Log in ───────────────────────────────────────────────────────────────────
export async function logIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// ── Log out ──────────────────────────────────────────────────────────────────
export async function logOut() {
  await signOut(auth);
}

// ── Password reset ────────────────────────────────────────────────────────────
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ── Auth state listener ───────────────────────────────────────────────────────
export function onAuthStateChanged(callback) {
  return _onAuthStateChanged(auth, callback);
}

// ── Get or create user profile from Firestore ─────────────────────────────────
export async function getUserProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  return null;
}

// ── Update user profile ───────────────────────────────────────────────────────
export async function updateUserProfile(uid, updates) {
  const ref = doc(db, "users", uid);
  const { updateDoc, serverTimestamp: st } = await import(
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
  );
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
  // Also update Firebase Auth display name if changed
  if (updates.displayName && auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: updates.displayName });
  }
}
