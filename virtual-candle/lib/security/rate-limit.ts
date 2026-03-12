const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

type Entry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Entry>();

export function checkRateLimit(key: string) {
  const now = Date.now();
  const item = store.get(key);

  if (!item || item.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: MAX_REQUESTS - 1 };
  }

  if (item.count >= MAX_REQUESTS) {
    return { ok: false, remaining: 0 };
  }

  item.count += 1;
  store.set(key, item);

  return { ok: true, remaining: MAX_REQUESTS - item.count };
}
