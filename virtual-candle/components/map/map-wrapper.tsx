'use client';

import dynamic from 'next/dynamic';

const CandleMap = dynamic(() => import('@/components/map/candle-map').then((m) => m.CandleMap), {
  ssr: false
});

export function MapWrapper({ items }: { items: Array<{ id: string; slug: string; intention: string; locationLat: number; locationLng: number }> }) {
  return <CandleMap items={items} />;
}
