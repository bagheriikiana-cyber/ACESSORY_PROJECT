# ماه‌نشان — Mahneshan

Persian RTL accessories storefront and database-backed CMS built with Next.js App Router, TypeScript, Tailwind CSS, Prisma and PostgreSQL. Original generated campaign/product images are stored locally. The 16 seeded products are demonstration inventory and use six coordinated campaign photographs.

## Main features and stack

Next.js App Router, React, TypeScript, Prisma and PostgreSQL power the Persian RTL storefront and custom admin CMS. Features include product/category management, search and filters, wishlist, cart, transactional checkout, inventory restoration, coupons, moderated reviews, customer/order management and editable homepage campaigns.

## Requirements and installation

Node.js 24, pnpm 11, PostgreSQL 18 locally or a supported managed PostgreSQL database.

```sh
pnpm install --frozen-lockfile
```

`pnpm-workspace.yaml` explicitly permits the required Prisma, PostgreSQL and native dependency install scripts.

## Local database

```sh
pnpm db:start
```

Keep that terminal running. This starts a real PostgreSQL server bound to loopback on port 55432, creates the `mahneshan` database, persists records in `.data/postgres`, and writes `.env` with a randomly generated database password when `.env` does not exist. `.data` and `.env` are excluded from source control. Stop with Ctrl+C. Do not use the development database launcher for a public production deployment.

Set a unique `SEED_ADMIN_PASSWORD` in `.env` before seeding. In a separate terminal:

```sh
pnpm db:migrate
pnpm exec prisma generate
pnpm db:seed
pnpm dev
```

Storefront: http://localhost:3000

Admin: http://localhost:3000/admin

Admin email and password are supplied through `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

Optional demo customer login: set `SEED_CUSTOMER_PASSWORD` before seeding; otherwise its password is randomly generated and login is unavailable.

Demo coupon: `WELCOME10` (10%, minimum 1,000,000 Toman, maximum 500,000 Toman).

The seed is idempotent and preserves existing edited records. It creates 16 products, five categories, two brands, users, five demo orders, approved reviews, banners and settings. Seeded paid orders are explicitly fictional demonstration records; checkout itself never marks an order paid.

## Environment

For an external database, copy `.env.example` to `.env` and configure:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL; use TLS and least-privilege credentials in production. |
| `APP_URL` | Canonical origin, including protocol. Used for metadata and origin validation. |
| `COOKIE_SECURE` | `false` for HTTP localhost; must be `true` behind production HTTPS. |
| `SEED_ADMIN_EMAIL` | Admin created by seed if absent. |
| `SEED_CUSTOMER_PASSWORD` | Optional development demo customer password. Omit for a random password. |
| `SEED_ADMIN_PASSWORD` | Admin password, bcrypt-hashed by seed. Set a unique value before production seed. |

Changing seed credentials does not overwrite existing accounts. Do not deploy the documented demo credentials or demo customer data to a public store.

## Validation and production

```sh
pnpm typecheck
pnpm lint
pnpm build
pnpm test
pnpm start
```

Run `pnpm test` against a running local application and development database. Tests create temporary records, exercise real HTTP routes and PostgreSQL, then clean up their test records. It intentionally mutates site settings briefly and must never run against a public production store.

Browser QA: `pnpm test:browser` uses installed Microsoft Edge (or `QA_BROWSER_CHANNEL=chrome`) against the local app and saves screenshots under ignored `.data/qa`. On Windows, stop the app before `pnpm build` so Prisma can replace its engine DLL.

The development build uses `.next-dev`, and the production build uses `.next`, so production validation does not corrupt the running development preview. Both scripts bind to loopback by default. For deployment, run `next start --hostname 0.0.0.0` behind an HTTPS reverse proxy on a Node-compatible host, provision durable PostgreSQL, set environment variables, run `prisma migrate deploy`, then build and start. Configure process supervision, database backups and server-side logs. Public hosting requires a separate deployment; the source repository is connected to GitHub.

## CMS

Admin and all `/api/admin/*` routes require an authenticated `ADMIN` user. Session tokens are random, hashed in PostgreSQL, expire after seven days, and are stored in HTTP-only SameSite cookies. Passwords use bcrypt. Mutations validate inputs on the server and reject cross-origin requests. Product and order amounts are always calculated server-side.

Admin manages products and multiple image URLs, variants, specifications, SEO, availability, categories, orders, customer/order inspection, coupons, review moderation, homepage settings and banners. Product/category deletion is reversible deactivation to preserve order relations. Image fields support `/images/...` paths and images from the configured Next.js remote host (`images.unsplash.com`). Add approved storage hosts to `next.config.ts` before using other image providers. Variant and specification fields accept JSON with editable values; no source edits are needed to manage records.

All storefront content is read dynamically from PostgreSQL. Checkout transactions validate availability, reserve product and variant stock, enforce coupon limits, persist price/address snapshots and clear the cart atomically. Cancellation restores stock once. Cart tokens are device-scoped; orders, addresses and wishlists are account-scoped.

## Payment and external services

`src/lib/payment.ts` defines `PaymentProvider`. The current manual provider records an unpaid order and returns no payment URL. It never simulates successful online payment.

A live Iranian payment gateway still requires a provider adapter, merchant credentials (`PAYMENT_MERCHANT_ID`) and an HTTPS callback URL (`PAYMENT_CALLBACK_URL`). These are documented integration variables, not an implemented live gateway switch. The adapter must convert Toman to Rial, persist the gateway reference, validate callback ownership, verify the transaction and exact amount server-side, and apply idempotent payment status updates. Merely adding credentials does not activate online payment.

Newsletter subscriptions are persisted; emails are not sent. Optional email delivery needs an email provider and `EMAIL_API_KEY`. Images currently use local files or approved remote URLs; optional object storage/upload integration needs a bucket, access key and secret (`STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`). None of these services are needed for the local preview.

## Verification coverage

TypeScript, ESLint, production compilation, migrations, PostgreSQL connectivity and seed counts are checked. Integration tests cover authentication, admin authorization, product CRUD/storefront consistency, cart stock validation, checkout persistence, coupon calculation, stock cancellation, wishlist, addresses, review moderation, category CRUD, coupon CRUD, banner CRUD, homepage CMS, customer orders, logout and origin rejection.

The required browser CMS flow was also performed through the actual UI: login, create product with image/category/price/stock, find in Shop, open detail, edit name/price, observe update, disable, confirm Shop exclusion and unavailable detail. Browser checks include search/filter/sort, cart, wishlist, mobile checkout, unpaid order confirmation, admin order status changes, customer order details and RTL responsive layouts.

Font: Vazirmatn (SIL Open Font License). Campaign and product assets: original AI-generated illustrations; no Swarovski branding, copy or images are used.

## Blush campaign redesign

The storefront redesign is scoped to `src/app/(store)/storefront.css`; admin styling and backend architecture remain intact. Six coordinated original campaign photographs live in `public/images/rose-*.jpg`. Hero, product/category images, banners and copy are still read from the CMS. `node --env-file=.env scripts/rose-content.mjs` applies the initial campaign content once, retaining a backup in `.data/rose-content-backup.json` and preserving subsequent CMS edits. Seed defaults use the new campaign assets.

## Vercel + Neon production deployment

1. Create a Neon database dedicated to production. Set Vercel `DATABASE_URL` to its pooled URL with TLS (`sslmode=require`, and Prisma 6 `connection_limit=1` to start). Keep the direct, unpooled URL as `DIRECT_URL` for migrations. Local PostgreSQL remains supported; when `DIRECT_URL` is absent the migration script uses `DATABASE_URL`.
2. Import `bagheriikiana-cyber/ACESSORY_PROJECT` in Vercel, choose Next.js and Node 24. Use the committed build/install settings. Build runs Prisma generation every time, including cached installations. Separate Preview and Production database credentials.
3. Set `APP_URL` to the final HTTPS origin and `COOKIE_SECURE=true`. Never expose database, admin or gateway secrets via `NEXT_PUBLIC_*` variables.
4. From a trusted terminal/CI with production environment injected, run `pnpm db:migrate` (only `prisma migrate deploy`; no reset). Then set `ADMIN_EMAIL` and a unique 16–72 character `ADMIN_PASSWORD`, run `pnpm admin:init`, and remove the admin password from the environment. This creates only the administrator and site settings, without demo customers/orders; existing accounts and passwords are preserved. Demo seed is optional for development and rejects NODE_ENV=production.
5. Deploy and run the browser acceptance flow against the public URL. Local integration tests deliberately reject public hosts. Configure backups and review application logs before accepting real orders.

CMS images are stored as URLs, never written to ephemeral serverless disk. Static campaign files are bundled under `public/images`. Upload new images using your storage provider dashboard, then paste their HTTPS URLs into CMS. Add its exact public hostname to comma-separated `IMAGE_HOSTS` and redeploy; both validation and Next/Image use that allowlist. No storage credentials are required in the application for this URL-based workflow. Optional direct uploads should use server-issued short-lived upload URLs; never put provider secret keys in client code.

Payment remains manual and unpaid. Add the gateway adapter at `src/lib/payment.ts`; wire a callback route into `src/app/api/[...path]/route.ts` only after merchant access is available. The adapter must verify order ID, stored reference, currency and exact amount with the provider server, then atomically and idempotently mark the order PAID. A browser redirect alone is never payment evidence. `PAYMENT_MERCHANT_ID` and `PAYMENT_CALLBACK_URL` are integration requirements, not a switch that enables a gateway.

Deployment references: [Vercel Prisma build guidance](https://vercel.com/kb/guide/nextjs-prisma-postgres), [Prisma Neon connections](https://docs.prisma.io/docs/orm/v6/overview/databases/neon).
