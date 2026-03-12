import { NextResponse } from 'next/server';

import { trackServerEvent } from '@/lib/analytics/events';
import { PRICE_MATRIX } from '@/lib/constants';
import { getEnv } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/payments/stripe';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getRequestIp } from '@/lib/security/request';

export async function POST(request: Request) {
  try {
    const env = getEnv();
    const ip = getRequestIp();
    if (!checkRateLimit(`stripe-session:${ip}`).ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = (await request.json()) as { candleId?: string; currency?: string };
    if (!body.candleId) {
      return NextResponse.json({ error: 'Missing candleId' }, { status: 400 });
    }

    const candle = await prisma.candle.findUnique({ where: { id: body.candleId } });
    if (!candle) return NextResponse.json({ error: 'Candle not found' }, { status: 404 });
    if (candle.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'Candle is already paid' }, { status: 409 });
    }

    const pendingPayment = await prisma.payment.findFirst({
      where: {
        candleId: candle.id,
        gateway: 'stripe',
        status: 'pending'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (pendingPayment?.stripeSessionId) {
      try {
        const existingSession = await stripe().checkout.sessions.retrieve(pendingPayment.stripeSessionId);
        if (existingSession.url) {
          return NextResponse.json({ url: existingSession.url, reused: true });
        }
      } catch {
        // If session cannot be reused, create a new one below.
      }
    }

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
      success_url: `${env.APP_URL}/candle/${candle.slug}?payment=success`,
      cancel_url: `${env.APP_URL}/candle/${candle.slug}?payment=cancelled`,
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
  } catch {
    return NextResponse.json({ error: 'Unable to create Stripe checkout session' }, { status: 500 });
  }
}
