import Link from 'next/link';

import { CandleCard } from '@/components/candle/candle-card';
import { prisma } from '@/lib/prisma';

export const metadata = {
  title: 'Prayer for health candle | VirtualCandle',
  description: 'Light a virtual prayer candle for health and recovery.'
};

export default async function PrayerForHealthPage() {
  const candles = await prisma.candle.findMany({
    where: {
      category: 'prayer',
      paymentStatus: 'paid',
      intention: { contains: 'health', mode: 'insensitive' }
    },
    take: 24,
    orderBy: { createdAt: 'desc' }
  });

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-16">
      <h1 className="font-serifDisplay text-5xl text-amber-100">Prayer For Health Candles</h1>
      <p className="mt-4 text-white/80">A dedicated space for intentions focused on healing and health.</p>
      <Link href="/" className="mt-4 inline-block text-gold underline">Light your candle now</Link>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {candles.map((candle) => (
          <CandleCard key={candle.id} {...candle} />
        ))}
      </div>
    </main>
  );
}
