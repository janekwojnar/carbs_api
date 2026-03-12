import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export default async function AdminDashboardPage() {
  try {
    await requireAdmin();
  } catch {
    redirect('/admin/login');
  }

  const [totalCandles, activeCandles, paidPayments, topCandles, memorialCount, prayerCount, supportCount, gratitudeCount] = await Promise.all([
    prisma.candle.count(),
    prisma.candle.count({ where: { paymentStatus: 'paid', endTime: { gt: new Date() } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'paid' } }),
    prisma.candle.findMany({ orderBy: { shareCount: 'desc' }, take: 5 }),
    prisma.candle.count({ where: { category: 'memorial' } }),
    prisma.candle.count({ where: { category: 'prayer' } }),
    prisma.candle.count({ where: { category: 'support' } }),
    prisma.candle.count({ where: { category: 'gratitude' } })
  ]);

  const revenue = (paidPayments._sum.amount ?? 0) / 100;
  const conversionRate = totalCandles > 0 ? Math.round((activeCandles / totalCandles) * 100) : 0;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-16">
      <h1 className="font-serifDisplay text-5xl text-amber-100">Admin dashboard</h1>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Card title="Total candles" value={String(totalCandles)} />
        <Card title="Active candles" value={String(activeCandles)} />
        <Card title="Revenue" value={`${revenue.toFixed(2)} PLN`} />
        <Card title="Conversion" value={`${conversionRate}%`} />
      </div>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-surface/60 p-6">
          <h2 className="font-serifDisplay text-3xl">Top candles</h2>
          <ul className="mt-4 space-y-2 text-white/80">
            {topCandles.map((candle) => (
              <li key={candle.id}>{candle.slug} ({candle.shareCount} shares)</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface/60 p-6">
          <h2 className="font-serifDisplay text-3xl">Top pages</h2>
          <ul className="mt-4 space-y-2 text-white/80">
            {topPages.map((page) => (
              <li key={page.category}>{page.category}: {page.count} candles</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-sm text-white/70">{title}</p>
      <p className="mt-1 font-serifDisplay text-3xl text-gold">{value}</p>
    </div>
  );
}
  const topPages = [
    { category: 'memorial', count: memorialCount },
    { category: 'prayer', count: prayerCount },
    { category: 'support', count: supportCount },
    { category: 'gratitude', count: gratitudeCount }
  ];
