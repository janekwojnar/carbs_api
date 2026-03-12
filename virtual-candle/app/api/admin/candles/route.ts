import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const candles = await prisma.candle.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      payments: true,
      memorial: true
    },
    take: 100
  });

  return NextResponse.json({ items: candles });
}
