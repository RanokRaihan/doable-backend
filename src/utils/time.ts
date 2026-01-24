export function getTimeRemaining(date: Date): {
  minutes: number;
  seconds: number;
} {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) {
    return { minutes: 0, seconds: 0 };
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;

  return { minutes, seconds };
}
