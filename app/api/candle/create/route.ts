import { NextResponse } from 'next/server';

import { trackServerEvent } from '@/lib/analytics/events';
import { PRICE_MATRIX } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { containsProfanity, sanitizeInput } from '@/lib/security/moderation';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getRequestIp } from '@/lib/security/request';
import { verifyCaptcha } from '@/lib/security/captcha';
import { candleCreateSchema } from '@/lib/validation/candle';
import { makeSlug } from '@/lib/utils';
import { shortId } from '@/lib/security/id';

export async function POST(request: Request) {
  try {
    const ip = getRequestIp();
    const rate = checkRateLimit(`candle-create:${ip}`);

    if (!rate.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const json = await request.json();
    const parsed = candleCreateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const captchaOk = await verifyCaptcha((json as { captchaToken?: string }).captchaToken);
    if (!captchaOk) {
      return NextResponse.json({ error: 'Captcha failed' }, { status: 400 });
    }

    if (containsProfanity(parsed.data.intention)) {
      await prisma.moderationItem.create({
        data: {
          payload: parsed.data,
          reason: 'profanity_detected'
        }
      });

      return NextResponse.json({ error: 'Content under moderation review.' }, { status: 202 });
    }

    const base = makeSlug(parsed.data.name || parsed.data.intention.slice(0, 40));
    const slug = `${base}-${shortId(6)}`;

    const candle = await prisma.candle.create({
      data: {
        category: parsed.data.category,
        durationDays: parsed.data.durationDays,
        intention: sanitizeInput(parsed.data.intention),
        name: parsed.data.name ? sanitizeInput(parsed.data.name) : null,
        emoji: parsed.data.emoji,
        memorialId: parsed.data.memorialId,
        locationLat: parsed.data.locationLat,
        locationLng: parsed.data.locationLng,
        slug
      }
    });

    const amount = PRICE_MATRIX[candle.durationDays];

    trackServerEvent('candle_created', {
      candleId: candle.id,
      durationDays: candle.durationDays,
      amount
    });

    return NextResponse.json({ candle, amount, currency: parsed.data.currency });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
