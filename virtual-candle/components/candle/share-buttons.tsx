'use client';

import { useMemo } from 'react';
import { useState } from 'react';

type Props = {
  candleId: string;
  slug: string;
};

export function ShareButtons({ candleId, slug }: Props) {
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/candle/${slug}`;
    }
    return `/candle/${slug}`;
  }, [slug]);

  async function track() {
    await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candleId })
    });
  }

  async function onCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    track();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a onClick={track} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="rounded-full border px-4 py-2 text-sm">
        Facebook
      </a>
      <a onClick={track} href={`https://wa.me/?text=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="rounded-full border px-4 py-2 text-sm">
        WhatsApp
      </a>
      <a onClick={track} href={`https://t.me/share/url?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="rounded-full border px-4 py-2 text-sm">
        Telegram
      </a>
      <button onClick={onCopy} className="rounded-full border px-4 py-2 text-sm">
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}
