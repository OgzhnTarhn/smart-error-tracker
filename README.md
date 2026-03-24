# Smart Error Tracker

Smart Error Tracker is a Sentry-inspired error monitoring platform for modern TypeScript applications. It combines a NestJS ingest API, a React dashboard, and lightweight Node.js and browser SDKs so teams can create a project, connect an SDK, capture runtime failures, group them into actionable issues, and investigate them from one place.

## Highlights

- Guided dashboard onboarding flow: `Dashboard -> Create Project -> Project Setup -> Issues`
- Browser and Node.js SDKs for automatic capture, manual reporting, and Express middleware integration
- Project-scoped API keys for ingestion and dashboard access
- Fingerprint-based issue grouping to collapse repeated failures into a single investigation unit
- Issue lifecycle controls with `open`, `resolved`, and `ignored` states
- Automatic regression reopening when a resolved issue appears again
- Event-level investigation with stack traces, structured context, raw payloads, release, environment, and SDK metadata
- Source map resolution for minified frontend stack traces
- Optional AI-assisted analysis, prevention insights, and fix memory when `GEMINI_API_KEY` is configured
- Demo applications for end-to-end local validation

## Architecture

```text
Browser / Node application
        |
        v
Smart Error Tracker SDK
        |
        v
NestJS ingest API
        |
        +--> API key validation
        +--> payload validation and rate limiting
        +--> fingerprint-based grouping
        +--> optional source-map and AI enrichment
        |
        v
    PostgreSQL
        |
        v
 React dashboard
```

## Current Status

- The issue list and issue detail flows are backed by the live API and database.
- The main dashboard is now productized around project creation, setup guidance, and a cleaner first-run experience.
- Authenticated workspace sessions can create projects, rotate API keys, manage project members, and edit account details from the dashboard.
- A notifications workspace is available for regressions, open-issue pressure, and release or environment hotspots derived from live analytics.
- Local-only admin endpoints still exist as an optional development fallback.

## Dashboard Flow

The intended first-run path is:

```text
/dashboard
    -> /projects
    -> /projects/new
    -> /projects/:id/setup
    -> /projects/:id/issues
```

Primary routes:

| Route | Purpose |
| --- | --- |
| `/dashboard` | Welcome page with summary metrics, onboarding checklist, and recent issue preview |
| `/projects` | Project listing with setup and issues entry points |
| `/projects/new` | Minimal create-project form |
| `/projects/:id/setup` | Guided onboarding with install, init, API key, and test-event steps |
| `/projects/:id/issues` | Project-aware bridge into the issues workspace |
| `/issues` | Main live issue list for the currently connected dashboard project |
| `/issues/:id` | Issue detail and investigation workspace |
| `/notifications` | Derived alert feed for regressions, triage pressure, and hotspots |
| `/settings` | Workspace settings, connection details, and next actions |
| `/profile` | Account profile and password management |

## Repository Layout

| Path | Purpose |
| --- | --- |
| `apps/api` | NestJS API for ingestion, grouping, project/key management, source maps, and AI enrichment |
| `apps/web` | React + Vite dashboard for onboarding, project management, issue list, and issue detail workflows |
| `apps/demo-api` | Express demo application using the Node SDK |
| `apps/demo-web` | Browser demo application using the browser SDK |
| `packages/sdk-node` | Node.js SDK with manual capture, global handlers, and Express error middleware |
| `packages/sdk-browser` | Browser SDK with automatic global capture and manual reporting |
| `infra/docker-compose.yml` | Local PostgreSQL service definition |

## Quick Start

### Prerequisites

- Node.js LTS
- `pnpm` 10+
- Docker

### 1. Install workspace dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL

```bash
docker compose -f infra/docker-compose.yml up -d
```

The bundled Compose file provisions PostgreSQL 16 on `localhost:5432` with:

- database: `set_db`
- username: `set_user`
- password: `set_pass`

### 3. Configure the API

Create `apps/api/.env`:

```dotenv
DATABASE_URL="postgresql://set_user:set_pass@localhost:5432/set_db"
ADMIN_TOKEN="dev-admin-token"
INGEST_RATE_LIMIT_MAX=60
INGEST_RATE_LIMIT_WINDOW_MS=60000

# Optional: enables AI analysis endpoints
# GEMINI_API_KEY="your-key"
```

### 4. Prepare the database schema

```bash
cd apps/api
npx prisma generate
npx prisma migrate deploy
```

For fast local iteration, `npx prisma db push` can be used instead of `migrate deploy`.

### 5. Create a local project and API key

Still in `apps/api`, run:

```bash
pnpm exec ts-node -r tsconfig-paths/register scripts/seed.ts demo default
```

The script prints:

- a project id
- a project key
- a raw API key

Keep the API key. It is only shown once and is required by the dashboard and SDKs.

You can also create projects directly from the dashboard after signing in with a member account.

### 6. Configure the dashboard

Create `apps/web/.env.local`:

```dotenv
VITE_API_BASE_URL="http://localhost:3000"

# Optional: connects the dashboard to a project immediately
# VITE_API_KEY="set_your_generated_api_key"

# Optional: enables legacy local-only `/admin/*` fallback endpoints
# VITE_ADMIN_TOKEN="dev-admin-token"
```

Notes:

- `VITE_API_KEY` is optional. Without it, the dashboard still loads and guides the user through project creation and setup.
- `VITE_ADMIN_TOKEN` is optional. Member sessions can already create projects and rotate API keys through authenticated workspace endpoints.
- `VITE_ADMIN_TOKEN` is only useful if you want to exercise the legacy local-only `/admin/*` development endpoints.
- You can paste or generate a project API key from the setup flow to switch the browser workspace without rebuilding the frontend.

### 7. Run the core services

Open two terminals from the repository root:

```bash
pnpm --filter api start:dev
```

```bash
pnpm --filter web dev
```

Defaults:

- API: `http://localhost:3000`
- Dashboard: `http://localhost:5173`

The API currently allows CORS from `http://localhost:*` during local development.

### 8. Walk the onboarding flow

Once the dashboard is running:

1. Open `/dashboard`
2. Create a project from `/projects/new`
3. Continue to `/projects/:id/setup`
4. Copy the SDK snippet and API key
5. Send a test event
6. Open `/projects/:id/issues` or `/issues`

## Running the Demo Apps

The demos are useful for generating realistic traffic and verifying the SDKs end to end.

Create `apps/demo-api/.env`:

```dotenv
API_BASE_URL="http://localhost:3000"
API_KEY="set_your_generated_api_key"
ENVIRONMENT="local"
RELEASE="demo-api@0.0.0"
PORT=4000
```

Create `apps/demo-web/.env.local`:

```dotenv
VITE_API_BASE_URL="http://localhost:3000"
VITE_API_KEY="set_your_generated_api_key"
VITE_ENVIRONMENT="local"
VITE_RELEASE="demo-web@0.0.0"
```

Then start them from the repo root:

```bash
pnpm --filter demo-api dev
pnpm --filter demo-web dev
```

The demo API exposes routes such as `/error`, `/reject`, `/manual`, and `/message` to generate test events.

## SDK Integration

### Browser SDK

```ts
import { init, installGlobalHandlers } from '@smart-error-tracker/browser';

init({
  baseUrl: 'http://localhost:3000',
  apiKey: 'set_your_generated_api_key',
  environment: 'production',
  release: 'web@1.2.3',
});

installGlobalHandlers();
```

### Node.js SDK

```ts
import express from 'express';
import {
  init,
  installGlobalHandlers,
  expressErrorHandler,
} from '@smart-error-tracker/node';

init({
  baseUrl: 'http://localhost:3000',
  apiKey: 'set_your_generated_api_key',
  environment: 'production',
  release: 'api@1.2.3',
});

installGlobalHandlers();

const app = express();
app.use(expressErrorHandler());
```

For the full SDK APIs, DSN mode, and advanced usage, see:

- `packages/sdk-browser/README.md`
- `packages/sdk-node/README.md`

## Configuration Reference

### API

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma |
| `ADMIN_TOKEN` | No | Enables local-only `/admin/*` management endpoints via `x-admin-token` |
| `GEMINI_API_KEY` | No | Enables AI analysis for `POST /events/:id/analyze` |
| `INGEST_RATE_LIMIT_MAX` | No | Max ingest requests per window, default `60` |
| `INGEST_RATE_LIMIT_WINDOW_MS` | No | Rate-limit window in milliseconds, default `60000` |

### Dashboard

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | No | API base URL, defaults to `http://localhost:3000` |
| `VITE_API_KEY` | No | Project API key sent as `x-api-key` for dashboard requests |
| `VITE_ADMIN_TOKEN` | No | Enables legacy local-only `/admin/*` fallback flows for development |

## Development Commands

```bash
pnpm lint
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter web build
pnpm --filter @smart-error-tracker/node build
pnpm --filter @smart-error-tracker/browser build
```

`pnpm dev` is also available at the workspace root, but it runs every package `dev` script, including demos and SDK watchers. In practice, filtered commands are usually easier to manage.

## Notes

- Most API and dashboard issue routes are project-scoped through the `x-api-key` header.
- The dashboard can boot without a connected API key and then connect later from the onboarding flow.
- Source map resolution expects `.map` files to be reachable by the API server.
- Admin endpoints are intentionally disabled in production mode.
- Package-level notes are available in `apps/api/README.md`, `apps/web/README.md`, and the SDK READMEs.

## Roadmap

- Alerting and notification channels
- Webhook and third-party integrations
- Deeper analytics and release health reporting
- Session replay
- Error rate and stability monitoring
