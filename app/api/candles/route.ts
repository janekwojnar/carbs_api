import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get('sort') ?? 'newest';
  const cursor = searchParams.get('cursor');

  const orderBy: Prisma.CandleOrderByWithRelationInput =
    sort === 'popular'
      ? { shareCount: 'desc' }
      : sort === 'ending'
        ? { endTime: 'asc' }
        : { createdAt: 'desc' };

  const candles = await prisma.candle.findMany({
    where: {
      paymentStatus: 'paid',
      isBanned: false,
      endTime: {
        gt: new Date()
      }
    },
    orderBy,
    take: 20,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
  });

  return NextResponse.json({
    items: candles,
    nextCursor: candles.length === 20 ? candles[candles.length - 1].id : null
  });
}
