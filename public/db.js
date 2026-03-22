// ============================================================
// db.js — Firestore CRUD helpers for all collections
// ============================================================

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// ─────────────────────────────────────────────────────────────
//  USER PROFILE
// ─────────────────────────────────────────────────────────────
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() });
}

// ─────────────────────────────────────────────────────────────
//  SUBJECTS
// ─────────────────────────────────────────────────────────────
export async function createSubject(uid, { name, color, order = 0 }) {
  return addDoc(collection(db, "subjects"), {
    userId: uid,
    name,
    color: color || "#6c63ff",
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getSubjects(uid) {
  const q = query(
    collection(db, "subjects"),
    where("userId", "==", uid),
    orderBy("order", "asc"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateSubject(id, data) {
  await updateDoc(doc(db, "subjects", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteSubject(id) {
  await deleteDoc(doc(db, "subjects", id));
}

// ─────────────────────────────────────────────────────────────
//  TOPICS
// ─────────────────────────────────────────────────────────────
export async function createTopic(uid, { subjectId, name, order = 0 }) {
  return addDoc(collection(db, "topics"), {
    userId: uid,
    subjectId,
    name,
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getTopics(uid, subjectId = null) {
  const constraints = [
    where("userId", "==", uid),
    orderBy("order", "asc"),
    orderBy("createdAt", "asc"),
  ];
  if (subjectId) constraints.splice(1, 0, where("subjectId", "==", subjectId));
  const q = query(collection(db, "topics"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateTopic(id, data) {
  await updateDoc(doc(db, "topics", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteTopic(id) {
  await deleteDoc(doc(db, "topics", id));
}

// ─────────────────────────────────────────────────────────────
//  TASKS
// ─────────────────────────────────────────────────────────────
export async function createTask(uid, taskData) {
  const {
    subjectId = null,
    topicId = null,
    title,
    description = "",
    priority = "medium",
    dueDate = null,
    reminderTime = null,
  } = taskData;

  return addDoc(collection(db, "tasks"), {
    userId: uid,
    subjectId,
    topicId,
    title,
    description,
    priority,
    dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
    reminderTime: reminderTime ? Timestamp.fromDate(new Date(reminderTime)) : null,
    isCompleted: false,
    completedAt: null,
    reminderSent: false,
    snoozedUntil: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getTasks(uid, filters = {}) {
  const constraints = [where("userId", "==", uid)];

  if (filters.subjectId) constraints.push(where("subjectId", "==", filters.subjectId));
  if (filters.topicId) constraints.push(where("topicId", "==", filters.topicId));
  if (filters.isCompleted !== undefined)
    constraints.push(where("isCompleted", "==", filters.isCompleted));
  if (filters.priority) constraints.push(where("priority", "==", filters.priority));

  const q = query(collection(db, "tasks"), ...constraints, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateTask(id, data) {
  const update = { ...data, updatedAt: serverTimestamp() };
  if (data.dueDate) update.dueDate = Timestamp.fromDate(new Date(data.dueDate));
  if (data.reminderTime) update.reminderTime = Timestamp.fromDate(new Date(data.reminderTime));
  await updateDoc(doc(db, "tasks", id), update);
}

export async function completeTask(id) {
  await updateDoc(doc(db, "tasks", id), {
    isCompleted: true,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function reopenTask(id) {
  await updateDoc(doc(db, "tasks", id), {
    isCompleted: false,
    completedAt: null,
    reminderSent: false,
    updatedAt: serverTimestamp(),
  });
}

export async function snoozeTask(id, minutes = 15) {
  const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000);
  await updateDoc(doc(db, "tasks", id), {
    snoozedUntil: Timestamp.fromDate(snoozedUntil),
    reminderSent: false,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(id) {
  await deleteDoc(doc(db, "tasks", id));
}

// ─────────────────────────────────────────────────────────────
//  FCM TOKENS
// ─────────────────────────────────────────────────────────────
export async function saveFcmToken(uid, token) {
  const { setDoc } = await import(
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
  );
  await setDoc(doc(db, "users", uid, "fcmTokens", token), {
    token,
    createdAt: serverTimestamp(),
    platform: navigator.platform || "unknown",
  });
}

export async function removeFcmToken(uid, token) {
  await deleteDoc(doc(db, "users", uid, "fcmTokens", token));
}
