import { NextResponse } from 'next/server';

import { trackServerEvent } from '@/lib/analytics/events';
import { PRICE_MATRIX } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { createPayuOrder } from '@/lib/payments/payu';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getRequestIp } from '@/lib/security/request';
import { getEnv } from '@/lib/env';

export async function POST(request: Request) {
  try {
    const env = getEnv();
    const ip = getRequestIp();
    if (!checkRateLimit(`payu-session:${ip}`).ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = (await request.json()) as { candleId?: string; currency?: string; email?: string };
    if (!body.candleId) {
      return NextResponse.json({ error: 'Missing candleId' }, { status: 400 });
    }

    const candle = await prisma.candle.findUnique({ where: { id: body.candleId } });
    if (!candle) return NextResponse.json({ error: 'Candle not found' }, { status: 404 });
    if (candle.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'Candle is already paid' }, { status: 409 });
    }

    const existingPending = await prisma.payment.findFirst({
      where: {
        candleId: candle.id,
        gateway: 'payu',
        status: 'pending',
        payuTransactionId: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingPending?.payuTransactionId) {
      return NextResponse.json(
        {
          error: 'Pending PayU payment already exists for this candle',
          paymentId: existingPending.id
        },
        { status: 409 }
      );
    }

    const amount = PRICE_MATRIX[candle.durationDays];

    const payment = await prisma.payment.create({
      data: {
        candleId: candle.id,
        gateway: 'payu',
        amount,
        currency: (body.currency || 'PLN').toUpperCase()
      }
    });

    const order = await createPayuOrder({
      amount,
      currency: (body.currency || 'PLN').toUpperCase(),
      description: `Virtual candle (${candle.durationDays} days)`,
      extOrderId: payment.id,
      buyerEmail: body.email,
      continueUrl: `${env.APP_URL}/candle/${candle.slug}?payment=processing`,
      customerIp: ip
    });

    if (!order.redirectUri || !order.orderId) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' }
      });
      return NextResponse.json({ error: 'Unable to initialize PayU payment' }, { status: 502 });
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { payuTransactionId: order.orderId }
    });

    trackServerEvent('checkout_started', {
      gateway: 'payu',
      candleId: candle.id,
      amount
    });

    return NextResponse.json({ url: order.redirectUri, paymentId: payment.id });
  } catch {
    return NextResponse.json({ error: 'Unable to create PayU checkout session' }, { status: 500 });
  }
}
