export function fireDoneConfetti() {
  import('canvas-confetti').then(({ default: confetti }) => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  });
}
