import { containsProfanity, sanitizeInput } from '@/lib/security/moderation';

describe('moderation', () => {
  it('detects blocked words', () => {
    expect(containsProfanity('This is scam content')).toBe(true);
  });

  it('sanitizes basic html tags', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
