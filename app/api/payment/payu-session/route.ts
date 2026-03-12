import { NextResponse } from 'next/server';

import { trackServerEvent } from '@/lib/analytics/events';
import { PRICE_MATRIX } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { createPayuOrder } from '@/lib/payments/payu';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getRequestIp } from '@/lib/security/request';

export async function POST(request: Request) {
  const ip = getRequestIp();
  if (!checkRateLimit(`payu-session:${ip}`).ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = (await request.json()) as { candleId: string; currency?: string; email?: string };

  const candle = await prisma.candle.findUnique({ where: { id: body.candleId } });
  if (!candle) return NextResponse.json({ error: 'Candle not found' }, { status: 404 });

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
    continueUrl: `${process.env.APP_URL}/candle/${candle.slug}?payment=processing`
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { payuTransactionId: order.orderId }
  });

  trackServerEvent('checkout_started', {
    gateway: 'payu',
    candleId: candle.id,
    amount
  });

  return NextResponse.json({ url: order.redirectUri });
}
