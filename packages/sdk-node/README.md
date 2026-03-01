# @smart-error-tracker/node

Node.js SDK for [Smart Error Tracker](../../README.md) — Express error middleware & manual capture.

## Quick Start

```ts
import express from 'express';
import { init, installGlobalHandlers, expressErrorHandler } from '@smart-error-tracker/node';

// 1. Initialize
init({
  baseUrl: 'http://localhost:3000',
  apiKey: 'set_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  environment: 'production',
  release: '1.0.0',
});

// 2. Catch process-level errors (optional)
installGlobalHandlers();

// 3. Express app
const app = express();

app.get('/', (req, res) => res.json({ ok: true }));

// 4. Error handler — MUST be last middleware
app.use(expressErrorHandler());

app.listen(3000);
```

## Manual Capture

```ts
import { captureException, captureMessage } from '@smart-error-tracker/node';

// Capture a caught error
try {
  await db.query('...');
} catch (err) {
  captureException(err, { query: 'SELECT ...', userId: '123' });
}

// Capture a custom message
captureMessage('Deployment completed', { level: 'info' });
```

## API

### `init(config)`
| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | — | API server URL |
| `apiKey` | `string` | — | Project API key |
| `environment` | `string?` | — | e.g. `'production'` |
| `release` | `string?` | — | e.g. `'1.0.0'` |
| `source` | `string?` | `'backend'` | Event source identifier |
| `dedupeIntervalMs` | `number?` | `2000` | Dedupe window |
| `timeoutMs` | `number?` | `5000` | Fetch timeout |
| `debug` | `boolean?` | `true` | Console warnings |

### `expressErrorHandler()`
Express error-handling middleware. **Must be the last middleware.** Captures errors, sends them to the tracker, and returns a 500 response.

### `installGlobalHandlers()`
Installs `process.on('uncaughtException')` and `process.on('unhandledRejection')`.

### `captureException(error, extras?)`
Send an error event. `extras` are merged into `context`.

### `captureMessage(message, options?)`
Send a custom message. Options: `{ level?: 'error'|'warn'|'info', extras?: {} }`.

## Context (auto-captured)
Node SDK automatically includes:
- `runtime: 'node'`
- `nodeVersion` (e.g. `v20.10.0`)
- `platform` (e.g. `win32`, `linux`)
- `pid` (process ID)
- Express middleware also adds: `method`, `url`, `user-agent`, `query`, `ip`
