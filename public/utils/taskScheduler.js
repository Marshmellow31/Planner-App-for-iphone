// ============================================================
// utils/taskScheduler.js
// ============================================================
import { timeToMinutes, minutesToTime, getDurationMinutes } from "./timeUtils.js";

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Greedy algorithm to assign tasks to available study blocks.
 * 
 * @param {Array} tasks - Array of scheduler tasks (id, title, estimatedTime, priority, deadline)
 * @param {Object} weeklySchedule - The manual schedule object `{ Monday: [], Tuesday: [] ... }`
 * @returns {Object} - { scheduled: [], unscheduled: [] }
 */
export function generateStudyPlan(tasks, weeklySchedule) {
  // 1. Sort tasks: Priority first, then Deadline
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  
  const sortedTasks = [...tasks].sort((a, b) => {
    const pwA = priorityWeight[(a.priority || 'medium').toLowerCase()] || 0;
    const pwB = priorityWeight[(b.priority || 'medium').toLowerCase()] || 0;
    
    if (pwA !== pwB) {
      return pwB - pwA; // higher priority first
    }
    
    // Sort by deadline if present
    if (a.deadline && b.deadline) {
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    
    return 0; // maintain original order
  });

  // 2. Extract and format available Study blocks
  // Flatten weekly schedule into an array of blocks, ensuring they are ordered.
  let availableBlocks = [];
  DAYS_ORDER.forEach(day => {
    const dayBlocks = weeklySchedule[day] || [];
    dayBlocks.forEach(block => {
      // Only allocate in study slots
      if (!block.type || block.type === "Study") {
        availableBlocks.push({
          id: block.id,
          day: day,
          title: block.title || "Study Block",
          startTimeMin: timeToMinutes(block.start_time),
          endTimeMin: timeToMinutes(block.end_time),
          durationMin: getDurationMinutes(block.start_time, block.end_time),
          usedMin: 0
        });
      }
    });
  });

  // Sort blocks chronologically within each day? They already should be from the loop above,
  // but let's ensure they are sorted by start time per day.
  // Actually, we process blocks day by day, block by block.
  
  const scheduledTasks = [];
  const unscheduledTasks = [];

  // 3. Greedy Assignment
  // For each task, find the earliest block that has enough time. If a block is too small,
  // we can split the task across multiple blocks.
  for (let task of sortedTasks) {
    let remainingTime = task.estimatedTime;
    let allocations = [];

    // Find available slots for this task
    for (let block of availableBlocks) {
      if (remainingTime <= 0) break;

      const availableTime = block.durationMin - block.usedMin;
      if (availableTime <= 0) continue;

      const timeToUse = Math.min(remainingTime, availableTime);
      
      const allocStartMin = block.startTimeMin + block.usedMin;
      const allocEndMin = allocStartMin + timeToUse;
      
      allocations.push({
        blockId: block.id,
        day: block.day,
        startTime: minutesToTime(allocStartMin),
        endTime: minutesToTime(allocEndMin),
        timeSpent: timeToUse,
        blockTitle: block.title
      });

      block.usedMin += timeToUse;
      remainingTime -= timeToUse;
    }

    if (remainingTime > 0) {
      // Could not fully schedule this task
      unscheduledTasks.push({
        ...task,
        reason: "Not enough study time available",
        remainingTimeUnscheduled: remainingTime
      });
    } else {
      scheduledTasks.push({
        task: task,
        allocations: allocations
      });
    }
  }

  // Group scheduled tasks by DAY -> BLOCK -> TASK for easy UI rendering
  const planByDay = {};
  DAYS_ORDER.forEach(day => planByDay[day] = []);

  scheduledTasks.forEach(st => {
    st.allocations.forEach(alloc => {
      planByDay[alloc.day].push({
        taskId: st.task.id,
        taskTitle: st.task.title,
        priority: st.task.priority || 'Medium',
        startTime: alloc.startTime,
        endTime: alloc.endTime,
        timeSpent: alloc.timeSpent,
        blockTitle: alloc.blockTitle
      });
    });
  });
  
  // Sort plan arrays by start time
  Object.keys(planByDay).forEach(day => {
    planByDay[day].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  });

  return { planByDay, unscheduledTasks, allBlocks: availableBlocks };
}
