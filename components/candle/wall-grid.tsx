'use client';

import { useEffect, useMemo, useState } from 'react';

import { CandleCard } from '@/components/candle/candle-card';

type Candle = {
  id: string;
  slug: string;
  name: string | null;
  intention: string;
  endTime: Date | null;
};

export function WallGrid({ initial }: { initial: Candle[] }) {
  const [items, setItems] = useState<Candle[]>(initial);
  const [cursor, setCursor] = useState<string | null>(initial.length ? initial[initial.length - 1].id : null);
  const [sort, setSort] = useState<'newest' | 'popular' | 'ending'>('newest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(initial);
    setCursor(initial.length ? initial[initial.length - 1].id : null);
  }, [initial]);

  const sortedItems = useMemo(() => items, [items]);

  useEffect(() => {
    async function refreshBySort() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/candles?sort=${sort}`);
        const data = (await res.json()) as { items: Candle[]; nextCursor: string | null };
        if (!res.ok) throw new Error('Unable to load candles');
        setItems(data.items);
        setCursor(data.nextCursor);
      } catch {
        setError('Unable to load candles right now.');
      } finally {
        setLoading(false);
      }
    }

    refreshBySort();
  }, [sort]);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/candles?sort=${sort}&cursor=${cursor}`);
      const data = (await res.json()) as { items: Candle[]; nextCursor: string | null };
      if (!res.ok) throw new Error('Unable to load more candles');

      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
    } catch {
      setError('Unable to load more candles.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { id: 'newest', label: 'Newest' },
          { id: 'popular', label: 'Popular' },
          { id: 'ending', label: 'Ending soon' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setSort(option.id as 'newest' | 'popular' | 'ending')}
            className={`rounded-full border px-4 py-2 text-sm ${
              sort === option.id ? 'border-gold text-gold' : 'border-white/20 text-white/80'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedItems.map((item) => (
          <CandleCard key={item.id} {...item} />
        ))}
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        onClick={loadMore}
        disabled={!cursor || loading}
        className="rounded-full border border-gold/50 px-6 py-2 text-sm text-gold disabled:opacity-50"
      >
        {loading ? 'Loading...' : cursor ? 'Load more candles' : 'No more candles'}
      </button>
    </div>
  );
}
