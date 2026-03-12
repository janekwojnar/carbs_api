import crypto from 'crypto';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { trackServerEvent } from '@/lib/analytics/events';
import { computeActiveWindow } from '@/lib/candle/lifecycle';
import { prisma } from '@/lib/prisma';

function verifyPayuSignature(body: string, signature?: string | null) {
  if (!process.env.PAYU_WEBHOOK_SECRET) return true;
  if (!signature) return false;

  const hash = crypto
    .createHmac('sha256', process.env.PAYU_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return hash === signature;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('openpayu-signature') || headers().get('x-signature');

  if (!verifyPayuSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const payload = JSON.parse(body) as {
    order?: { orderId?: string; extOrderId?: string; status?: string };
  };

  const extOrderId = payload.order?.extOrderId;
  const paid = payload.order?.status === 'COMPLETED';

  if (!extOrderId) {
    return NextResponse.json({ error: 'Missing order id' }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { id: extOrderId } });
  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  if (paid) {
    const candle = await prisma.candle.findUnique({ where: { id: payment.candleId } });

    if (candle) {
      const { startTime, endTime } = computeActiveWindow(candle.durationDays);

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'paid', payuTransactionId: payload.order?.orderId ?? payment.payuTransactionId }
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
        gateway: 'payu',
        candleId: candle.id
      });
    }
  }

  return NextResponse.json({ received: true });
}
