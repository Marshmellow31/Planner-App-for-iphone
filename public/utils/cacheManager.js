/**
 * cacheManager.js — SWR Caching System for PWA
 * Handles in-memory and localStorage persistence for tab data.
 */

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.prefix = "swr_cache_";
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    
    // Clean up expired items from localStorage on init to save space
    this._cleanupLocalStorage();
  }

  /**
   * Get data from cache (Memory -> LocalStorage)
   * @param {string} key 
   * @returns {any|null}
   */
  get(key) {
    // 1. Check Memory
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key);
      console.log(`[Cache] Memory HIT: ${key}`);
      return entry.data;
    }

    // 2. Check LocalStorage
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (raw) {
        const entry = JSON.parse(raw);
        // Persist to memory for next time
        this.memoryCache.set(key, entry);
        console.log(`[Cache] Storage HIT: ${key}`);
        return entry.data;
      }
    } catch (e) {
      console.warn(`[Cache] Storage read failed for ${key}`, e);
    }

    console.log(`[Cache] MISS: ${key}`);
    return null;
  }

  /**
   * Set data into cache
   * @param {string} key 
   * @param {any} data 
   */
  set(key, data) {
    const entry = {
      data,
      timestamp: Date.now(),
      version: "1.0" // Useful for migration if schema changes
    };

    // 1. Set Memory
    this.memoryCache.set(key, entry);

    // 2. Set LocalStorage
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.warn("[Cache] LocalStorage full, clearing old entries...");
        this._cleanupLocalStorage(true); // Force cleanup
      }
      console.warn(`[Cache] Storage write failed for ${key}`, e);
    }
  }

  /**
   * Check if cache entry is still within its TTL
   * @param {string} key 
   * @param {number} ttl (ms)
   * @returns {boolean}
   */
  isValid(key, ttl = this.defaultTTL) {
    const entry = this.memoryCache.get(key);
    if (!entry) return false;
    return (Date.now() - entry.timestamp) < ttl;
  }

  /**
   * Get the timestamp of a cache entry
   * @param {string} key 
   * @returns {number|null}
   */
  getTimestamp(key) {
    const entry = this.memoryCache.get(key);
    return entry ? entry.timestamp : null;
  }

  /**
   * Internal cleanup for localStorage
   * @param {boolean} force - if true, clears everything starting with prefix
   */
  _cleanupLocalStorage(force = false) {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) {
          keys.push(k);
        }
      }

      if (force) {
        keys.forEach(k => localStorage.removeItem(k));
        return;
      }

      // Remove items older than 24 hours
      const oneDay = 24 * 60 * 60 * 1000;
      keys.forEach(k => {
        try {
          const entry = JSON.parse(localStorage.getItem(k));
          if (entry && (Date.now() - entry.timestamp) > oneDay) {
            localStorage.removeItem(k);
          }
        } catch (_) {}
      });
    } catch (e) {
      console.warn("[Cache] Cleanup failed", e);
    }
  }
}

export const cacheManager = new CacheManager();
