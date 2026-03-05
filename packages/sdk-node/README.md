# @smart-error-tracker/node

Node.js SDK for [Smart Error Tracker](../../README.md) with manual capture and Express middleware.

## Quick Start

```ts
import express from 'express';
import { init, installGlobalHandlers, expressErrorHandler } from '@smart-error-tracker/node';

init({
  dsn: 'http://set_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@localhost:3000/project_1',
  environment: 'production',
  release: '1.0.0',
});

installGlobalHandlers();

const app = express();
app.get('/', (_req, res) => res.json({ ok: true }));
app.use(expressErrorHandler()); // last middleware
app.listen(3000);
```

Legacy init (still supported):

```ts
init({
  baseUrl: 'http://localhost:3000',
  apiKey: 'set_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
});
```

## Manual Capture

```ts
import { captureException, captureMessage } from '@smart-error-tracker/node';

try {
  await db.query('...');
} catch (err) {
  captureException(err, { query: 'SELECT ...', userId: '123' });
}

captureMessage('Deployment completed', { level: 'info' });
```

## API

### `init(config)`

| Option | Type | Default | Description |
|---|---|---|---|
| `dsn` | `string` | - | Preferred: `https://set_key@host/projectId` |
| `baseUrl` + `apiKey` | `string` | - | Legacy mode |
| `environment` | `string?` | - | Example: `'production'` |
| `release` | `string?` | - | Example: `'1.0.0'` |
| `source` | `string?` | `'backend'` | Event source value |
| `dedupeIntervalMs` | `number?` | `2000` | Dedupe window |
| `timeoutMs` | `number?` | `5000` | Fetch timeout |
| `debug` | `boolean?` | `true` | Console warnings |

### `expressErrorHandler()`

Express error middleware. Must be last.

### `installGlobalHandlers()`

Installs `uncaughtException` and `unhandledRejection` handlers.

### `captureException(error, extras?)`

Sends an error event.

### `captureMessage(message, options?)`

Sends a custom event with optional level and extras.

## Auto Context

Node SDK includes:

- `runtime: 'node'`
- `nodeVersion`
- `platform`
- `pid`

Express middleware also adds:

- `method`, `url`, `user-agent`, `query`, `ip`
