import type { Metadata } from 'next';
import { Cormorant_Garamond, Source_Sans_3 } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';

import '@/styles/globals.css';

const headingFont = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-heading'
});

const bodyFont = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body'
});

export const metadata: Metadata = {
  title: 'VirtualCandle | Light a candle online',
  description: 'Remember someone, pray for someone, or express your intention online.',
  metadataBase: new URL(process.env.APP_URL ?? 'https://virtualcandle.vercel.app'),
  openGraph: {
    title: 'VirtualCandle | Light a candle online',
    description: 'Remember someone, pray for someone, or express your intention online.',
    type: 'website'
  },
  alternates: {
    canonical: '/'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
