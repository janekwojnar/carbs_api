export type SeoFilter = {
  title: string;
  description: string;
  where: Record<string, unknown>;
};

export const seoFilterMap: Record<string, SeoFilter> = {
  prayer: {
    title: 'Prayer candles online',
    description: 'Light virtual candles for prayer intentions.',
    where: { category: 'prayer' }
  },
  memorial: {
    title: 'Memorial candles online',
    description: 'Honor loved ones with a virtual memorial candle.',
    where: { category: 'memorial' }
  },
  poland: {
    title: 'Candles in Poland',
    description: 'See and light candles from Poland.',
    where: {
      locationLat: { not: null },
      locationLng: { not: null }
    }
  },
  warsaw: {
    title: 'Candles in Warsaw',
    description: 'Virtual candles connected with Warsaw intentions.',
    where: {
      locationLat: { gte: 52.1, lte: 52.4 },
      locationLng: { gte: 20.8, lte: 21.3 }
    }
  }
};
