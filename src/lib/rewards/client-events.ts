const BADGE_OVERLAY_REFRESH_EVENT = 'rewards:badge-check';

export function requestBadgeOverlayRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BADGE_OVERLAY_REFRESH_EVENT));
}

export function subscribeToBadgeOverlayRefresh(handler: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const listener = () => handler();
  window.addEventListener(BADGE_OVERLAY_REFRESH_EVENT, listener);
  return () => window.removeEventListener(BADGE_OVERLAY_REFRESH_EVENT, listener);
}
