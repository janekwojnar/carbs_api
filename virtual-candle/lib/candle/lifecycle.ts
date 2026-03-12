export function computeActiveWindow(durationDays: number, now = new Date()) {
  const startTime = now;
  const endTime = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  return { startTime, endTime };
}
