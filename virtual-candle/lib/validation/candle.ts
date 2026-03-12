import { CandleCategory } from '@prisma/client';
import { z } from 'zod';

export const candleCreateSchema = z.object({
  name: z.string().trim().max(80).optional(),
  intention: z.string().trim().min(3).max(500),
  category: z.nativeEnum(CandleCategory),
  durationDays: z.union([z.literal(1), z.literal(7), z.literal(30), z.literal(365)]),
  emoji: z.string().trim().max(8).optional(),
  memorialId: z.string().cuid().optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  currency: z.string().length(3).default('PLN')
});

export type CandleCreateInput = z.infer<typeof candleCreateSchema>;
