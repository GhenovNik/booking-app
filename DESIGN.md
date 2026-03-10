# FareTicketHunter — Design Document

**Version:** 1.0 | **Date:** 2026-03-10 | **Author:** Nikolay Genov

> Single source of truth for requirements, architecture, and development plan.
> Updated from scratch after reviewing the original v0.4 doc.

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [Deploy Strategy](#2-deploy-strategy)
3. [Tech Stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [Functional Requirements](#5-functional-requirements)
6. [Two Search Modes](#6-two-search-modes)
7. [Data Model](#7-data-model)
8. [Internal API Routes](#8-internal-api-routes)
9. [Telegram Bot](#9-telegram-bot)
10. [Turkish Airlines API](#10-turkish-airlines-api)
11. [Configuration (.env)](#11-configuration-env)
12. [Repository Structure](#12-repository-structure)
13. [Development Roadmap](#13-development-roadmap)
14. [Risks & Assumptions](#14-risks--assumptions)

---

## 1. Project Summary

**Problem:** Turkish Airlines promotional ("Best Deal") fares appear and disappear quickly. Manual monitoring is impractical.

**Solution:** A personal web app + Telegram bot that:
- Watches selected routes and date ranges
- Polls the official TA API on a schedule
- Stores price history
- Notifies via Telegram when a price meets configured alert rules
- Shows a price heatmap matrix in a web UI

**Target users:** Personal use + close friends/family (≤ 10 people). Not a SaaS product.

**Known constraints:**
- TA API response format TBD (requires hands-on discovery once API key obtained)
- MVP: up to ~10 active watches per instance
- Rate limit: respect TA API quotas (likely 2 req/day on free tier)

---

## 2. Deploy Strategy

Two supported environments from the same codebase, switched via env vars:

| Environment | Primary use | Scheduling | Database |
|-------------|-------------|------------|----------|
| **Docker (local)** | Daily use, full control | `node-cron` in-process | PostgreSQL container |
| **Vercel** | Fallback / cloud backup | Vercel Cron Jobs → `/api/cron/fetch` | Neon or Supabase (free tier) |

The app is designed so that only env vars differ between environments — no code branches for deployment target.

**Docker Compose services:**
```
services:
  app       — Next.js (port 3000)
  postgres  — PostgreSQL 16
  (no Redis, no separate worker)
```

---

## 3. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 14 App Router (TypeScript) | Works on Docker + Vercel; API routes = backend; no separate server |
| **Database** | PostgreSQL 16 | Reliable, JSONB for raw API responses, good history queries |
| **ORM** | Drizzle ORM | Lightweight TypeScript-native ORM; type-safe queries; easy migrations |
| **Telegram** | Grammy (TypeScript) | Modern, type-safe, webhook-native; works on both Docker and Vercel |
| **Scheduling** | `node-cron` (Docker) / Vercel Cron (cloud) | Both call the same `/api/cron/fetch` endpoint |
| **HTTP Client** | `fetch` (native) + `p-retry` | Native, no extra deps; retry/backoff for TA API calls |
| **Auth** | Custom middleware + bcrypt | Single password stored in env; no auth framework overhead |
| **Styling** | Tailwind CSS | Fast, utility-first, no CSS files to maintain |
| **Charts** | Recharts | Lightweight, React-native, good for heatmaps and line charts |
| **Validation** | Zod | Schema validation for API inputs and TA API responses |

**What was removed from v0.4 and why:**

| Removed | Why |
|---------|-----|
| Celery + Redis | 2 extra containers for a 10-user app; APScheduler/node-cron is sufficient |
| Playwright scraper | ToS risk, brittle, TA official API is the right path |
| FastAPI (separate backend) | Redundant when Next.js API routes handle everything |
| `node-postgres` direct | Drizzle gives type-safety with minimal overhead |
| Kafka | Premature optimization; not needed at any foreseeable scale |

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Next.js 14 App Router                  │
│                                                         │
│  /app/*                                                 │
│    ├── Dashboard (watches list + status)                │
│    ├── Watch detail (price matrix heatmap + history)    │
│    └── Settings (alert rules, intervals)                │
│                                                         │
│  /api/*                                                 │
│    ├── /api/watches          — CRUD watches             │
│    ├── /api/prices           — matrix & history         │
│    ├── /api/cron/fetch       — scheduled price check    │
│    └── /api/telegram/webhook — bot command handler      │
└────────────┬─────────────────────────┬──────────────────┘
             │                         │
      PostgreSQL                  TA Official API
   (local / Neon)             (getAvailability etc.)
             │                         │
             └─────────────────────────┘
                         │
                  Telegram Bot API
              (notifications + commands)
```

**Request flow — scheduled price check:**
```
[Cron trigger]
  → POST /api/cron/fetch (with CRON_SECRET header)
  → For each active watch:
      → Call TA getAvailability (with retry/backoff)
      → Parse response via TA adapter (maps to internal schema)
      → Upsert price_snapshots in DB
      → Evaluate alert rules against new prices
      → If triggered: send Telegram message + insert notification record
```

**Request flow — Telegram command:**
```
Telegram servers → POST /api/telegram/webhook (Grammy handler)
  → Authenticate (Telegram secret token)
  → Route to command handler
  → Read/write DB as needed
  → Reply to user
```

---

## 5. Functional Requirements

| ID | Description | Priority |
|----|-------------|----------|
| F-01 | Create/edit/delete a watch with origin, destination, mode, pax, cabin, interval | must |
| F-02 | Two search modes: fixed date pair OR flexible date range | must |
| F-03 | Poll TA API on configurable schedule (per-watch interval) | must |
| F-04 | Store price history (all snapshots, raw JSON kept) | must |
| F-05 | Alert rules: absolute max price OR % drop from baseline | must |
| F-06 | Telegram push notification when rule triggered (no duplicate alerts) | must |
| F-07 | Web UI: dashboard with all watches and latest prices | must |
| F-08 | Web UI: price matrix heatmap (outbound × inbound dates) | must |
| F-09 | Web UI: price history chart (min price over time) | must |
| F-10 | Telegram bot commands: list, pause, resume, status | must |
| F-11 | Single-password auth on web UI | must |
| F-12 | Airport IATA autocomplete (from TA Port List API, cached 24h) | should |
| F-13 | Telegram: create/manage watches interactively via bot | should |
| F-14 | One-way trip support (no return date) | should |
| F-15 | Per-watch Telegram subscribers (notify specific chat IDs) | could |
| F-16 | ML "buy / wait" advisor | stretch |

---

## 6. Two Search Modes

### Mode A — Fixed Date

User specifies exact departure and return dates. The system checks that specific date pair on each scheduled run.

```
Example: IST → AMS, depart 2026-05-10, return 2026-05-17, 1 pax Economy
```

Use case: "I know I want to fly these exact dates, just wait for the price to drop."

### Mode B — Flexible Range

User specifies a window for departure and a window for return. The system retrieves the full price matrix for those windows and finds the cheapest combination(s).

```
Example: IST → AMS
  Depart: anywhere between 2026-05-08 and 2026-05-14
  Return: anywhere between 2026-05-15 and 2026-05-22
  → Returns 7×8 = 56 date combinations, alert on cheapest
```

Use case: "I'm flexible on exact dates, just find the cheapest option in this period."

**Implementation note:** The TA `getAvailability` endpoint likely supports a date range natively. Exact request/response schema must be confirmed during API key setup (see Section 10).

---

## 7. Data Model

> Schema defined with Drizzle ORM. Types are auto-generated from schema.

### `watches`
```typescript
{
  id:               serial primaryKey
  name:             text notNull                    // display name, e.g. "IST→AMS May"
  origin:           char(3) notNull                 // IATA code
  destination:      char(3) notNull
  mode:             enum('fixed', 'flexible') notNull
  // Fixed mode
  dep_date:         date nullable
  ret_date:         date nullable                   // null = one-way
  // Flexible mode
  dep_from:         date nullable
  dep_to:           date nullable
  ret_from:         date nullable
  ret_to:           date nullable                   // null = one-way
  // Common
  pax:              smallint default 1
  cabin:            enum('ECONOMY','BUSINESS','FIRST') default 'ECONOMY'
  fetch_interval_h: int default 12                  // hours between checks
  is_active:        boolean default true
  last_checked_at:  timestamptz nullable
  created_at:       timestamptz defaultNow()
}
```

### `alert_rules`
```typescript
{
  id:        serial primaryKey
  watch_id:  int references watches(id) onDelete cascade
  type:      enum('absolute_max', 'percent_drop')
  // absolute_max: trigger when price ≤ value
  // percent_drop: trigger when price ≤ (baseline * (1 - value/100))
  value:     numeric(10,2) notNull
  currency:  char(3) default 'EUR'
  is_active: boolean default true
}
```

### `price_snapshots`
```typescript
{
  id:            bigserial primaryKey
  watch_id:      int references watches(id) onDelete cascade
  checked_at:    timestamptz defaultNow()
  outbound_date: date notNull
  inbound_date:  date nullable                  // null = one-way
  price:         numeric(10,2) notNull
  currency:      char(3) notNull
  is_promo:      boolean default false          // "Best Deal" flag if API provides it
  raw:           jsonb notNull                  // full API response cell for this date pair
}
```

### `notifications`
```typescript
{
  id:          bigserial primaryKey
  watch_id:    int references watches(id)
  rule_id:     int references alert_rules(id)
  snapshot_id: bigint references price_snapshots(id)
  sent_at:     timestamptz defaultNow()
  chat_id:     text notNull                     // Telegram chat ID that received it
  price:       numeric(10,2) notNull
  message_id:  text nullable                    // Telegram message ID for dedup
}
```

### `port_cache`
```typescript
{
  iata_code:  char(3) primaryKey
  name:       text notNull
  city:       text
  country:    char(2)
  updated_at: timestamptz defaultNow()
}
```

### Key indexes
```sql
-- Fast lookup of latest prices per watch
CREATE INDEX ON price_snapshots (watch_id, outbound_date, inbound_date, checked_at DESC);

-- Find next watches to check (scheduler query)
CREATE INDEX ON watches (is_active, last_checked_at) WHERE is_active = true;

-- Dedup notifications
CREATE UNIQUE INDEX ON notifications (watch_id, rule_id, outbound_date, inbound_date)
  -- partial: within last 24h (enforced in app logic, not DB)
```

---

## 8. Internal API Routes

### Watch management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/watches` | List all watches with latest price |
| POST | `/api/watches` | Create watch |
| GET | `/api/watches/[id]` | Get watch detail |
| PATCH | `/api/watches/[id]` | Update watch (settings, is_active) |
| DELETE | `/api/watches/[id]` | Delete watch and all snapshots |

### Prices

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/prices/[watchId]/matrix` | Price matrix (outbound × inbound, latest snapshot) |
| GET | `/api/prices/[watchId]/history` | Min price over time (for chart) |

### Cron

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/cron/fetch` | Run a price check cycle. Protected by `CRON_SECRET` header. Called by Vercel Cron or local node-cron. |
| POST | `/api/cron/fetch/[watchId]` | Manually trigger check for one watch |

### Telegram

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/telegram/webhook` | Grammy webhook handler. Validates Telegram secret token. |

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Verify password, set HTTP-only session cookie |
| POST | `/api/auth/logout` | Clear session |

### Airports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/airports?q=ams` | Search port_cache, trigger refresh if stale |

---

## 9. Telegram Bot

### Notification format

```
✈️ IST → AMS  |  Flexible (May 8–14)
📅 Depart: 10 May → Return: 18 May
💰 €189 (↓ 32% from baseline)
🔗 [Book now](https://turkishairlines.com/...)

Watch: "IST→AMS May" | Rule: ≤ €200
```

Dedup: a notification for the same watch + date pair is not resent within 24 hours unless the price drops further.

### Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message, instructions |
| `/list` | Show all watches with current best price and status |
| `/status` | System health: last run time, next run, DB status |
| `/pause <id>` | Pause a watch (stops scheduled checks) |
| `/resume <id>` | Resume a paused watch |
| `/delete <id>` | Delete a watch (asks for confirmation) |
| `/check <id>` | Trigger immediate price check for one watch |
| `/new` | Interactive flow to create a new watch (step-by-step) |
| `/rules <id>` | Show/edit alert rules for a watch |
| `/history <id>` | Send a text summary of price history |

### `/new` interactive flow (Grammy scenes)

```
Bot: "Choose mode:"
  [Fixed dates]  [Flexible range]

→ Fixed:
  "Enter origin (IATA):" → validate → "Enter destination:" → ...
  "Enter departure date (YYYY-MM-DD):" → optional return date
  "Max price alert (EUR):" → optional
  → Confirm → Create

→ Flexible:
  "Enter origin:" → "Enter destination:" →
  "Depart window: from (YYYY-MM-DD):" → "to:" →
  "Return window: from:" → "to:" →
  "Max price alert (EUR):" → optional
  → Confirm → Create
```

---

## 10. Turkish Airlines API

> **Status:** API key not yet obtained. Schema below is based on TA Developer Portal documentation. Must be verified with real responses before building the adapter.

### Known endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/getAvailability` | POST | Price matrix for a route + date(s) |
| `/getTimetable` | POST | Flight schedule (used to skip days with no flights) |
| `/getPortList` | GET | Airport/city lookup |

### Request headers (all endpoints)
```
x-api-key: <TA_API_KEY>
Content-Type: application/json
```

### Assumed request body (`getAvailability`)
```json
{
  "scheduledFlightModel": {
    "originAirportCode": "IST",
    "destinationAirportCode": "AMS",
    "departureDate": "2026-05-10",     // or a range — TBC
    "returnDate": "2026-05-17",
    "passengerTypeCode": "ADULT",
    "passengerCount": 1,
    "cabin": "ECONOMY"
  }
}
```

### Adapter pattern

All TA API interaction goes through a single module `lib/ta-api/`:

```
lib/ta-api/
  client.ts        — fetch wrapper with retry (p-retry), rate limit, logging
  adapter.ts       — maps raw TA response → internal PriceCell[]
  schemas.ts       — Zod schemas for raw response validation
  types.ts         — internal types (PriceCell, FlightMatrix, etc.)
```

This isolates the rest of the app from TA API changes. If the API response format changes, only `adapter.ts` needs updating.

### Internal `PriceCell` type
```typescript
interface PriceCell {
  outboundDate: string       // "2026-05-10"
  inboundDate:  string | null
  price:        number
  currency:     string       // "EUR"
  isPromo:      boolean
  raw:          unknown      // original JSON stored as-is
}
```

### Rate limiting strategy
- `TA_RATE_LIMIT_PER_MIN` env var (default: 50)
- Token bucket in-process (sufficient for personal scale)
- Exponential backoff on 429/503 (p-retry: 3 attempts, starting at 1s)
- Circuit breaker: after 5 consecutive failures, mark TA API as unavailable for 30 min, skip checks

---

## 11. Configuration (.env)

```bash
# Turkish Airlines API
TA_API_KEY=
TA_API_BASE=https://api.turkishairlines.com
TA_RATE_LIMIT_PER_MIN=50

# Database
DATABASE_URL=postgresql://user:password@postgres:5432/faretickethunter

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=        # Random string, sent in X-Telegram-Bot-Api-Secret-Token
TELEGRAM_ALLOWED_CHAT_IDS=      # Comma-separated list of allowed chat IDs

# Auth (web UI)
AUTH_PASSWORD_HASH=              # bcrypt hash of the single password
AUTH_SESSION_SECRET=             # Random string for session signing

# Scheduling
CRON_SECRET=                     # Header secret for /api/cron/fetch
CRON_SCHEDULE="0 */12 * * *"     # node-cron expression (Docker only)

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Vercel Cron (leave empty for Docker)
# Set CRON_SECRET to the same value in Vercel environment
```

---

## 12. Repository Structure

```
booking-app/
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (protected)/
│   │   │   ├── layout.tsx           # auth middleware check
│   │   │   ├── page.tsx             # Dashboard
│   │   │   └── watches/
│   │   │       ├── [id]/page.tsx    # Watch detail (matrix + history)
│   │   │       └── new/page.tsx     # Create watch form
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   └── logout/route.ts
│   │       ├── watches/
│   │       │   ├── route.ts         # GET /api/watches, POST /api/watches
│   │       │   └── [id]/route.ts   # GET / PATCH / DELETE
│   │       ├── prices/
│   │       │   └── [watchId]/
│   │       │       ├── matrix/route.ts
│   │       │       └── history/route.ts
│   │       ├── airports/route.ts
│   │       ├── cron/
│   │       │   └── fetch/
│   │       │       ├── route.ts     # POST (all watches)
│   │       │       └── [id]/route.ts
│   │       └── telegram/
│   │           └── webhook/route.ts
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts            # Drizzle schema
│   │   │   ├── index.ts             # DB connection
│   │   │   └── migrations/
│   │   ├── ta-api/
│   │   │   ├── client.ts
│   │   │   ├── adapter.ts
│   │   │   ├── schemas.ts
│   │   │   └── types.ts
│   │   ├── scheduler/
│   │   │   └── index.ts             # node-cron setup (Docker only)
│   │   ├── telegram/
│   │   │   ├── bot.ts               # Grammy bot instance
│   │   │   └── commands/            # one file per command
│   │   ├── alerts/
│   │   │   └── evaluate.ts          # rule evaluation logic
│   │   └── auth.ts                  # session helpers
│   └── components/
│       ├── PriceMatrix.tsx          # heatmap grid
│       ├── PriceHistory.tsx         # line chart
│       └── WatchCard.tsx
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── drizzle.config.ts
├── DESIGN.md                        # this file
└── package.json
```

---

## 13. Development Roadmap

| Phase | Tasks | Notes |
|-------|-------|-------|
| **0 — Foundation** | Docker Compose, Dockerfile, `.env.example`, Drizzle setup, DB migrations, basic middleware auth | Can start immediately |
| **1 — TA API discovery** | Get API key, explore real responses, write Zod schemas + adapter | **Blocks phases 2–4** |
| **2 — Core backend** | CRUD watches, price fetch logic, alert evaluation, cron endpoint | Needs phase 1 |
| **3 — Telegram bot** | Grammy webhook, notifications, all commands, `/new` flow | Can parallel with phase 2 |
| **4 — Web UI** | Dashboard, watch detail, price matrix heatmap, history chart | Needs phase 2 |
| **5 — Polish** | Airport autocomplete, dedup notifications, circuit breaker, error pages | After all core done |
| **6 — Deploy** | Docker production Dockerfile, optional Vercel config, health check endpoint | Last |

**Phase 0 can start today** — it requires no TA API knowledge.
**Phase 1 is the main unknown** — once the real API response format is clear, the rest falls into place quickly.

---

## 14. Risks & Assumptions

| # | Risk | Mitigation |
|---|------|-----------|
| R-01 | TA API response format differs from docs | Adapter pattern isolates impact; store raw JSON always |
| R-02 | TA API rate limits are tighter than expected | Configurable interval, delta-fetching, respect 429 with backoff |
| R-03 | TA API requires more auth than an API key | Investigate developer portal; may need OAuth flow |
| R-04 | node-cron doesn't fire in Next.js serverless | Only relevant for Vercel; use Vercel Cron in that case |
| R-05 | Telegram bot webhook fails on local Docker | Use `ngrok` for local dev, proper URL on VPS |
| A-01 | TA API is accessible without corporate account | Unverified — check developer.turkishairlines.com |
| A-02 | Price matrix can be fetched for a date range in one call | If not, need multiple calls per watch |
| A-03 | Prices are in EUR or USD (not always TRY) | Currency display must be flexible |
