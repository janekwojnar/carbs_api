import Image from 'next/image';
import { notFound } from 'next/navigation';

import { CandleCard } from '@/components/candle/candle-card';
import { prisma } from '@/lib/prisma';

export default async function MemorialPage({ params }: { params: { slug: string } }) {
  const memorial = await prisma.memorial.findUnique({
    where: { slug: params.slug },
    include: {
      candles: {
        where: { isBanned: false },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!memorial) notFound();

  const guestbookEntries = Array.isArray(memorial.guestbook) ? memorial.guestbook : [];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-16">
      <section className="rounded-2xl border border-white/10 bg-surface/60 p-8">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="relative h-52 w-52 overflow-hidden rounded-xl border border-white/20">
            <Image src={memorial.photoUrl || '/memorial-placeholder.svg'} alt={memorial.personName} fill className="object-cover" />
          </div>
          <div>
            <h1 className="font-serifDisplay text-5xl text-amber-100">{memorial.personName}</h1>
            <p className="mt-4 max-w-2xl text-white/80">{memorial.biography || 'Biography will be added soon.'}</p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 font-serifDisplay text-3xl">Candles</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memorial.candles.map((candle) => (
            <CandleCard key={candle.id} {...candle} />
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-6">
        <h2 className="font-serifDisplay text-3xl">Guestbook</h2>
        <ul className="mt-4 space-y-2 text-white/80">
          {guestbookEntries.length ? (
            guestbookEntries.map((entry, index) => <li key={index}>• {String(entry)}</li>)
          ) : (
            <li>Be the first to leave a memory.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
