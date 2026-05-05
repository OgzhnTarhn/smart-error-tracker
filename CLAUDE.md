# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
# Start all packages in dev mode
pnpm dev

# Start individual packages
pnpm --filter api start:dev        # NestJS API on port 3000
pnpm --filter web dev              # Vite dashboard on port 5173
pnpm --filter demo-api start       # Express demo app on port 4000
pnpm --filter demo-web dev         # Browser demo app

# Infrastructure
docker compose -f infra/docker-compose.yml up -d   # PostgreSQL 16
```

### Build

```bash
pnpm --filter api build
pnpm --filter web build
pnpm --filter @smart-error-tracker/node build       # tsup ESM + CJS
pnpm --filter @smart-error-tracker/browser build
```

### Test & Lint

```bash
pnpm --filter api test             # Jest unit tests
pnpm --filter api test:e2e         # e2e tests
pnpm --filter api test:cov         # coverage
pnpm lint                          # ESLint across all packages
pnpm --filter web lint
```

### Database

```bash
# From apps/api
pnpm prisma migrate dev            # Apply migrations
pnpm prisma studio                 # Database GUI
pnpm prisma generate               # Regenerate Prisma client after schema changes
```

## Architecture

This is a pnpm monorepo (`pnpm-workspace.yaml`) with two apps and two SDK packages.

### Package Layout

| Package | Role | Port |
|---------|------|------|
| `apps/api` | NestJS REST API — ingestion, grouping, auth, dashboard | 3000 |
| `apps/web` | React/Vite dashboard | 5173 |
| `apps/demo-api` | Express app that sends test events via Node SDK | 4000 |
| `apps/demo-web` | React app that sends test events via Browser SDK | — |
| `packages/sdk-node` | Zero-dependency Node.js capture SDK | — |
| `packages/sdk-browser` | Zero-dependency browser capture SDK | — |

### Data Flow

```
Browser/Node SDK
  → POST /events  (x-api-key: <project key>)
  → NestJS EventsModule  (rate limit → validate → fingerprint → upsert ErrorGroup)
  → PostgreSQL

React Dashboard
  → GET /workspace/projects, /issues, /events
  → Authorization: Bearer <session token>  OR  x-api-key for project-scoped reads
```

### Prisma Schema (core tables)

```
User → ProjectMembership → Project
                            ↓
                        ErrorGroup (fingerprint, status, regression)
                            ↓
                         Event (payload, AI analysis, timestamps)
Project → ApiKey  (prefix: set_)
User    → Session (Bearer token, 7-day / 12-hour TTL for demo)
```

### Error Grouping

Events are grouped by fingerprint: `${source}|${route}|${normalizedMessage}|${topFrame}`. Normalization strips dynamic values (numbers → `<n>`, hex IDs → `<hex>`, UUIDs → `<id>`). Same fingerprint = same `ErrorGroup`; regression is detected when a resolved group receives a new event.

### Authentication

- **Member**: email/password (scrypt), session stored in `Session` table, Bearer token in `Authorization` header
- **Demo**: passwordless, single shared account, 12-hour sessions
- Frontend: `AuthContext` (`apps/web/src/context/`) persists session in `localStorage` and exposes `useAuth()`
- API ingestion uses `x-api-key` (the project's `ApiKey`), not the user session

### API Module Structure (`apps/api/src/`)

- `auth/` — login, register, session management
- `events/` — ingest controller, grouping logic, AI analysis via Gemini (optional)
- `workspace/` — project CRUD, membership, API key rotation
- `dashboard/` — aggregated stats
- `source-maps/` — resolves minified browser frames to original source
- `common/` — rate-limit guard, global exception filter
- `admin/` — local-dev-only endpoints (disabled in production)

### SDK Architecture (`packages/sdk-*/src/`)

Both SDKs share the same public API: `init()`, `captureException()`, `captureMessage()`, `installGlobalHandlers()`. Internal modules: `transport.ts` (HTTP send), `dedupe.ts` (client-side dedup within `dedupeIntervalMs`), `utils.ts` (DSN parsing, error normalisation). Built as dual ESM + CJS by tsup.

### Environment Variables

**`apps/api/.env`**
```
DATABASE_URL=postgresql://user:pass@localhost:5432/smart_error_tracker
ADMIN_TOKEN=dev-admin-token         # optional, enables /admin routes
GEMINI_API_KEY=...                  # optional, enables AI analysis
INGEST_RATE_LIMIT_MAX=60
INGEST_RATE_LIMIT_WINDOW_MS=60000
```

**`apps/web/.env.local`**
```
VITE_API_BASE_URL=http://localhost:3000
VITE_API_KEY=set_xxx                # optional default project key
VITE_ADMIN_TOKEN=dev-admin-token    # optional
```
