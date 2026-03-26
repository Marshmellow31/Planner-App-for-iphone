// ============================================================
// analytics.js — Weekly progress & stats calculations
// ============================================================

import { getTasks } from "./db.js";
import { chunkProcess } from "./js/utils.js";

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

// ── Cache for analytics ───────────────────────────────────────────────────────
const analyticsCache = {
  uid: null,
  taskCount: 0,
  timestamp: 0,
  data: null
};

// ── Compute all analytics stats ───────────────────────────────────────────────
export async function computeAnalytics(uid, weekStartDay = "monday", topics = []) {
  const allTasks = await getTasks(uid);
  
  // ── Cache Check ──
  const now = new Date();
  if (analyticsCache.uid === uid && 
      analyticsCache.taskCount === allTasks.length && 
      (now.getTime() - analyticsCache.timestamp) < 30000) { // 30s TTL
    return analyticsCache.data;
  }

  console.time("computeAnalytics");
  const { weekStart, weekEnd } = getWeekBounds(weekStartDay);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayFull = new Date(now);
  todayFull.setHours(23, 59, 59, 999);
  const startHeatmap = new Date(todayFull);
  startHeatmap.setDate(todayFull.getDate() - 167);
  startHeatmap.setHours(0, 0, 0, 0);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  if (weekStartDay === "sunday") days.unshift(days.pop());
  const dailyCompleted = new Array(7).fill(0);
  const dailyTotal = new Array(7).fill(0);

  // ── Single-pass aggregation ─────────────────────────────────────────────
  const weekTasks = [];
  const weekCompleted = [];
  const overdue = [];
  const todayTasks = [];
  const taskCountsByDate = {};
  const allDayTotals = new Array(7).fill(0);
  let totalHistoricCompleted = 0;
  const streakDatesSet = new Set();

  // ── Topic counters: { [topicId]: { total, completed } }
  const topicCounters = {};
  topics.forEach(t => { topicCounters[t.id] = { total: 0, completed: 0 }; });

  // ── Chunked aggregation ─────────────────────────────────────────────────
  await chunkProcess(allTasks, (t) => {
    // Logic remains the same, chunkProcess now handles 12ms limit
    const dueDate = t.dueDate ? (t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate)) : null;
    const completedAt = (t.isCompleted && t.completedAt) ? (t.completedAt.toDate ? t.completedAt.toDate() : new Date(t.completedAt)) : null;

    // Week tasks
    const inWeekDue = dueDate && dueDate >= weekStart && dueDate <= weekEnd;
    const inWeekCompleted = completedAt && completedAt >= weekStart && completedAt <= weekEnd;
    if (inWeekDue || inWeekCompleted) {
      weekTasks.push(t);
      if (t.isCompleted) weekCompleted.push(t);

      // Daily breakdown (by due date)
      if (dueDate) {
        const dayIndex = Math.floor((dueDate - weekStart) / 86400000);
        if (dayIndex >= 0 && dayIndex < 7) {
          dailyTotal[dayIndex]++;
          if (t.isCompleted) dailyCompleted[dayIndex]++;
        }
      }

      // Topic counters
      if (t.subjectId && topicCounters[t.subjectId]) {
        topicCounters[t.subjectId].total++;
        if (t.isCompleted) topicCounters[t.subjectId].completed++;
      }
    }

    // Overdue
    if (!t.isCompleted && dueDate && dueDate < now) {
      overdue.push(t);
    }

    // Today's tasks
    if (!t.isCompleted && dueDate && dueDate >= today && dueDate < tomorrow) {
      todayTasks.push(t);
    }

    // Heatmap + insights (completed tasks only)
    if (completedAt) {
      // Heatmap bucket
      if (completedAt >= startHeatmap && completedAt <= todayFull) {
        const key = `${completedAt.getFullYear()}-${String(completedAt.getMonth() + 1).padStart(2, '0')}-${String(completedAt.getDate()).padStart(2, '0')}`;
        taskCountsByDate[key] = (taskCountsByDate[key] || 0) + 1;
      }
      // Insights: day-of-week distribution
      allDayTotals[completedAt.getDay()]++;
      totalHistoricCompleted++;
      // Streak dates
      streakDatesSet.add(`${completedAt.getFullYear()}-${completedAt.getMonth()}-${completedAt.getDate()}`);
    }
  }, 20); 

  const total = weekTasks.length;
  const completionRate = total > 0 ? Math.round((weekCompleted.length / total) * 100) : 0;

  // Study time from week's completed tasks
  let studyTime = 0;
  weekCompleted.forEach(t => { studyTime += (t.estimatedTime || 0); });

  // ── Topic breakdown ─────────────────────────────────────────────────────
  const topicBreakdown = topics.map(sub => ({
    id: sub.id,
    name: sub.name,
    color: sub.color,
    total: topicCounters[sub.id].total,
    completed: topicCounters[sub.id].completed,
    rate: topicCounters[sub.id].total > 0 ? Math.round((topicCounters[sub.id].completed / topicCounters[sub.id].total) * 100) : 0,
  }));

  // ── Streak (O(n) with Set) ──────────────────────────────────────────────
  const streak = computeStreak(streakDatesSet);

  // ── Heatmap grid (reuse single Date cursor) ─────────────────────────────
  const heatmapData = [];
  const cursor = new Date(startHeatmap);
  for (let i = 0; i < 168; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    heatmapData.push({ date: key, count: taskCountsByDate[key] || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // ── Insights ─────────────────────────────────────────────────────────────
  const insights = [];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (totalHistoricCompleted > 0) {
    const maxDayIdx = allDayTotals.indexOf(Math.max(...allDayTotals));
    if (allDayTotals[maxDayIdx] > 0) {
      insights.push(`You are historically most productive on ${dayNames[maxDayIdx]}s.`);
    }
  }

  if (overdue.length > 3) {
    insights.push(`You have ${overdue.length} overdue tasks heavily impacting your system velocity.`);
  } else if (overdue.length === 0 && weekCompleted.length > 5) {
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

  const result = {
    weekStart,
    weekEnd,
    total,
    completed: weekCompleted.length,
    completionRate,
    pending: total - weekCompleted.length,
    overdue: overdue.length,
    overdueList: overdue,
    dailyLabels: days,
    dailyCompleted,
    dailyTotal,
    topicBreakdown,
    streak,
    todayTasks,
    allTasks,
    studyTime,
    heatmapData,
    insights
  };

  // ── Update Cache ──
  analyticsCache.uid = uid;
  analyticsCache.taskCount = allTasks.length;
  analyticsCache.timestamp = Date.now();
  analyticsCache.data = result;

  console.timeEnd("computeAnalytics");
  return result;
}

// ── Compute daily streak (O(n) with Set) ─────────────────────────────────────
function computeStreak(dateSet) {
  if (dateSet.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (dateSet.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ── Removed Chart.js builders per UI refactor constraint ──────────────────
