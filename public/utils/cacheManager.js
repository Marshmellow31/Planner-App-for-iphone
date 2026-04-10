/**
 * cacheManager.js — SWR Caching System for PWA
 * 
 * v2.0 — Revision-based change detection (no more JSON.stringify comparisons)
 * Handles in-memory and localStorage persistence for tab data.
 */

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.prefix = "swr_cache_";
    this.version = "2.0";
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    this._changeListeners = new Map(); // key -> Set<callback>
    this._revisionCounter = 0;
    
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
      if (entry.version === this.version) {
        return entry.data;
      }
    }

    // 2. Check LocalStorage
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (raw) {
        const entry = JSON.parse(raw);
        if (entry.version === this.version) {
          this.memoryCache.set(key, entry);
          return entry.data;
        } else {
          localStorage.removeItem(this.prefix + key);
        }
      }
    } catch (e) {
      console.warn(`[Cache] Storage read failed for ${key}`, e);
    }

    return null;
  }

  /**
   * Set data into cache. Returns the new revision number.
   * @param {string} key 
   * @param {any} data 
   * @returns {number} revision
   */
  set(key, data) {
    this._revisionCounter++;
    const entry = {
      data,
      timestamp: Date.now(),
      version: this.version,
      revision: this._revisionCounter
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
        // Retry once
        try {
          localStorage.setItem(this.prefix + key, JSON.stringify(entry));
        } catch (_) {}
      }
    }

    // 3. Notify change listeners
    this._notifyChange(key, data);

    return this._revisionCounter;
  }

  /**
   * Get the revision number of a cache entry.
   * Use this for cheap change detection instead of JSON.stringify.
   * @param {string} key 
   * @returns {number|null}
   */
  getRevision(key) {
    const entry = this.memoryCache.get(key);
    return entry ? (entry.revision || 0) : null;
  }

  /**
   * Check if cache data has changed by comparing revision numbers.
   * Much cheaper than JSON.stringify comparison.
   * @param {string} key 
   * @param {number} previousRevision 
   * @returns {boolean}
   */
  hasChanged(key, previousRevision) {
    const currentRevision = this.getRevision(key);
    if (currentRevision === null) return true; // No cache = changed
    return currentRevision !== previousRevision;
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
   * Subscribe to changes on a specific cache key.
   * Returns an unsubscribe function.
   * @param {string} key 
   * @param {(data: any) => void} callback 
   * @returns {() => void}
   */
  onChange(key, callback) {
    if (!this._changeListeners.has(key)) {
      this._changeListeners.set(key, new Set());
    }
    this._changeListeners.get(key).add(callback);
    return () => {
      const listeners = this._changeListeners.get(key);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) this._changeListeners.delete(key);
      }
    };
  }

  /**
   * Remove all cache entries starting with a prefix
   * @param {string} prefix 
   */
  invalidatePrefix(prefix) {
    // Clear Memory
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
    // Clear LocalStorage
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix + prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn("[Cache] Prefix invalidation failed", e);
    }
  }

  // ── Internal ──

  _notifyChange(key, data) {
    const listeners = this._changeListeners.get(key);
    if (listeners) {
      listeners.forEach(cb => {
        try { cb(data); } catch (err) {
          console.error(`[Cache] Change listener error for ${key}:`, err);
        }
      });
    }
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
