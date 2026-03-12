export type AnalyticsEvent =
  | 'candle_created'
  | 'checkout_started'
  | 'payment_confirmed'
  | 'share_clicked';

export function trackServerEvent(event: AnalyticsEvent, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[analytics]', event, payload);
  }

  if (process.env.POSTHOG_API_KEY && process.env.POSTHOG_HOST) {
    fetch(`${process.env.POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.POSTHOG_API_KEY,
        event,
        properties: payload
      })
    }).catch(() => undefined);
  }
}
