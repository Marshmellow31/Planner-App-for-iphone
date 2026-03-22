// ============================================================
// snackbar.js — Material-style snackbar/toast notification system
// ============================================================

let activeSnackbar = null;
let snackbarTimeout = null;

/**
 * Show a Material-style snackbar notification
 * @param {string} message - The message to display
 * @param {'success'|'error'|'info'|'warning'} type - Snackbar type
 * @param {number} duration - Auto-dismiss duration in ms (default 3000)
 */
export function showSnackbar(message, type = 'info', duration = 3000) {
  // Remove existing snackbar
  if (activeSnackbar) {
    activeSnackbar.remove();
    clearTimeout(snackbarTimeout);
  }

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  const snackbar = document.createElement('div');
  snackbar.className = `snackbar snackbar-${type}`;
  snackbar.innerHTML = `
    <span class="snackbar-icon">${icons[type] || icons.info}</span>
    <span class="snackbar-message">${message}</span>
    <button class="snackbar-dismiss" aria-label="Dismiss">✕</button>
  `;

  snackbar.querySelector('.snackbar-dismiss').addEventListener('click', () => {
    snackbar.classList.add('snackbar-exit');
    setTimeout(() => snackbar.remove(), 250);
    activeSnackbar = null;
  });

  document.body.appendChild(snackbar);
  if (window.lucide) window.lucide.createIcons();
  activeSnackbar = snackbar;

  // Trigger entrance animation
  requestAnimationFrame(() => snackbar.classList.add('snackbar-enter'));

  // Auto-dismiss
  snackbarTimeout = setTimeout(() => {
    if (snackbar.isConnected) {
      snackbar.classList.add('snackbar-exit');
      setTimeout(() => snackbar.remove(), 250);
      activeSnackbar = null;
    }
  }, duration);
}

/**
 * Show a styled confirmation dialog (replaces native confirm())
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {string} confirmText - Confirm button text
 * @param {boolean} danger - If true, confirm button is red
 * @returns {Promise<boolean>}
 */
export function showConfirmDialog(title, message, confirmText = 'Confirm', danger = false) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop centered';
    backdrop.innerHTML = `
      <div class="modal-box confirm-dialog" style="max-width:360px">
        <div class="confirm-dialog-icon" style="color:${danger ? 'var(--error)' : 'var(--accent)'}">
          <i data-lucide="${danger ? 'alert-triangle' : 'help-circle'}" style="width:48px;height:48px"></i>
        </div>
        <h3 class="confirm-dialog-title">${title}</h3>
        <p class="confirm-dialog-message">${message}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${confirmText}</button>
        </div>
      </div>
    `;

    const close = (result) => {
      backdrop.classList.add('modal-exit');
      setTimeout(() => backdrop.remove(), 200);
      resolve(result);
    };

    backdrop.querySelector('#confirm-cancel').addEventListener('click', () => close(false));
    backdrop.querySelector('#confirm-ok').addEventListener('click', () => close(true));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(false); });

    document.body.appendChild(backdrop);
    if (window.lucide) window.lucide.createIcons();
  });
}
