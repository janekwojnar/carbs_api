import { randomUUID } from 'crypto';

export function shortId(length = 6) {
  return randomUUID().replace(/-/g, '').slice(0, length);
}
