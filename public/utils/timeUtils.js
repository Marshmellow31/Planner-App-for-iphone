// ============================================================
// utils/timeUtils.js
// ============================================================

/**
 * Returns total minutes since midnight for a HH:MM string.
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Returns HH:MM string for a given minutes since midnight.
 */
export function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Gets the difference in minutes between two HH:MM strings.
 */
export function getDurationMinutes(startStr, endStr) {
  return timeToMinutes(endStr) - timeToMinutes(startStr);
}

/**
 * Validates if the start time is before the end time
 */
export function isValidTimeRange(startStr, endStr) {
  return timeToMinutes(startStr) < timeToMinutes(endStr);
}
