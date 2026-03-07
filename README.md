# Smart Error Tracker

Smart Error Tracker is a Sentry-like error tracking system for modern web and backend applications.

It is designed to:
- ingest application errors from multiple runtimes
- group related errors into actionable issues
- accelerate debugging with stack, context, and raw event inspection

## Project Overview

This repository is a production-style monorepo prototype that includes:
- a NestJS ingest and issue management API
- a React dashboard for triage and investigation
- Node and Browser SDK packages
- demo apps for integration scenarios

## Architecture

High-level flow:

```text
Application (Browser / Node)
  ->
SDK
  ->
Ingest API (NestJS)
  ->
Fingerprint grouping
  ->
PostgreSQL
  ->
React Dashboard
```

## Core Features

- Event ingestion pipeline  
  Errors are captured via Browser and Node SDKs and sent to the ingest API.

- Issue grouping  
  Similar events are grouped by fingerprint into a single issue.

- Issue lifecycle management  
  Issues support `open`, `resolved`, and `ignored` states.

- Regression detection  
  If a `resolved` issue receives a matching event again, it is automatically reopened and marked as regression.

- Event drill-down  
  Every issue exposes a latest-events list with selectable event detail.

- Stack trace viewer  
  Stack traces are displayed in a readable monospace viewer.

- Context inspection  
  Event context is visible in structured form.

- Raw payload viewer  
  Raw event JSON can be inspected directly.

- Source map resolution  
  Minified frames can be resolved to original source locations.

- AI error analysis  
  Event-based AI analysis can generate root-cause and fix suggestions.

## Dashboard

The Overview dashboard includes:
- Total events
- Total issues
- Open issues
- Resolved issues
- Ignored issues

It also shows:
- 7-day event trend chart
- Top issues list by event count

## Issue Lifecycle

Issue status flow:
- `open` -> active issue
- `resolved` -> fixed/closed
- `ignored` -> intentionally muted

Manual actions are supported from the issue detail page:
- Resolve
- Ignore
- Reopen

## Issue List

The Issues page supports advanced filtering:
- Search (title/message)
- Status filter
- Environment filter
- Level filter
- Release filter

Filter state is synchronized with URL query parameters, so refresh/share keeps state.

## Event Inspection

Issue detail supports event-level investigation:
- selectable latest events list
- event metadata (timestamp, source, level, environment, release, SDK)
- `Stack` tab
- `Context` tab
- `Raw` tab

Issue-level overview remains separate from event-level detail.

## Source Map Resolution

For minified production stacks, source maps can resolve frames to original source.

UI highlights include:
- `Source mapped` badge
- Original source location (file:line:column)
- Minified frame location
- Function name (when available)

If source mapping cannot be resolved, stack trace still renders with graceful fallback messaging.

## Regression Detection

When a new event matches a previously `resolved` issue:
- issue is automatically reopened (`resolved` -> `open`)
- issue is marked as regression
- regression count increments
- last regressed timestamp is updated

Ignored issues remain ignored by design.

## SDK Usage

Node.js and Browser SDK packages are available:
- `@smart-error-tracker/node`
- `@smart-error-tracker/browser`

Node example:

```ts
import express from 'express'
import { initTracker } from '@smart-error-tracker/node'

const app = express()

initTracker({
  dsn: 'http://localhost:3000/events',
})

app.listen(3001)
```

Browser example:

```html
<script type="module">
  import { init } from '@smart-error-tracker/browser'

  init({
    dsn: 'http://localhost:3000/events',
  })
</script>
```

For package-level options and integration details, see `packages/*/README.md` and `apps/demo-*`.

## Monorepo Structure

- `apps/api` - NestJS backend (Prisma + PostgreSQL)
- `apps/web` - React + Vite dashboard
- `packages/sdk-node` - Node SDK
- `packages/sdk-browser` - Browser SDK
- `apps/demo-api`, `apps/demo-web` - demo integrations
- `infra/docker-compose.yml` - local PostgreSQL service

## Local Development

1. Install dependencies:

```bash
pnpm install
```

2. Start PostgreSQL:

```bash
docker compose -f infra/docker-compose.yml up -d
```

3. Prepare Prisma for API:

```bash
cd apps/api
pnpm install
npx prisma generate
# Use migrate deploy for migration-based environments:
npx prisma migrate deploy
# Or use db push for local schema iteration:
npx prisma db push
```

4. Optional seed step (if available):

```bash
pnpm exec ts-node -r tsconfig-paths/register scripts/seed.ts
```

5. Run API:

```bash
pnpm --filter api run start:dev
```

6. Run Web (in another terminal):

```bash
pnpm --filter web run dev
```

7. Build SDK packages:

```bash
pnpm --filter @smart-error-tracker/node run build
pnpm --filter @smart-error-tracker/browser run build
```

8. Run API tests:

```bash
pnpm --filter api run test
```

## Deployment Suggestions

Frontend:
- Vercel
- Netlify

Backend:
- Docker container deployment
- DigitalOcean App Platform
- AWS ECS

Database:
- Managed PostgreSQL (Supabase / AWS RDS)

## Roadmap

Planned improvements:
- Alerting system
- Webhook integrations
- Advanced analytics
- Session replay
- Error rate monitoring
