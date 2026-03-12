# VirtualCandle Platform

Production-ready starter for global virtual candle platform built with Next.js 14, Prisma, PostgreSQL, Stripe and PayU.

## 1. Architecture Overview

- Frontend: Next.js App Router + TypeScript + Tailwind + Framer Motion
- Backend: Next.js Route Handlers (`/api/*`)
- Database: PostgreSQL (Neon) + Prisma ORM
- Auth: NextAuth credentials login for admin panel
- Payments:
  - Global: Stripe Checkout (cards, Apple Pay, Google Pay)
  - Poland: PayU (BLIK and bank transfers supported by PayU)
- Security: Zod validation, rate limiting, captcha hook, webhook signature checks, CSP + CSRF origin checks
- Analytics: Vercel Analytics + optional PostHog server events
- Infra: Vercel deployment + GitHub Actions CI/CD

Payment flow:
1. User creates candle (`/api/candle/create`)
2. User starts payment session (Stripe/PayU)
3. Gateway redirects user
4. Webhook verifies payment
5. Backend activates candle (`startTime`, `endTime`, `paymentStatus=paid`)

## 2. Folder Structure

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
    admin/
    candle/[slug]/
    candles/[filter]/
    memorial/[slug]/
    layout.tsx
    page.tsx
  components/
    candle/
    forms/
    map/
  lib/
    analytics/
    auth/
    candle/
    payments/
    security/
    seo/
    validation/
    prisma.ts
  prisma/
    schema.prisma
  scripts/
    seed-admin.ts
  styles/
    globals.css
  tests/
  .github/workflows/ci.yml
  .env.example
```

## 3. Prisma Models

- `User` (admin/moderator)
- `Candle`
- `Payment`
- `Memorial`
- `ModerationItem`

See full schema in [`prisma/schema.prisma`](./prisma/schema.prisma).

## 4. API Endpoints

- `POST /api/candle/create`
- `GET /api/candles`
- `GET /api/candle/[slug]`
- `POST /api/payment/stripe-session`
- `POST /api/payment/payu-session`
- `POST /api/webhooks/stripe`
- `POST /api/webhooks/payu`
- `GET /api/admin/candles`
- `DELETE /api/admin/candle/[id]`

## 5. Local Setup

```bash
cd virtual-candle
npm install
cp .env.example .env
npx prisma migrate dev --name init
npx prisma generate
npx ts-node scripts/seed-admin.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 6. Payments Setup

### Stripe
1. Create Stripe account and product is generated dynamically in checkout.
2. Set env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
3. Configure webhook endpoint to:
   - `https://your-domain.com/api/webhooks/stripe`
   - Event: `checkout.session.completed`

### PayU (Poland, BLIK)
1. Create PayU merchant account.
2. Set env vars: `PAYU_CLIENT_ID`, `PAYU_CLIENT_SECRET`, `PAYU_WEBHOOK_SECRET`.
3. Configure notify URL:
   - `https://your-domain.com/api/webhooks/payu`

## 7. Deployment (Vercel + Neon)

1. Create Neon PostgreSQL DB and copy `DATABASE_URL`.
2. Push repository to GitHub.
3. Import project in Vercel, root directory: `virtual-candle`.
4. Add all env variables from `.env.example` in Vercel project settings.
5. Deploy.
6. Run `npx prisma migrate deploy` in CI or Vercel build command.

## 8. GitHub Setup + CI/CD

1. Add GitHub Actions secrets:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
2. Workflow in `.github/workflows/ci.yml` runs:
   - install
   - tests
   - build
   - production deploy on `main`

## 9. SEO and Programmatic Pages

- Static filter pages at `/candles/[filter]` (`prayer`, `memorial`, `poland`, `warsaw`)
- Internal linking via wall, memorial and candle pages
- Extend with additional long-tail slugs using the same route strategy

## 10. Production Notes

- Replace placeholder moderation dictionary with full profanity service.
- Add Redis-based shared rate limiter for multi-instance production.
- Add map clustering plugin (Leaflet marker cluster).
- Configure Sentry and uptime alerts.
