# Expense Flow

Expense Flow is an encrypted, multi-user expense and income operating system built with Next.js 16, React 19, Tailwind CSS v4, Prisma 6, and NextAuth 5 beta. The codebase follows the product contract in `AGENTS.md` and layers on richer analytics, CSV automation, scoped APIs, and workspace UX polish.

## Feature tour
- **Insight workspace** – rolling cash series with extra time ranges (3M/6M/12M/YTD), forecast area chart, anomaly alerts, category-health comparisons, scenario planner, and an income → spend Sankey.
- **Feed + quick actions** – global command palette (⌘/Ctrl+K), floating quick-actions button, mobile nav pills, and a `/feed` page that unifies expenses, income, automations, API keys, and schedules in chronological order.
- **User preferences** – `/settings` lets you set default currency, theme (system/light/dark), and accent color, persisted via Prisma and synced with `next-themes`.
- **Data entry upgrades** – bulk expense builder now supports smart category hints, bulk-apply bar, and API-powered suggestions. CSV import adds bank templates, preview+inline edits, structured import, and scheduled reminders.
- **API surface** – besides the original CRUD endpoints, there are analytics routes (`/api/analytics/*`), feed export (`/api/feed`), structured import endpoints, and schedule controls; all respect API key scopes and rate limiting.

## Repository layout
```
prisma/                 # Prisma schema + migrations
src/app/                # App Router routes, API handlers, global layout/styles
src/components/         # Layout, feature modules, shadcn-inspired UI primitives
src/lib/                # Prisma client, auth helpers, encryption, services
AGENTS.md               # Full product specification and rebuild guide
```

## Getting started
1. **Install dependencies** (NextAuth beta prefers `--legacy-peer-deps`)
   ```bash
   npm install --legacy-peer-deps
   ```
2. **Environment variables** – copy `.env.example` to `.env` and fill:
   - `DATABASE_URL` (PostgreSQL connection)
   - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
   - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
   - `ENCRYPTION_KEY` – base64 32 bytes (`openssl rand -base64 32`)
   - `AUTOMATION_INTERVAL_MS` (optional, defaults to 5 minutes)
   - `AUTOMATION_RESTART_DELAY_MS` (optional, defaults to 10 seconds)
   - `AUTOMATION_DISABLED` (set to `1` to opt-out of the background worker)
3. **Prisma client + schema**
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. **Run locally**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 – unauthenticated visitors see the marketing hero, authenticated users drop into the dashboard shell.

## Core domains
- **Auth & security** – NextAuth 5 beta + Prisma adapter (GitHub OAuth), AES-256-GCM encryption helpers, bcrypt-hashed API keys, token-bucket rate limiting, and hardened middleware/CSP defaults.
- **Services** – each feature has a dedicated module under `src/lib/services/*` (expenses, analytics, recurring, income, categories, imports, API keys, feed). All Prisma queries are user-scoped.
- **Analytics** – `analytics-service` powers cash series, CSV export, forecast/anomaly detection, category health, scenario simulation, and income-flow graph data.
- **Automation** – a Node child process runs the recurring materialization loop (configurable via `AUTOMATION_INTERVAL_MS`) so income/expense instances stay fresh even when no one is signed in, and it revokes expired API keys automatically. Import schedules (Prisma `ImportSchedule`) store template/frequency metadata and expose `/api/import/schedules` CRUD endpoints.
- **Data ingest** – CSV routes now support preview (`/api/import/preview`), structured JSON import (`/api/import/rows`), bank templates, inline edits, bulk edit bar, and scheduled reminders, all surfaced in `/import`.
- **UX shell** – `DashboardShell` adds quick actions, mobile pills, and command palette. `/feed` renders a unified timeline. `/settings` syncs default currency plus accent color. Smart suggestions power `/items`.

## API additions
| Endpoint | Method(s) | Scope | Notes |
|----------|-----------|-------|-------|
| `/api/analytics/forecast` | GET | `analytics_read` | Moving-average net forecast.
| `/api/analytics/anomalies` | GET | `analytics_read` | Category z-score alerts.
| `/api/analytics/category-health` | GET | `analytics_read` | Baseline vs actual shares.
| `/api/analytics/income-flow` | GET | `analytics_read` | Sankey graph data.
| `/api/analytics/scenario` | POST | `analytics_read` | Budget simulation.
| `/api/feed` | GET | `analytics_read` | Activity timeline export.
| `/api/import/preview` | POST (session) | – | CSV preview only.
| `/api/import/rows` | POST (session) | – | Import edited rows.
| `/api/import/schedules` | GET/POST (session) | – | Schedule CRUD + `/run` action.
| `/api/expenses/suggest-category` | GET | `expenses_read` | Smart category hints.
| `/api/categories` | GET | `expenses_read` | List categories (auto-creates defaults).
| `/api/categories` | POST | `expenses_write` | Create/update categories by id.
| `/api/settings` | PATCH (session) | – | Update currency + accent color.

All endpoints still respect API keys + scopes (see `src/lib/api-auth.ts`) and rate limiting (120 req/min default). Session-only routes guard file uploads and user settings.

## Frontend architecture
- **Dashboard** – `DashboardShell` + cards (`MonthlyOverviewCard`, `QuickStats`, `CashHistoryChart`, `ExpenseFeed`, `OnboardingChecklist`). Feed/analytics/pages reuse the same shell.
- **Analytics** – Client dashboard consumes new APIs for time ranges, insight widgets (forecast, category health, scenario planner, Sankey, anomaly list).
- **Import** – `CsvImportForm`, `ImportPreviewTable`, and `ImportScheduleManager` compose the data-ingest workspace.
- **Settings** – `UserSettingsForm` persists currency + accent and updates CSS custom properties on the fly.
- **Command palette** – built with Radix dialog primitives and shadcn inputs (`⌘/Ctrl + K`).

## Development tips
- Use service helpers for all DB access; UI/route files stay thin and call services.
- Keep encrypted fields serialized via `serializeEncrypted` before writing.
- Add new API endpoints under `src/app/api/*`, leveraging `authenticateRequest` + `handleApiError` for consistent auth/rate-limit responses.
- Tailwind v4 runs via `@theme inline`; custom colors live in `src/app/globals.css` (including `--user-accent`).

## Troubleshooting
- **`@prisma/client did not initialize`** – run `npx prisma generate` after editing `schema.prisma`.
- **`public.Session` missing** – run `npx prisma db push` so NextAuth tables exist.
- **`UnknownAction` during GitHub login** – ensure CTAs point to `/api/auth/signin?provider=github` and restart `next dev` after dependency changes.
- **Lint script** – `next lint` is no longer bundled with Next 16; the `npm run lint` script currently errors with “Invalid project directory …/lint”. Replace with a custom ESLint config or remove the script if unused.

See `AGENTS.md` for the exhaustive architectural brief, flows, and verification checklist.
