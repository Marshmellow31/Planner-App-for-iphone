// ============================================================
// utils/dailyGenerator.js — Auto daily task generation
// ============================================================

import { createGoalTask, getGoalTasks, updateGoal } from "../db.js";

// Return today's date as "YYYY-MM-DD"
function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// Return an array of "YYYY-MM-DD" strings between startDate and endDate inclusive
function dateRange(startDate, endDate) {
  const dates = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);
  // Safety cap to avoid runaway loops (max 365 missed days to catch up)
  let limit = 365;
  while (cur <= end && limit-- > 0) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/**
 * Build a goalTask object for a given goal + date.
 * Does NOT persist — just returns the payload.
 */
export function buildDailyTaskPayload(goal, dateStr) {
  const unitLabel = goal.unit || "sessions";
  const amount = goal.dailyTarget;
  const title = `${goal.title} — ${amount} ${unitLabel}`;

  // estimatedTime: if unit is minutes, use dailyTarget directly; otherwise 30 min default
  const estimatedTime =
    goal.unit === "minutes" ? goal.dailyTarget : 30;

  return {
    sourceGoalId: goal.id,
    title,
    type: "personalDevelopment",
    estimatedTime,
    deadline: dateStr,
    priority: goal.priority || "medium",
    date: dateStr,
  };
}

/**
 * Generate a daily task for a single goal on a specific date.
 * Skips if a task already exists for that goal+date (dedup).
 * Returns the created task doc ref or null if skipped.
 */
export async function generateDailyTask(uid, goal, dateStr, existingTasks) {
  // Dedup: check if a goalTask with this sourceGoalId and date already exists
  const alreadyExists = existingTasks.some(
    (t) => t.sourceGoalId === goal.id && t.date === dateStr
  );
  if (alreadyExists) return null;

  const payload = buildDailyTaskPayload(goal, dateStr);
  const ref = await createGoalTask(uid, payload);
  return ref;
}

/**
 * Auto-generate tasks for ALL active goals with autoAddDaily enabled.
 * Catches missed days since lastGeneratedDate.
 * Returns array of newly created task refs.
 */
export async function autoGenerateTodaysTasks(uid, goals) {
  const today = todayStr();
  const created = [];

  // Load all existing goal tasks once (one Firestore read, avoid N reads)
  let existingTasks = [];
  try {
    existingTasks = await getGoalTasks(uid);
  } catch (_) {
    existingTasks = [];
  }

  for (const goal of goals) {
    // Only process active goals with autoAddDaily enabled
    if (goal.status !== "active") continue;
    if (!goal.autoAddDaily) continue;

    // Build the range of dates we need to generate for
    const lastGen = goal.lastGeneratedDate || null;
    const goalStart = goal.startDate || today;
    const goalEnd = goal.endDate || today;

    // Start generating from the day AFTER last generation, or from goal start
    let fromDate;
    if (!lastGen) {
      // First time: start from goal start date (or today if it's in the future)
      fromDate = goalStart > today ? goalStart : (goal.startDate && goal.startDate <= today ? goal.startDate : today);
    } else {
      // Generate from the day after last generated, up to today
      const afterLast = new Date(lastGen);
      afterLast.setDate(afterLast.getDate() + 1);
      fromDate = afterLast.toISOString().split("T")[0];
    }

    // Cap: don't generate past today or goal end date
    const toDate = today < goalEnd ? today : goalEnd;

    if (fromDate > toDate) continue; // nothing to generate

    const dates = dateRange(fromDate, toDate);

    for (const dateStr of dates) {
      try {
        const ref = await generateDailyTask(uid, goal, dateStr, existingTasks);
        if (ref) {
          created.push({ goalId: goal.id, date: dateStr, ref });
          // Add to local set so subsequent iterations in the same call don't dupe
          existingTasks.push({ sourceGoalId: goal.id, date: dateStr });
        }
      } catch (err) {
        console.error("Error generating task for goal", goal.id, dateStr, err);
      }
    }

    // Update lastGeneratedDate on the goal to today
    try {
      await updateGoal(goal.id, { lastGeneratedDate: today });
    } catch (err) {
      console.error("Failed to update lastGeneratedDate for goal", goal.id, err);
    }
  }

  return created;
}
