import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { trackServerEvent } from '@/lib/analytics/events';
import { computeActiveWindow } from '@/lib/candle/lifecycle';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/payments/stripe';

export async function POST(request: Request) {
  const sig = headers().get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const rawBody = await request.text();

  let event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const candleId = session.metadata?.candleId;

    if (candleId && session.id) {
      const candle = await prisma.candle.findUnique({ where: { id: candleId } });

      if (candle) {
        const { startTime, endTime } = computeActiveWindow(candle.durationDays);

        await prisma.$transaction([
          prisma.payment.updateMany({
            where: { stripeSessionId: session.id },
            data: { status: 'paid' }
          }),
          prisma.candle.update({
            where: { id: candle.id },
            data: {
              paymentStatus: 'paid',
              startTime,
              endTime
            }
          })
        ]);

        trackServerEvent('payment_confirmed', {
          gateway: 'stripe',
          candleId: candle.id
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
