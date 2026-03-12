import { z } from 'zod';

const envSchema = z.object({
  APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  PAYU_CLIENT_ID: z.string().min(1).optional(),
  PAYU_CLIENT_SECRET: z.string().min(1).optional(),
  PAYU_WEBHOOK_SECRET: z.string().min(1).optional()
});

export function getEnv() {
  return envSchema.parse(process.env);
}
