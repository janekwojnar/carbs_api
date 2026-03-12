import Link from 'next/link';

import { Flame } from '@/components/candle/flame';

type CandleCardProps = {
  id: string;
  slug: string;
  name: string | null;
  intention: string;
  endTime: Date | null;
};

export function CandleCard({ slug, name, intention, endTime }: CandleCardProps) {
  const remainingDays = endTime
    ? Math.max(0, Math.ceil((new Date(endTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <Link
      href={`/candle/${slug}`}
      className="rounded-2xl border border-white/10 bg-surface/70 p-5 transition hover:border-gold/60 hover:shadow-glow"
    >
      <Flame />
      <h3 className="mt-3 font-serifDisplay text-2xl text-amber-100">{name || 'Anonymous'}</h3>
      <p className="line-clamp-2 text-sm text-white/80">{intention}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gold">{remainingDays} days remaining</p>
    </Link>
  );
}
