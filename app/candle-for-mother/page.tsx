import Link from 'next/link';

import { CandleCard } from '@/components/candle/candle-card';
import { prisma } from '@/lib/prisma';

export const metadata = {
  title: 'Candle for mother | VirtualCandle',
  description: 'Light a virtual candle for your mother and share your intention.'
};

export default async function CandleForMotherPage() {
  const candles = await prisma.candle.findMany({
    where: {
      paymentStatus: 'paid',
      intention: { contains: 'mother', mode: 'insensitive' }
    },
    take: 24,
    orderBy: { createdAt: 'desc' }
  });

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-16">
      <h1 className="font-serifDisplay text-5xl text-amber-100">Virtual Candle For Mother</h1>
      <p className="mt-4 text-white/80">Create a heartfelt tribute page and keep the flame burning.</p>
      <Link href="/" className="mt-4 inline-block text-gold underline">Create candle</Link>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {candles.map((candle) => (
          <CandleCard key={candle.id} {...candle} />
        ))}
      </div>
    </main>
  );
}
