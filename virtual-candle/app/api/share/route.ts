import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const { candleId } = (await request.json()) as { candleId: string };

  await prisma.candle.update({
    where: { id: candleId },
    data: { shareCount: { increment: 1 } }
  });

  return NextResponse.json({ success: true });
}
