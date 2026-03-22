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
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Google Sign In ─────────────────────────────────────────────────────────────
export async function logInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;

  // Check if profile exists; if not, create it
  const profileRef = doc(db, "users", user.uid);
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) {
    await setDoc(profileRef, {
      uid: user.uid,
      displayName: user.displayName || "Student",
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
  }

  return user;
}

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

// Note: getUserProfile and updateUserProfile are in db.js
// Do not duplicate them here.
