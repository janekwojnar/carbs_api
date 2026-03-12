import { notFound } from 'next/navigation';

import { CandleCard } from '@/components/candle/candle-card';
import { prisma } from '@/lib/prisma';
import { seoFilterMap } from '@/lib/seo/filters';

export async function generateStaticParams() {
  return Object.keys(seoFilterMap).map((filter) => ({ filter }));
}

export default async function SeoCandlesPage({ params }: { params: { filter: string } }) {
  const cfg = seoFilterMap[params.filter];
  if (!cfg) notFound();

  const candles = await prisma.candle.findMany({
    where: {
      paymentStatus: 'paid',
      isBanned: false,
      ...(cfg.where as Record<string, unknown>)
    },
    take: 60,
    orderBy: { createdAt: 'desc' }
  });

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-16">
      <h1 className="font-serifDisplay text-5xl text-amber-100">{cfg.title}</h1>
      <p className="mt-4 text-white/80">{cfg.description}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {candles.map((candle) => (
          <CandleCard key={candle.id} {...candle} />
        ))}
      </div>
    </main>
  );
}
