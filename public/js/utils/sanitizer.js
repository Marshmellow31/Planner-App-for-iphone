/**
 * sanitizer.js — Centralized input cleaning and validation for Ascend
 * 
 * This module ensures all data passing through the UI to the database
 * is safe from script injection (XSS) and maintains data integrity.
 */

/**
 * Strips HTML tags and truncates long strings to prevent XSS and overflow.
 * @param {string} str The raw user input.
 * @param {number} max Maximum allowed characters (typically 100-500).
 * @returns {string} Sanitized string.
 */
export function sanitizeString(val, max = 500) {
  if (typeof val !== 'string') return '';
  
  // Basic HTML tag removal using a simple regex (more reliable than DOM parser for fast iteration)
  // This removes <...>, effectively neutralizing <script>, <img>, etc.
  let cleaned = val.replace(/<\/?[^>]+(>|$)/g, "");

  // Trim whitespace
  cleaned = cleaned.trim();

  // Truncate to max length
  return cleaned.substring(0, max);
}

/**
 * Validates and clamps numbers to safe integer ranges.
 * @param {any} val The input to convert.
 * @param {number} min Minimum allowed.
 * @param {number} max Maximum allowed.
 * @param {number} def Default value if invalid.
 * @returns {number} Sanitized integer.
 */
export function sanitizeNumber(val, min = 0, max = 999999, def = 0) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return def;
  return Math.min(Math.max(n, min), max);
}

/**
 * Enforces a fixed list of allowed string values (Enum pattern).
 * @param {string} val The input string.
 * @param {string[]} allowed List of allowed strings.
 * @param {string} def Default value if not in list.
 * @returns {string} One of the allowed values.
 */
export function sanitizeEnum(val, allowed, def) {
  if (!allowed.includes(val)) return def;
  return val;
}

/**
 * Basic email syntax checker (client-side only, for quick feedback).
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates date-like strings (YYYY-MM-DD or ISO).
 */
export function isValidDateStr(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}
