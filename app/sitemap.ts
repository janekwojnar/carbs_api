import type { MetadataRoute } from 'next';

import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.APP_URL ?? 'https://virtualcandle.vercel.app';

  const [candles, memorials] = await Promise.all([
    prisma.candle.findMany({
      where: { paymentStatus: 'paid', isBanned: false },
      select: { slug: true, createdAt: true },
      take: 5000
    }),
    prisma.memorial.findMany({
      select: { slug: true, updatedAt: true },
      take: 5000
    })
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/candles/prayer`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/candles/memorial`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/candles/poland`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${siteUrl}/candles/warsaw`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${siteUrl}/prayer-for-health`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/candle-for-mother`, changeFrequency: 'weekly', priority: 0.7 }
  ];

  const candleRoutes: MetadataRoute.Sitemap = candles.map((candle) => ({
    url: `${siteUrl}/candle/${candle.slug}`,
    lastModified: candle.createdAt,
    changeFrequency: 'daily',
    priority: 0.6
  }));

  const memorialRoutes: MetadataRoute.Sitemap = memorials.map((memorial) => ({
    url: `${siteUrl}/memorial/${memorial.slug}`,
    lastModified: memorial.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.65
  }));

  return [...staticRoutes, ...candleRoutes, ...memorialRoutes];
}
