import { candleCreateSchema } from '@/lib/validation/candle';

describe('candleCreateSchema', () => {
  it('accepts valid candle input', () => {
    const parsed = candleCreateSchema.safeParse({
      intention: 'Prayer for health',
      category: 'prayer',
      durationDays: 30,
      currency: 'PLN'
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects invalid duration', () => {
    const parsed = candleCreateSchema.safeParse({
      intention: 'x',
      category: 'prayer',
      durationDays: 10,
      currency: 'PLN'
    });

    expect(parsed.success).toBe(false);
  });
});
