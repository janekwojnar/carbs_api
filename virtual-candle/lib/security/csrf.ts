export function isAllowedOrigin(origin: string | null, host: string | null) {
  if (!origin) return true;
  if (!host) return false;

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}
