/**
 * Accessible Modal Manager with Focus Trapping (§13)
 */
let previouslyFocusedElement = null;
let activeModalId = null;

export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  previouslyFocusedElement = document.activeElement;
  activeModalId = modalId;

  modal.classList.remove('hidden');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length > 0) {
    focusable[0].focus();
  }
}

export function closeModal(modalId) {
  const targetId = modalId || activeModalId;
  if (!targetId) return;

  const modal = document.getElementById(targetId);
  if (modal) {
    modal.classList.add('hidden');
  }

  if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
    previouslyFocusedElement.focus();
  }
  previouslyFocusedElement = null;
  activeModalId = null;
}

// Global Escape Key Listener (§13)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeModalId) {
    closeModal(activeModalId);
  }
});
