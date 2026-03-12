import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const candle = await prisma.candle.findUnique({
    where: { slug: params.slug },
    include: {
      memorial: true
    }
  });

  if (!candle) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...candle,
    remainingTime: candle.endTime ? Math.max(candle.endTime.getTime() - Date.now(), 0) : 0,
    isActive: candle.endTime ? candle.endTime.getTime() > Date.now() : false
  });
}
