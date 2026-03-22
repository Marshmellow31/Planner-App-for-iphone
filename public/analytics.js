// ============================================================
// analytics.js — Weekly progress & stats calculations
// ============================================================

import { getTasks } from "./db.js";

// ── Get week boundaries ───────────────────────────────────────────────────────
export function getWeekBounds(weekStartDay = "monday") {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const startOffset = weekStartDay === "sunday" ? 0 : 1;
  const daysFromStart = (day - startOffset + 7) % 7;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromStart);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

// ── Check if a timestamp falls within a date range ───────────────────────────
function inRange(ts, start, end) {
  if (!ts) return false;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d >= start && d <= end;
}

// ── Compute all analytics stats ───────────────────────────────────────────────
export async function computeAnalytics(uid, weekStartDay = "monday", subjects = []) {
  const [allTasks] = await Promise.all([getTasks(uid)]);
  const { weekStart, weekEnd } = getWeekBounds(weekStartDay);

  // Filter tasks that have a dueDate or completedAt in this week
  const weekTasks = allTasks.filter(
    (t) => inRange(t.dueDate, weekStart, weekEnd) || inRange(t.completedAt, weekStart, weekEnd)
  );

  const completed = weekTasks.filter((t) => t.isCompleted);
  const total = weekTasks.length;
  const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  // ── Daily breakdown ───────────────────────────────────────────────────────
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  if (weekStartDay === "sunday") {
    days.unshift(days.pop());
  }
  const dailyCompleted = new Array(7).fill(0);
  const dailyTotal = new Array(7).fill(0);

  weekTasks.forEach((t) => {
    const refDate = t.dueDate
      ? t.dueDate.toDate
        ? t.dueDate.toDate()
        : new Date(t.dueDate)
      : null;
    if (!refDate) return;
    const dayIndex = Math.floor((refDate - weekStart) / (1000 * 60 * 60 * 24));
    if (dayIndex >= 0 && dayIndex < 7) {
      dailyTotal[dayIndex]++;
      if (t.isCompleted) dailyCompleted[dayIndex]++;
    }
  });

  // ── Subject-wise breakdown ────────────────────────────────────────────────
  const subjectBreakdown = subjects.map((sub) => {
    const subTasks = weekTasks.filter((t) => t.subjectId === sub.id);
    const subCompleted = subTasks.filter((t) => t.isCompleted).length;
    return {
      id: sub.id,
      name: sub.name,
      color: sub.color,
      total: subTasks.length,
      completed: subCompleted,
      rate: subTasks.length > 0 ? Math.round((subCompleted / subTasks.length) * 100) : 0,
    };
  });

  // ── Overdue tasks ─────────────────────────────────────────────────────────
  const now = new Date();
  const overdue = allTasks.filter((t) => {
    if (t.isCompleted) return false;
    if (!t.dueDate) return false;
    const due = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
    return due < now;
  });

  // ── Streak ────────────────────────────────────────────────────────────────
  const streak = computeStreak(allTasks);

  // ── Today's tasks ─────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayTasks = allTasks.filter((t) => {
    if (t.isCompleted) return false;
    if (!t.dueDate) return false;
    const due = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
    return due >= today && due < tomorrow;
  });

  return {
    weekStart,
    weekEnd,
    total,
    completed: completed.length,
    completionRate,
    pending: total - completed.length,
    overdue: overdue.length,
    overdueList: overdue,
    dailyLabels: days,
    dailyCompleted,
    dailyTotal,
    subjectBreakdown,
    streak,
    todayTasks,
    allTasks,
  };
}

// ── Compute daily streak ──────────────────────────────────────────────────────
function computeStreak(tasks) {
  const completedDates = tasks
    .filter((t) => t.isCompleted && t.completedAt)
    .map((t) => {
      const d = t.completedAt.toDate ? t.completedAt.toDate() : new Date(t.completedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      return key;
    });

  const uniqueDays = [...new Set(completedDates)].sort().reverse();
  if (uniqueDays.length === 0) return 0;

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (uniqueDays.includes(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ── Chart data builders ───────────────────────────────────────────────────────
export function buildDailyChart(stats) {
  return {
    labels: stats.dailyLabels,
    datasets: [
      {
        label: "Completed",
        data: stats.dailyCompleted,
        backgroundColor: "rgba(108, 99, 255, 0.8)",
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: "Total",
        data: stats.dailyTotal,
        backgroundColor: "rgba(108, 99, 255, 0.2)",
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };
}

export function buildSubjectDoughnut(stats) {
  const labels = stats.subjectBreakdown.map((s) => s.name);
  const data = stats.subjectBreakdown.map((s) => s.completed || 0.001); // avoid 0
  const colors = stats.subjectBreakdown.map((s) => s.color);

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors,
        borderColor: "rgba(15, 15, 26, 0.5)",
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };
}

export function buildWeeklyLine(stats) {
  return {
    labels: stats.dailyLabels,
    datasets: [
      {
        label: "Tasks Completed",
        data: stats.dailyCompleted,
        borderColor: "#6c63ff",
        backgroundColor: "rgba(108, 99, 255, 0.15)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#6c63ff",
        pointRadius: 5,
        pointHoverRadius: 8,
      },
    ],
  };
}
