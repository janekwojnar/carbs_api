# VirtualCandle - Production Edition

A production-grade global virtual candle platform with Stripe + PayU (BLIK), admin panel, moderation, SEO pages, map, analytics, and CI/CD.

## Live website (target)

After deployment on Vercel your default URL will be:
- `https://virtualcandle.vercel.app`

Recommended custom domain:
- `https://virtualcandle.com`

Set both in env as:
- `APP_URL=https://virtualcandle.com`
- `NEXTAUTH_URL=https://virtualcandle.com`

## Core architecture

- Frontend: Next.js 14 App Router + TypeScript + Tailwind + Framer Motion
- Backend: Next.js Route Handlers
- DB: PostgreSQL (Neon) + Prisma
- Auth: NextAuth credentials (admin)
- Payments:
  - Stripe (cards, Apple Pay, Google Pay)
  - PayU (BLIK / bank transfer in Poland)
- Security:
  - Zod input validation
  - Rate limiting
  - Captcha hook
  - CSRF origin checks for state-changing API calls
  - Webhook signature verification + idempotency guards
  - CSP / security headers in middleware
- SEO:
  - Dynamic candle + memorial pages
  - Programmatic pages (`/candles/[filter]`, `/prayer-for-health`, `/candle-for-mother`)
  - `robots.ts` + `sitemap.ts`
- Analytics:
  - Vercel Analytics
  - optional PostHog server events
- CI/CD:
  - GitHub Actions + Vercel deployment workflow

## Production endpoints

- `POST /api/candle/create`
- `POST /api/payment/stripe-session`
- `POST /api/payment/payu-session`
- `POST /api/webhooks/stripe`
- `POST /api/webhooks/payu`
- `GET /api/candles`
- `GET /api/candle/[slug]`
- `POST /api/share`
- `GET /api/health`
- `GET /api/admin/candles`
- `DELETE /api/admin/candle/[id]`

## Folder structure

```txt
virtual-candle/
  app/
    api/
      admin/
      auth/[...nextauth]/
      candle/
      candles/
      payment/
      share/
      webhooks/
      health/
    admin/
    candle/[slug]/
    candles/[filter]/
    memorial/[slug]/
    candle-for-mother/
    prayer-for-health/
    layout.tsx
    page.tsx
    robots.ts
    sitemap.ts
  components/
  lib/
  prisma/
  scripts/
  styles/
  tests/
  .github/workflows/ci.yml
  vercel.json
```

## Local setup

```bash
cd virtual-candle
npm install
cp .env.example .env
npx prisma migrate dev --name init
npx prisma generate
npm run seed:admin
npm run dev
```

## Required environment variables

Use `.env.example` as base. Required in production:

- `DATABASE_URL`
- `APP_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYU_CLIENT_ID`
- `PAYU_CLIENT_SECRET`
- `PAYU_WEBHOOK_SECRET`

Optional:
- `TURNSTILE_SECRET_KEY`
- `POSTHOG_API_KEY`
- `POSTHOG_HOST`

## Payment activation guarantee

Candle activation happens only via verified webhooks (`/api/webhooks/stripe`, `/api/webhooks/payu`).
Frontend success redirects never activate a candle.

## Deployment (Vercel + Neon)

1. Create Neon PostgreSQL and copy `DATABASE_URL`.
2. Push this folder to GitHub.
3. Import repo to Vercel (root: `virtual-candle`).
4. Add all production env vars in Vercel.
5. Deploy.
6. Configure Stripe and PayU webhooks to production URLs.
7. Add custom domain in Vercel (`virtualcandle.com`) and update `APP_URL` + `NEXTAUTH_URL`.

## GitHub Actions secrets

Add these repo secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Final production checklist

- [ ] `GET /api/health` returns `{ ok: true }`
- [ ] Stripe test payment activates candle via webhook
- [ ] PayU sandbox payment activates candle via webhook
- [ ] Admin login works and dashboard loads stats
- [ ] `/sitemap.xml` and `/robots.txt` are publicly available
- [ ] SSL and custom domain active in Vercel

