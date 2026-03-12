import crypto from 'crypto';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { trackServerEvent } from '@/lib/analytics/events';
import { computeActiveWindow } from '@/lib/candle/lifecycle';
import { prisma } from '@/lib/prisma';

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parsePayuSignatureHeader(raw?: string | null) {
  if (!raw) return null;

  if (!raw.includes('=')) {
    return { signature: raw };
  }

  const pairs = raw.split(';').map((chunk) => chunk.trim());
  const parsed = pairs.reduce<Record<string, string>>((acc, pair) => {
    const [key, value] = pair.split('=');
    if (key && value) acc[key] = value;
    return acc;
  }, {});

  return parsed;
}

function verifyPayuSignature(body: string, headerValue?: string | null) {
  if (!process.env.PAYU_WEBHOOK_SECRET) return true;
  if (!headerValue) return false;

  const parsed = parsePayuSignatureHeader(headerValue);
  const expectedSha256 = crypto
    .createHmac('sha256', process.env.PAYU_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  const expectedMd5 = crypto.createHash('md5').update(body + process.env.PAYU_WEBHOOK_SECRET).digest('hex');
  const provided = parsed?.signature ?? '';

  return safeCompare(provided, expectedSha256) || safeCompare(provided, expectedMd5);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signatureHeader = headers().get('openpayu-signature') || headers().get('x-signature');

  if (!verifyPayuSignature(body, signatureHeader)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let payload: { order?: { orderId?: string; extOrderId?: string; status?: string } };
  try {
    payload = JSON.parse(body) as { order?: { orderId?: string; extOrderId?: string; status?: string } };
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const extOrderId = payload.order?.extOrderId;
  const paid = payload.order?.status === 'COMPLETED';
  const failed = payload.order?.status === 'CANCELED';

  if (!extOrderId) {
    return NextResponse.json({ error: 'Missing order id' }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { id: extOrderId } });
  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  if (paid) {
    if (payment.status === 'paid') {
      return NextResponse.json({ received: true, idempotent: true });
    }

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

  if (failed) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' }
    });
  }

  return NextResponse.json({ received: true });
}
