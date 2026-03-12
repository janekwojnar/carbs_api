import { NextResponse } from 'next/server';

import { trackServerEvent } from '@/lib/analytics/events';
import { PRICE_MATRIX } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getRequestIp } from '@/lib/security/request';
import { stripe } from '@/lib/payments/stripe';

export async function POST(request: Request) {
  const ip = getRequestIp();
  if (!checkRateLimit(`stripe-session:${ip}`).ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = (await request.json()) as { candleId: string; currency?: string };

  const candle = await prisma.candle.findUnique({ where: { id: body.candleId } });
  if (!candle) return NextResponse.json({ error: 'Candle not found' }, { status: 404 });

  const amount = PRICE_MATRIX[candle.durationDays];

  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: (body.currency || 'pln').toLowerCase(),
          unit_amount: amount,
          product_data: {
            name: `Virtual candle (${candle.durationDays} days)`
          }
        },
        quantity: 1
      }
    ],
    success_url: `${process.env.APP_URL}/candle/${candle.slug}?payment=success`,
    cancel_url: `${process.env.APP_URL}/candle/${candle.slug}?payment=cancelled`,
    metadata: {
      candleId: candle.id
    }
  });

  await prisma.payment.create({
    data: {
      candleId: candle.id,
      gateway: 'stripe',
      amount,
      currency: (body.currency || 'PLN').toUpperCase(),
      stripeSessionId: session.id
    }
  });

  trackServerEvent('checkout_started', {
    gateway: 'stripe',
    candleId: candle.id,
    amount
  });

  return NextResponse.json({ url: session.url });
}
