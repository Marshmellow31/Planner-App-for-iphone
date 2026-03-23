// ============================================================
// db.js — Firestore CRUD helpers for all collections
// ============================================================

import {
  collection,
  doc,
  addDoc,
  setDoc,
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
    where("userId", "==", uid)
  );
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return data.sort((a, b) => {
    if (a.order !== b.order) return (a.order || 0) - (b.order || 0);
    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
    return tA - tB;
  });
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
  const constraints = [where("userId", "==", uid)];
  if (subjectId) constraints.push(where("subjectId", "==", subjectId));
  const q = query(collection(db, "topics"), ...constraints);
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return data.sort((a, b) => {
    if (a.order !== b.order) return (a.order || 0) - (b.order || 0);
    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
    return tA - tB;
  });
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

  const q = query(collection(db, "tasks"), ...constraints);
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return data.sort((a, b) => {
    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
    return tB - tA; // desc
  });
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
  await setDoc(doc(db, "users", uid, "fcmTokens", token), {
    token,
    createdAt: serverTimestamp(),
    platform: navigator.platform || "unknown",
  });
}

export async function removeFcmToken(uid, token) {
  await deleteDoc(doc(db, "users", uid, "fcmTokens", token));
}

// ─────────────────────────────────────────────────────────────
//  WEEKLY SCHEDULE
// ─────────────────────────────────────────────────────────────
const defaultSchedule = {
  Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
};

export async function getWeeklySchedule(uid) {
  const snap = await getDoc(doc(db, "users", uid, "planner", "schedule"));
  if (snap.exists()) {
    const data = snap.data();
    return { ...defaultSchedule, ...data.week_schedule };
  }
  return defaultSchedule;
}

export async function saveWeeklySchedule(uid, week_schedule) {
  await setDoc(doc(db, "users", uid, "planner", "schedule"), {
    week_schedule,
    updatedAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────────
//  SCHEDULER TASKS & GENERATED PLAN
// ─────────────────────────────────────────────────────────────
export async function createSchedulerTask(uid, taskData) {
  return addDoc(collection(db, "schedulerTasks"), {
    userId: uid,
    title: taskData.title,
    subject: taskData.subject || "",
    estimatedTime: parseInt(taskData.estimatedTime, 10) || 60,
    deadline: taskData.deadline || null,
    priority: taskData.priority || "medium",
    notes: taskData.notes || "",
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getSchedulerTasks(uid) {
  const q = query(collection(db, "schedulerTasks"), where("userId", "==", uid));
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return data.sort((a, b) => {
    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
    return tA - tB;
  });
}

export async function updateSchedulerTask(id, data) {
  await updateDoc(doc(db, "schedulerTasks", id), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function deleteSchedulerTask(id) {
  await deleteDoc(doc(db, "schedulerTasks", id));
}

export async function getGeneratedPlan(uid) {
  const snap = await getDoc(doc(db, "users", uid, "planner", "generated_plan"));
  return snap.exists() ? snap.data().plan : null;
}

export async function saveGeneratedPlan(uid, plan) {
  await setDoc(doc(db, "users", uid, "planner", "generated_plan"), {
    plan,
    updatedAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────────
//  PERSONAL GOALS
// ─────────────────────────────────────────────────────────────
export async function createGoal(uid, goalData) {
  return addDoc(collection(db, "personalGoals"), {
    userId: uid,
    title: goalData.title,
    category: goalData.category || "custom",
    totalTarget: goalData.totalTarget,
    unit: goalData.unit || "sessions",
    durationDays: goalData.durationDays,
    startDate: goalData.startDate,
    endDate: goalData.endDate || null,
    dailyTarget: goalData.dailyTarget,
    priority: goalData.priority || "medium",
    autoAddDaily: goalData.autoAddDaily !== false,
    status: "active",
    totalProgress: 0,
    lastGeneratedDate: null,
    notes: goalData.notes || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getGoals(uid) {
  const q = query(collection(db, "personalGoals"), where("userId", "==", uid));
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return data.sort((a, b) => {
    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return tB - tA;
  });
}

export async function updateGoal(id, data) {
  await updateDoc(doc(db, "personalGoals", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteGoal(id) {
  await deleteDoc(doc(db, "personalGoals", id));
}

// ─────────────────────────────────────────────────────────────
//  GOAL TASKS (auto-generated daily tasks from a goal)
// ─────────────────────────────────────────────────────────────
export async function createGoalTask(uid, taskData) {
  return addDoc(collection(db, "goalTasks"), {
    userId: uid,
    sourceGoalId: taskData.sourceGoalId,
    title: taskData.title,
    type: "personalDevelopment",
    estimatedTime: taskData.estimatedTime || 30,
    deadline: taskData.deadline || null,
    priority: taskData.priority || "medium",
    status: "pending",
    autoGenerated: true,
    date: taskData.date,        // YYYY-MM-DD — used for deduplication
    schedulerTaskId: null,      // set when pushed to schedulerTasks
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getGoalTasks(uid, goalId = null) {
  const constraints = [where("userId", "==", uid)];
  if (goalId) constraints.push(where("sourceGoalId", "==", goalId));
  const q = query(collection(db, "goalTasks"), ...constraints);
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return data.sort((a, b) => {
    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return tB - tA;
  });
}

export async function updateGoalTask(id, data) {
  await updateDoc(doc(db, "goalTasks", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteGoalTask(id) {
  await deleteDoc(doc(db, "goalTasks", id));
}
