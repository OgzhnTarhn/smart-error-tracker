# @smart-error-tracker/browser

Browser SDK for [Smart Error Tracker](../../README.md) with automatic capture and manual reporting.

## Quick Start

```ts
import { init, installGlobalHandlers } from '@smart-error-tracker/browser';

init({
  dsn: 'http://set_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@localhost:3000/project_1',
  environment: 'production',
  release: '1.0.0',
});

installGlobalHandlers();
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
import { captureException, captureMessage } from '@smart-error-tracker/browser';

try {
  riskyOperation();
} catch (err) {
  captureException(err, { userId: '123', page: '/checkout' });
}

captureMessage('User completed onboarding', { level: 'info' });
```

## API

### `init(config)`

| Option | Type | Default | Description |
|---|---|---|---|
| `dsn` | `string` | - | Preferred: `https://set_key@host/projectId` |
| `baseUrl` + `apiKey` | `string` | - | Legacy mode |
| `environment` | `string?` | - | Example: `'production'` |
| `release` | `string?` | - | Example: `'1.0.0'` |
| `dedupeIntervalMs` | `number?` | `2000` | Dedupe window |
| `timeoutMs` | `number?` | `5000` | Fetch timeout |
| `debug` | `boolean?` | `true` | Console warnings |

### `installGlobalHandlers()`

Installs `error` and `unhandledrejection` handlers.

### `captureException(error, extras?)`

Sends an error event.

### `captureMessage(message, options?)`

Sends a custom event with optional level and extras.

## Safety

- Never crashes your app (fire-and-forget transport)
- Circular JSON safe for context payloads
- Client-side dedupe to reduce noise
- Timeout protection with AbortController

## Troubleshooting

- CORS error: allow your frontend origin in API CORS config
- Events not appearing: verify the API key is valid
- No logs: set `debug: true` in `init()`
