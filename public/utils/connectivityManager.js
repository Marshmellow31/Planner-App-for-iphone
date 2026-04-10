/**
 * connectivityManager.js — Online/Offline state management
 * 
 * Provides:
 * - Real-time connectivity detection
 * - A non-intrusive status bar indicator
 * - Custom events for app-level reactions
 * - Offline write queue integration point
 */

const OFFLINE_QUEUE_KEY = 'ascend_offline_queue';

class ConnectivityManager {
  constructor() {
    this._isOnline = navigator.onLine;
    this._listeners = new Set();
    this._statusBarEl = null;
    this._offlineQueue = this._loadQueue();

    // Bind event listeners
    window.addEventListener('online', () => this._handleChange(true));
    window.addEventListener('offline', () => this._handleChange(false));

    // Initial UI setup (deferred to after DOM ready)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._createStatusBar());
    } else {
      this._createStatusBar();
    }
  }

  get isOnline() {
    return this._isOnline;
  }

  /**
   * Subscribe to connectivity changes
   * @param {(isOnline: boolean) => void} callback
   * @returns {() => void} unsubscribe function
   */
  onChange(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  /**
   * Queue an operation to be retried when back online
   * @param {{ type: string, collection: string, data: any }} operation
   */
  queueOfflineWrite(operation) {
    this._offlineQueue.push({
      ...operation,
      timestamp: Date.now(),
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    });
    this._saveQueue();
    console.log(`[Connectivity] Queued offline write: ${operation.type} on ${operation.collection}`);
  }

  /**
   * Get all pending offline writes
   */
  getPendingWrites() {
    return [...this._offlineQueue];
  }

  /**
   * Clear a specific operation from the queue after successful sync
   */
  clearOperation(operationId) {
    this._offlineQueue = this._offlineQueue.filter(op => op.id !== operationId);
    this._saveQueue();
  }

  /**
   * Clear all pending operations
   */
  clearAllOperations() {
    this._offlineQueue = [];
    this._saveQueue();
  }

  // ── Internal ──

  _handleChange(isOnline) {
    const wasOffline = !this._isOnline;
    this._isOnline = isOnline;

    console.log(`[Connectivity] ${isOnline ? '🟢 Online' : '🔴 Offline'}`);

    // Update status bar
    this._updateStatusBar(isOnline);

    // Notify listeners
    this._listeners.forEach(cb => {
      try { cb(isOnline); } catch (err) {
        console.error('[Connectivity] Listener error:', err);
      }
    });

    // Dispatch a custom event for global listeners
    window.dispatchEvent(new CustomEvent('connectivity-change', {
      detail: { isOnline, wasOffline, pendingWrites: this._offlineQueue.length }
    }));

    // If coming back online, try to replay the queue
    if (isOnline && wasOffline && this._offlineQueue.length > 0) {
      console.log(`[Connectivity] Back online with ${this._offlineQueue.length} pending writes`);
      window.dispatchEvent(new CustomEvent('replay-offline-queue', {
        detail: { queue: this.getPendingWrites() }
      }));
    }
  }

  _createStatusBar() {
    // Create a subtle status indicator
    const bar = document.createElement('div');
    bar.id = 'connectivity-status';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    bar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      padding: 6px 16px;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      font-family: var(--font-family, "Inter", sans-serif);
      letter-spacing: 0.3px;
      transform: translateY(-100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  background 0.3s ease,
                  color 0.3s ease;
      pointer-events: none;
    `;
    document.body.appendChild(bar);
    this._statusBarEl = bar;

    // Show offline bar immediately if already offline
    if (!this._isOnline) {
      this._updateStatusBar(false);
    }
  }

  _updateStatusBar(isOnline) {
    const bar = this._statusBarEl;
    if (!bar) return;

    if (!isOnline) {
      bar.textContent = '⚡ You\'re offline — changes will sync when connected';
      bar.style.background = 'linear-gradient(135deg, #1e293b, #0f172a)';
      bar.style.color = '#94a3b8';
      bar.style.borderBottom = '1px solid rgba(148, 163, 184, 0.15)';
      bar.style.transform = 'translateY(0)';
      bar.style.pointerEvents = 'auto';
    } else {
      // Brief "Back online" confirmation
      const pendingCount = this._offlineQueue.length;
      bar.textContent = pendingCount > 0
        ? `✓ Back online — syncing ${pendingCount} change${pendingCount > 1 ? 's' : ''}...`
        : '✓ Back online';
      bar.style.background = 'linear-gradient(135deg, #065f46, #064e3b)';
      bar.style.color = '#6ee7b7';
      bar.style.borderBottom = '1px solid rgba(110, 231, 183, 0.2)';
      bar.style.transform = 'translateY(0)';

      // Hide after a brief confirmation
      setTimeout(() => {
        bar.style.transform = 'translateY(-100%)';
      }, 3000);
    }
  }

  _loadQueue() {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _saveQueue() {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this._offlineQueue));
    } catch (err) {
      console.warn('[Connectivity] Failed to save offline queue:', err);
    }
  }
}

// Singleton
export const connectivity = new ConnectivityManager();
