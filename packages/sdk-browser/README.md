# @smart-error-tracker/browser

Browser SDK for [Smart Error Tracker](../../README.md) — automatic error capture & reporting.

## Quick Start

```ts
import { init, installGlobalHandlers } from '@smart-error-tracker/browser';

init({
  baseUrl: 'http://localhost:3000',
  apiKey: 'set_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  environment: 'production',
  release: '1.0.0',
});

installGlobalHandlers(); // captures window.onerror + unhandledrejection
```

## Manual Capture

```ts
import { captureException, captureMessage } from '@smart-error-tracker/browser';

// Capture a caught error
try {
  riskyOperation();
} catch (err) {
  captureException(err, { userId: '123', page: '/checkout' });
}

// Capture a custom message
captureMessage('User completed onboarding', { level: 'info' });
```

## API

### `init(config)`
| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | — | API server URL |
| `apiKey` | `string` | — | Project API key (`set_...`) |
| `environment` | `string?` | — | e.g. `'production'`, `'staging'` |
| `release` | `string?` | — | e.g. `'1.0.0'` |
| `dedupeIntervalMs` | `number?` | `2000` | Drop duplicate events within this window |
| `timeoutMs` | `number?` | `5000` | Fetch timeout |
| `debug` | `boolean?` | `true` | Console warnings |

### `installGlobalHandlers()`
Installs `window.addEventListener('error')` and `window.addEventListener('unhandledrejection')`.

### `captureException(error, extras?)`
Send an error event. `extras` are merged into `context`.

### `captureMessage(message, options?)`
Send a custom message. Options: `{ level?: 'error'|'warn'|'info', extras?: {} }`.

## Safety
- **Never crashes your app** — all transport is fire-and-forget
- **Circular JSON safe** — handles circular references in context
- **Client-side dedupe** — prevents spam from rapid identical errors
- **Timeout protection** — AbortController with configurable timeout

## Troubleshooting
- **CORS error**: Ensure backend allows your origin in `main.ts`
- **Events not appearing**: Check that `VITE_API_KEY` matches a valid project key
- **No console output**: Set `debug: true` in `init()` config
