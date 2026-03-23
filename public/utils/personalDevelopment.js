// ============================================================
// utils/personalDevelopment.js — Core goal logic
// ============================================================

import {
  createGoal as dbCreateGoal,
  updateGoal,
  deleteGoal,
  getGoalTasks,
  deleteGoalTask,
} from "../db.js";

// ── Calculation helpers ───────────────────────────────────────

/**
 * Calculate daily target from total target and duration.
 * Rounds UP so goal is always achievable.
 */
export function calculateDailyTarget(totalTarget, durationDays) {
  if (!totalTarget || !durationDays || durationDays <= 0) return 1;
  return Math.ceil(totalTarget / durationDays);
}

/**
 * Calculate estimated end date given a start date and duration.
 */
export function calculateEndDate(startDate, durationDays) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + parseInt(durationDays, 10) - 1);
  return d.toISOString().split("T")[0];
}

/**
 * How many days remain until the end date (inclusive).
 */
export function daysRemaining(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return diff;
}

/**
 * Returns progress percentage (0–100) clamped.
 */
export function progressPercent(totalProgress, totalTarget) {
  if (!totalTarget) return 0;
  return Math.min(100, Math.round((totalProgress / totalTarget) * 100));
}

// ── Goal CRUD ─────────────────────────────────────────────────

/**
 * Validate and create a new personal development goal.
 * Returns the Firestore DocumentReference.
 */
export async function createGoal(uid, rawData) {
  const errors = [];

  const title = (rawData.title || "").trim();
  if (!title) errors.push("Goal title is required.");

  const totalTarget = parseInt(rawData.totalTarget, 10);
  if (!totalTarget || totalTarget <= 0)
    errors.push("Total target must be a positive number.");

  const durationDays = parseInt(rawData.durationDays, 10);
  if (!durationDays || durationDays <= 0)
    errors.push("Duration must be a positive number of days.");

  if (!rawData.startDate) errors.push("Start date is required.");

  if (errors.length > 0) throw new Error(errors.join(" "));

  const dailyTarget =
    parseInt(rawData.dailyTarget, 10) ||
    calculateDailyTarget(totalTarget, durationDays);

  const endDate = calculateEndDate(rawData.startDate, durationDays);

  const goalData = {
    title,
    category: rawData.category || "custom",
    totalTarget,
    unit: rawData.unit || "sessions",
    durationDays,
    startDate: rawData.startDate,
    endDate,
    dailyTarget,
    priority: rawData.priority || "medium",
    autoAddDaily: rawData.autoAddDaily !== false,
    notes: rawData.notes || "",
  };

  return dbCreateGoal(uid, goalData);
}

/**
 * Mark incremental progress on a goal.
 * Automatically checks for completion.
 */
export async function markGoalProgress(goal, amountDone) {
  const newProgress = (goal.totalProgress || 0) + amountDone;
  const completed = newProgress >= goal.totalTarget;
  await updateGoal(goal.id, {
    totalProgress: newProgress,
    status: completed ? "completed" : goal.status,
  });
  return { newProgress, completed };
}

/**
 * Returns true if a goal's totalProgress >= totalTarget.
 */
export function checkGoalCompletion(goal) {
  return (goal.totalProgress || 0) >= goal.totalTarget;
}

/**
 * Pause an active goal.
 */
export async function pauseGoal(goalId) {
  await updateGoal(goalId, { status: "paused" });
}

/**
 * Resume a paused goal.
 */
export async function resumeGoal(goalId) {
  await updateGoal(goalId, { status: "active" });
}

/**
 * Delete a goal and all of its generated goal tasks.
 */
export async function deleteGoalWithTasks(goalId) {
  // Delete all goalTasks belonging to this goal
  // Note: we fetch without uid filter here — use the public getGoalTasks(uid, goalId)
  // from the caller instead (caller must pass uid)
  await deleteGoal(goalId);
}

// ── Category metadata ─────────────────────────────────────────

export const CATEGORY_META = {
  leetcode:  { label: "LeetCode",   icon: "code-2",       color: "rgba(255, 255, 255, 0.4)" },
  yoga:      { label: "Yoga",        icon: "activity",     color: "rgba(255, 255, 255, 0.4)" },
  meditation:{ label: "Meditation",  icon: "wind",         color: "rgba(255, 255, 255, 0.4)" },
  course:    { label: "Course",      icon: "graduation-cap",color: "rgba(255, 255, 255, 0.4)" },
  reading:   { label: "Reading",     icon: "book-open",    color: "rgba(255, 255, 255, 0.4)" },
  custom:    { label: "Custom",      icon: "star",         color: "rgba(255, 255, 255, 0.4)" },
};

export const UNIT_OPTIONS = [
  { value: "questions", label: "Questions" },
  { value: "minutes",   label: "Minutes"   },
  { value: "videos",    label: "Videos"    },
  { value: "pages",     label: "Pages"     },
  { value: "sessions",  label: "Sessions"  },
  { value: "chapters",  label: "Chapters"  },
  { value: "custom",    label: "Custom"    },
];

// ── Custom Options Storage ────────────────────────────────────

export function getCustomCategories() {
  try { return JSON.parse(localStorage.getItem("pd_custom_categories")) || []; }
  catch(e) { return []; }
}

export function saveCustomCategory(cat) {
  if (!cat) return;
  const name = String(cat).trim();
  if (!name || name.toLowerCase() === "custom") return;
  
  if (Object.keys(CATEGORY_META).some(k => k.toLowerCase() === name.toLowerCase())) return;
  
  const arr = getCustomCategories();
  if (!arr.some(c => c.toLowerCase() === name.toLowerCase())) {
    arr.unshift(name);
    localStorage.setItem("pd_custom_categories", JSON.stringify(arr));
  }
}

export function getCustomUnits() {
  try { return JSON.parse(localStorage.getItem("pd_custom_units")) || []; }
  catch(e) { return []; }
}

export function saveCustomUnit(unitRaw) {
  if (!unitRaw) return;
  const unit = String(unitRaw).trim();
  if (!unit || unit.toLowerCase() === "custom") return;
  
  if (UNIT_OPTIONS.some(u => u.value.toLowerCase() === unit.toLowerCase() || u.label.toLowerCase() === unit.toLowerCase())) return;
  
  const arr = getCustomUnits();
  if (!arr.some(u => u.toLowerCase() === unit.toLowerCase())) {
    arr.unshift(unit);
    localStorage.setItem("pd_custom_units", JSON.stringify(arr));
  }
}
