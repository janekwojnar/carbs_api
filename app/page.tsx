import Link from 'next/link';

import { LightCandleForm } from '@/components/forms/light-candle-form';
import { MapWrapper } from '@/components/map/map-wrapper';
import { WallGrid } from '@/components/candle/wall-grid';
import { prisma } from '@/lib/prisma';

export default async function HomePage() {
  const [candles, mapItems] = await Promise.all([
    prisma.candle.findMany({
      where: {
        paymentStatus: 'paid',
        isBanned: false,
        endTime: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' },
      take: 12
    }),
    prisma.candle.findMany({
      where: {
        paymentStatus: 'paid',
        locationLat: { not: null },
        locationLng: { not: null }
      },
      select: { id: true, slug: true, intention: true, locationLat: true, locationLng: true },
      take: 100
    })
  ]);

  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-6xl px-4 py-20">
        <p className="text-sm uppercase tracking-[0.24em] text-gold">VirtualCandle</p>
        <h1 className="mt-4 max-w-3xl font-serifDisplay text-5xl text-amber-100 md:text-7xl">Light a candle online</h1>
        <p className="mt-6 max-w-2xl text-lg text-white/80">
          Remember someone, pray for someone, or express your intention.
        </p>
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_420px]">
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
              <h2 className="font-serifDisplay text-3xl">How it works</h2>
              <ol className="mt-4 list-decimal space-y-2 pl-6 text-white/80">
                <li>Write intention and choose duration</li>
                <li>Pay securely with Stripe or PayU/BLIK</li>
                <li>Share your candle page and keep the flame alive</li>
              </ol>
            </div>

            <div>
              <h2 className="mb-4 font-serifDisplay text-3xl">Global candle wall</h2>
              <WallGrid initial={candles} />
            </div>
          </div>

          <div className="space-y-8">
            <LightCandleForm />
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
              <h3 className="font-serifDisplay text-2xl">Memorial pages</h3>
              <p className="mt-2 text-white/80">Create a lasting place with biography, photos and guestbook.</p>
              <Link href="/memorial/demo-memorial" className="mt-4 inline-block text-gold underline">
                View example memorial page
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="mb-4 font-serifDisplay text-3xl">Global candle map</h2>
        <MapWrapper items={mapItems as Array<{ id: string; slug: string; intention: string; locationLat: number; locationLng: number }>} />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="font-serifDisplay text-3xl">FAQ</h2>
        <div className="mt-4 space-y-3 text-white/80">
          <p>Payment activation happens only after verified webhook confirmation.</p>
          <p>Candle durations: 1 day, 7 days, 30 days, 365 days.</p>
          <p>Supports global payments plus local Polish methods including BLIK via PayU.</p>
        </div>
      </section>
    </main>
  );
}
