import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.candle.update({
    where: { id: params.id },
    data: { isBanned: true }
  });

  return NextResponse.json({ success: true });
}
