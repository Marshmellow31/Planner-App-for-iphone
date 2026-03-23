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

  // ── Study Time ───────────────────────────────────────────────────────────
  let studyTime = 0;
  completed.forEach(t => { studyTime += (t.estimatedTime || 0); });

  // ── Heatmap Data (Last 84 days) ──────────────────────────────────────────
  const heatmapData = [];
  const todayFull = new Date();
  todayFull.setHours(23,59,59,999);
  const startHeatmap = new Date(todayFull);
  startHeatmap.setDate(todayFull.getDate() - 83); // 12 weeks * 7 days = 84 days
  startHeatmap.setHours(0,0,0,0);

  const taskCountsByDate = {};
  allTasks.forEach(t => {
    if (t.isCompleted && t.completedAt) {
      const d = t.completedAt.toDate ? t.completedAt.toDate() : new Date(t.completedAt);
      if (d >= startHeatmap && d <= todayFull) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        taskCountsByDate[key] = (taskCountsByDate[key] || 0) + 1;
      }
    }
  });

  for (let i = 0; i < 84; i++) {
    const d = new Date(startHeatmap);
    d.setDate(startHeatmap.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    heatmapData.push({ date: key, count: taskCountsByDate[key] || 0 });
  }

  // ── Insights Generation ──────────────────────────────────────────────────
  const insights = [];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const allDayTotals = new Array(7).fill(0);
  let totalHistoricCompleted = 0;
  allTasks.forEach(t => {
    if (t.isCompleted && t.completedAt) {
      const d = t.completedAt.toDate ? t.completedAt.toDate() : new Date(t.completedAt);
      allDayTotals[d.getDay()]++;
      totalHistoricCompleted++;
    }
  });
  
  if (totalHistoricCompleted > 0) {
    const maxDayIdx = allDayTotals.indexOf(Math.max(...allDayTotals));
    if (allDayTotals[maxDayIdx] > 0) {
      insights.push(`You are historically most productive on ${dayNames[maxDayIdx]}s.`);
    }
  }

  if (overdue.length > 3) {
    insights.push(`You have ${overdue.length} overdue tasks heavily impacting your system velocity.`);
  } else if (overdue.length === 0 && completed.length > 5) {
    insights.push(`Zero overdue tasks! Your execution pipeline is running optimally.`);
  }

  if (studyTime > 0) {
    const hrs = Math.floor(studyTime / 60);
    const mins = studyTime % 60;
    insights.push(`You have logged ${hrs > 0 ? hrs + 'h ' : ''}${mins}m of deep focus this week.`);
  }

  if (completionRate < 50 && total > 5) {
    insights.push(`Your completion rate dropped below 50%. Consider reducing your active scope.`);
  } else if (completionRate > 80 && total > 5) {
    insights.push(`High output detected. You've completed over 80% of your planned load.`);
  }

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
    studyTime,
    heatmapData,
    insights
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

// ── Removed Chart.js builders per UI refactor constraint ──────────────────
