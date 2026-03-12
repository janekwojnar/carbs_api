import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getRequestIp } from '@/lib/security/request';

export async function POST(request: Request) {
  const ip = getRequestIp();
  if (!checkRateLimit(`share:${ip}`).ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { candleId } = (await request.json()) as { candleId: string };
  if (!candleId) {
    return NextResponse.json({ error: 'Missing candleId' }, { status: 400 });
  }

  await prisma.candle.update({
    where: { id: candleId },
    data: { shareCount: { increment: 1 } }
  });

  return NextResponse.json({ success: true });
}
