import { computeActiveWindow } from '@/lib/candle/lifecycle';

describe('computeActiveWindow', () => {
  it('computes exact end time for 7 days', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const { startTime, endTime } = computeActiveWindow(7, now);

    expect(startTime.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(endTime.toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });
});
