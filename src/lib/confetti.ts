'use client';

import confetti from 'canvas-confetti';

const DONE_CONFETTI_OPTIONS: Parameters<typeof confetti>[0] = {
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 },
};

export function fireDoneConfetti() {
  if (typeof window === 'undefined') return;

  try {
    void confetti(DONE_CONFETTI_OPTIONS);
  } catch (error) {
    // Confetti is decorative, so we intentionally avoid surfacing runtime errors.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fire confetti', error);
    }
  }
}
