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
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { showSnackbar } from "./snackbar.js";
import { logSecurityEvent } from "./js/utils/logger.js";
import { sanitizeString, sanitizeNumber, sanitizeEnum, isValidDateStr } from "./js/utils/sanitizer.js";
import { connectivity } from "./utils/connectivityManager.js";

function handleError(err, context = "operation") {
  console.error(`DB Error (${context}):`, err);
  
  const isPermissionError = err.message && err.message.toLowerCase().includes("permission");
  
  // Log the security event
  logSecurityEvent(isPermissionError ? "DB_PERMISSION_DENIED" : "DB_ERROR", {
    context,
    code: err.code || "unknown",
    message: err.message
  });

  // Don't show noisy error toasts when offline — Firestore will serve from cache
  if (!connectivity.isOnline) {
    console.log(`[DB] Offline — suppressing error toast for "${context}"`);
    return null; // Return null instead of throwing when offline
  }

  if (isPermissionError) {
    showSnackbar("Permission denied. Check database rules.", "error");
  } else {
    showSnackbar(`Failed to sync ${context}.`, "error");
  }
  throw err;
}

// ─────────────────────────────────────────────────────────────
//  USER PROFILE
// ─────────────────────────────────────────────────────────────
export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    return handleError(err, "profile");
  }
}

export async function updateUserProfile(uid, data) {
  try {
    const cleanData = {};
    if (data.displayName !== undefined) cleanData.displayName = sanitizeString(data.displayName, 50);
    if (data.photoURL !== undefined) cleanData.photoURL = sanitizeString(data.photoURL, 2048);
    
    await updateDoc(doc(db, "users", uid), { ...cleanData, updatedAt: serverTimestamp() });
  } catch (err) {
    handleError(err, "update profile");
  }
}

// ─────────────────────────────────────────────────────────────
//  SUBJECTS
// ─────────────────────────────────────────────────────────────
export async function createSubject(uid, { name, color, order = 0 }) {
  try {
    return await addDoc(collection(db, "subjects"), {
      userId: uid,
      name: sanitizeString(name, 50),
      color: sanitizeString(color, 20) || "#6c63ff",
      order: sanitizeNumber(order, 0, 100, 0),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    return handleError(err, "create subject");
  }
}

export async function getSubjects(uid) {
  try {
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
  } catch (err) {
    return handleError(err, "load subjects");
  }
}

export async function updateSubject(id, data) {
  try {
    const update = { updatedAt: serverTimestamp() };
    if (data.name !== undefined) update.name = sanitizeString(data.name, 50);
    if (data.color !== undefined) update.color = sanitizeString(data.color, 20);
    if (data.order !== undefined) update.order = sanitizeNumber(data.order, 0, 100, 0);

    await updateDoc(doc(db, "subjects", id), update);
  } catch (err) {
    handleError(err, "update subject");
  }
}

export async function deleteSubject(id) {
  try {
    await deleteDoc(doc(db, "subjects", id));
  } catch (err) {
    handleError(err, "delete subject");
  }
}

// ─────────────────────────────────────────────────────────────
//  TOPICS
// ─────────────────────────────────────────────────────────────
export async function createTopic(uid, { subjectId, name, order = 0 }) {
  try {
    return await addDoc(collection(db, "topics"), {
      userId: uid,
      subjectId: sanitizeString(subjectId, 100),
      name: sanitizeString(name, 50),
      order: sanitizeNumber(order, 0, 100, 0),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    return handleError(err, "create topic");
  }
}

export async function getTopics(uid, subjectId = null) {
  try {
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
  } catch (err) {
    return handleError(err, "load topics");
  }
}

export async function updateTopic(id, data) {
  try {
    const update = { updatedAt: serverTimestamp() };
    if (data.name !== undefined) update.name = sanitizeString(data.name, 50);
    if (data.order !== undefined) update.order = sanitizeNumber(data.order, 0, 100, 0);
    if (data.subjectId !== undefined) update.subjectId = sanitizeString(data.subjectId, 100);

    await updateDoc(doc(db, "topics", id), update);
  } catch (err) {
    handleError(err, "update topic");
  }
}

export async function deleteTopic(id) {
  try {
    await deleteDoc(doc(db, "topics", id));
  } catch (err) {
    handleError(err, "delete topic");
  }
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
  } = taskData;

  try {
    return await addDoc(collection(db, "tasks"), {
      userId: uid,
      subjectId: sanitizeString(subjectId, 100),
      topicId: sanitizeString(topicId, 100),
      title: sanitizeString(title, 100),
      description: sanitizeString(description, 1000),
      priority: sanitizeEnum(priority?.toLowerCase(), ["high", "medium", "low"], "medium"),
      dueDate: isValidDateStr(dueDate) ? Timestamp.fromDate(new Date(dueDate)) : null,
      isCompleted: false,
      completedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    return handleError(err, "create task");
  }
}

export async function getTasks(uid, filters = {}) {
  try {
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
  } catch (err) {
    return handleError(err, "load tasks");
  }
}

export async function updateTask(id, data) {
  try {
    const update = { updatedAt: serverTimestamp() };
    if (data.title !== undefined) update.title = sanitizeString(data.title, 100);
    if (data.description !== undefined) update.description = sanitizeString(data.description, 1000);
    if (data.priority !== undefined) update.priority = sanitizeEnum(data.priority?.toLowerCase(), ["high", "medium", "low"], "medium");
    if (data.dueDate !== undefined) update.dueDate = isValidDateStr(data.dueDate) ? Timestamp.fromDate(new Date(data.dueDate)) : null;
    if (data.isCompleted !== undefined) update.isCompleted = !!data.isCompleted;
    if (data.subjectId !== undefined) update.subjectId = sanitizeString(data.subjectId, 100);
    if (data.topicId !== undefined) update.topicId = sanitizeString(data.topicId, 100);


    await updateDoc(doc(db, "tasks", id), update);
  } catch (err) {
    handleError(err, "update task");
  }
}

export async function completeTask(id) {
  try {
    await updateDoc(doc(db, "tasks", id), {
      isCompleted: true,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleError(err, "complete task");
  }
}

export async function reopenTask(id) {
  try {
    await updateDoc(doc(db, "tasks", id), {
      isCompleted: false,
      completedAt: null,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleError(err, "reopen task");
  }
}

export async function deleteTask(id) {
  try {
    await deleteDoc(doc(db, "tasks", id));
  } catch (err) {
    handleError(err, "delete task");
  }
}

// snoozeTask, saveFcmToken, removeFcmToken etc. REMOVED as notifications are deprecated.// ─────────────────────────────────────────────────────────────
//  SCHEDULE BLOCKS (DIGITAL OBSIDIAN 3.0)
// ─────────────────────────────────────────────────────────────
export async function createScheduleBlock(uid, data) {
  try {
    return await addDoc(collection(db, "scheduleBlocks"), {
      userId: uid,
      taskId: data.taskId || null,
      title: sanitizeString(data.title, 100),
      date: sanitizeString(data.date, 20), // YYYY-MM-DD
      startTime: sanitizeString(data.startTime, 10), // HH:MM
      endTime: sanitizeString(data.endTime, 10), // HH:MM
      status: data.status || "upcoming", // upcoming, active, completed, missed
      isLocked: !!data.isLocked,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    return handleError(err, "create schedule block");
  }
}

export async function getScheduleBlocks(uid, dateStr = null) {
  try {
    const constraints = [where("userId", "==", uid)];
    if (dateStr) constraints.push(where("date", "==", dateStr));
    
    const q = query(collection(db, "scheduleBlocks"), ...constraints);
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return data;
  } catch (err) {
    return handleError(err, "load schedule blocks");
  }
}

export async function updateScheduleBlock(id, data) {
  try {
    await updateDoc(doc(db, "scheduleBlocks", id), {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleError(err, "update schedule block");
  }
}

export async function deleteScheduleBlock(id) {
  try {
    await deleteDoc(doc(db, "scheduleBlocks", id));
  } catch (err) {
    handleError(err, "delete schedule block");
  }
}

// ─────────────────────────────────────────────────────────────
//  FOCUS SESSIONS (DIGITAL OBSIDIAN 3.0)
// ─────────────────────────────────────────────────────────────
export async function createFocusSession(uid, data) {
  try {
    return await addDoc(collection(db, "focusSessions"), {
      userId: uid,
      blockId: data.blockId || null,
      taskId: data.taskId || null,
      startTime: serverTimestamp(),
      endTime: null,
      durationMs: 0,
      distractionCount: 0,
      notes: "",
      status: "active" // active, paused, completed
    });
  } catch (err) {
    return handleError(err, "create focus session");
  }
}

export async function updateFocusSession(id, data) {
  try {
    if (data.status === "completed" && !data.endTime) {
      data.endTime = serverTimestamp();
    }
    await updateDoc(doc(db, "focusSessions", id), data);
  } catch (err) {
    handleError(err, "update focus session");
  }
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
  try {
    return await addDoc(collection(db, "personalGoals"), {
      userId: uid,
      title: sanitizeString(goalData.title, 100),
      category: sanitizeString(goalData.category, 50) || "custom",
      totalTarget: sanitizeNumber(goalData.totalTarget, 1, 10000, 10),
      unit: sanitizeString(goalData.unit, 30) || "sessions",
      durationDays: sanitizeNumber(goalData.durationDays, 1, 3650, 30),
      startDate: isValidDateStr(goalData.startDate) ? goalData.startDate : new Date().toISOString().split("T")[0],
      endDate: isValidDateStr(goalData.endDate) ? goalData.endDate : null,
      dailyTarget: sanitizeNumber(goalData.dailyTarget, 1, 1000, 1),
      priority: sanitizeEnum(goalData.priority?.toLowerCase(), ["high", "medium", "low"], "medium"),
      autoAddDaily: goalData.autoAddDaily !== false,
      status: "active",
      totalProgress: 0,
      lastGeneratedDate: null,
      notes: sanitizeString(goalData.notes, 500) || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    return handleError(err, "create goal");
  }
}

export async function getGoals(uid) {
  try {
    const q = query(collection(db, "personalGoals"), where("userId", "==", uid));
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return data.sort((a, b) => {
      const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tB - tA;
    });
  } catch (err) {
    return handleError(err, "load goals");
  }
}

export async function updateGoal(id, data) {
  try {
    await updateDoc(doc(db, "personalGoals", id), { ...data, updatedAt: serverTimestamp() });
  } catch (err) {
    handleError(err, "update goal");
  }
}

export async function getGoal(id) {
  try {
    const snap = await getDoc(doc(db, "personalGoals", id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    return handleError(err, "load goal");
  }
}

export async function deleteGoal(id) {
  try {
    await deleteDoc(doc(db, "personalGoals", id));
  } catch (err) {
    handleError(err, "delete goal");
  }
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

export async function getGoalTask(id) {
  try {
    const snap = await getDoc(doc(db, "goalTasks", id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    return handleError(err, "load goal task");
  }
}

export async function updateGoalTask(id, data) {
  await updateDoc(doc(db, "goalTasks", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteGoalTask(id) {
  await deleteDoc(doc(db, "goalTasks", id));
}

// ─────────────────────────────────────────────────────────────
//  REAL-TIME SUBSCRIPTIONS (onSnapshot)
// ─────────────────────────────────────────────────────────────

/**
 * Subscribe to real-time task updates for a user.
 * @param {string} uid - User ID
 * @param {(tasks: Array) => void} callback - Called with latest tasks array
 * @returns {() => void} unsubscribe function
 */
export function subscribeToTasks(uid, callback) {
  const q = query(collection(db, "tasks"), where("userId", "==", uid));
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(tasks);
  }, (err) => {
    // Silently ignore if offline — Firestore will use cache
    if (connectivity.isOnline) {
      console.error("[DB] Task subscription error:", err);
    }
  });
}

/**
 * Subscribe to real-time subject/topic updates for a user.
 * @param {string} uid - User ID
 * @param {(subjects: Array) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function subscribeToSubjects(uid, callback) {
  const q = query(collection(db, "subjects"), where("userId", "==", uid));
  return onSnapshot(q, (snapshot) => {
    const subjects = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(subjects);
  }, (err) => {
    if (connectivity.isOnline) {
      console.error("[DB] Subject subscription error:", err);
    }
  });
}

/**
 * Subscribe to real-time schedule block updates for a user.
 * @param {string} uid - User ID
 * @param {(blocks: Array) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function subscribeToSchedule(uid, callback) {
  const q = query(collection(db, "scheduleBlocks"), where("userId", "==", uid));
  return onSnapshot(q, (snapshot) => {
    const blocks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(blocks);
  }, (err) => {
    if (connectivity.isOnline) {
      console.error("[DB] Schedule subscription error:", err);
    }
  });
}

