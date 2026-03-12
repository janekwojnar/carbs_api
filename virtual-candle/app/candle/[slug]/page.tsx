import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Flame } from '@/components/candle/flame';
import { ShareButtons } from '@/components/candle/share-buttons';
import { prisma } from '@/lib/prisma';

export default async function CandlePage({ params }: { params: { slug: string } }) {
  const candle = await prisma.candle.findUnique({
    where: { slug: params.slug },
    include: { memorial: true }
  });

  if (!candle) notFound();

  const remainingDays = candle.endTime
    ? Math.max(0, Math.ceil((new Date(candle.endTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-16">
      <div className="rounded-3xl border border-white/10 bg-surface/70 p-10 text-center">
        <Flame />
        <h1 className="mt-6 font-serifDisplay text-5xl text-amber-100">{candle.name || 'Anonymous Candle'}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">{candle.intention}</p>
        <p className="mt-4 text-gold">{remainingDays} days remaining</p>

        <div className="mt-8 flex justify-center">
          <ShareButtons candleId={candle.id} slug={candle.slug} />
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/" className="rounded-full bg-gold px-6 py-3 font-semibold text-black">
            Light another candle
          </Link>
          {candle.memorial ? (
            <Link href={`/memorial/${candle.memorial.slug}`} className="rounded-full border border-gold/50 px-6 py-3 text-gold">
              Go to memorial page
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
