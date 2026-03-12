'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { candleCreateSchema, type CandleCreateInput } from '@/lib/validation/candle';

type Gateway = 'stripe' | 'payu';

export function LightCandleForm() {
  const router = useRouter();
  const [gateway, setGateway] = useState<Gateway>('stripe');
  const [busy, setBusy] = useState(false);

  const form = useForm<CandleCreateInput>({
    resolver: zodResolver(candleCreateSchema),
    defaultValues: {
      category: 'memorial',
      durationDays: 7,
      currency: 'PLN'
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setBusy(true);

    const createdRes = await fetch('/api/candle/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    });

    const createdData = await createdRes.json();

    if (!createdRes.ok) {
      alert(createdData.error || 'Unable to create candle');
      setBusy(false);
      return;
    }

    const paymentEndpoint = gateway === 'stripe' ? '/api/payment/stripe-session' : '/api/payment/payu-session';
    const paymentRes = await fetch(paymentEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candleId: createdData.candle.id,
        currency: values.currency
      })
    });

    const paymentData = await paymentRes.json();

    if (paymentData.url) {
      window.location.href = paymentData.url;
      return;
    }

    router.push(`/candle/${createdData.candle.slug}`);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-surface/60 p-6">
      <h2 className="font-serifDisplay text-3xl text-amber-100">Light a candle</h2>

      <input {...form.register('name')} placeholder="Name (optional)" className="w-full rounded-lg bg-black/20 p-3" />

      <textarea
        {...form.register('intention')}
        placeholder="Intention"
        className="min-h-24 w-full rounded-lg bg-black/20 p-3"
      />

      <select {...form.register('category')} className="w-full rounded-lg bg-black/20 p-3">
        <option value="memorial">Memorial</option>
        <option value="prayer">Prayer</option>
        <option value="support">Support</option>
        <option value="gratitude">Gratitude</option>
      </select>

      <select {...form.register('durationDays', { valueAsNumber: true })} className="w-full rounded-lg bg-black/20 p-3">
        <option value={1}>1 day - 1 PLN</option>
        <option value={7}>7 days - 5 PLN</option>
        <option value={30}>30 days - 15 PLN</option>
        <option value={365}>365 days - 99 PLN</option>
      </select>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setGateway('stripe')}
          className={`rounded-full px-4 py-2 text-sm ${gateway === 'stripe' ? 'bg-gold text-black' : 'bg-black/30'}`}
        >
          Stripe
        </button>
        <button
          type="button"
          onClick={() => setGateway('payu')}
          className={`rounded-full px-4 py-2 text-sm ${gateway === 'payu' ? 'bg-gold text-black' : 'bg-black/30'}`}
        >
          PayU / BLIK
        </button>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-gold px-6 py-3 font-semibold text-black disabled:opacity-50"
      >
        {busy ? 'Processing...' : 'Continue to payment'}
      </button>
    </form>
  );
}
