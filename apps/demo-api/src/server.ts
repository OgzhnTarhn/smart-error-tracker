import 'dotenv/config';
import express from 'express';
import {
    init,
    installGlobalHandlers,
    captureException,
    captureMessage,
    expressErrorHandler,
} from '../../../packages/sdk-node/src/index';

// ─── Initialize SDK ──────────────────────────────────────

init({
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    apiKey: process.env.API_KEY || '',
    environment: process.env.ENVIRONMENT || 'dev',
    release: process.env.RELEASE || '0.0.0',
});

installGlobalHandlers();

// ─── Express App ─────────────────────────────────────────

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 4000;

// Health check
app.get('/', (_req, res) => {
    res.json({
        name: 'demo-api',
        status: 'ok',
        sdk: '@smart-error-tracker/node',
        routes: ['/ok', '/error', '/reject', '/manual', '/message'],
    });
});

// Successful route
app.get('/ok', (_req, res) => {
    res.json({ message: 'Everything is fine! No errors here.' });
});

// Throws a sync error → caught by expressErrorHandler
app.get('/error', (_req, _res) => {
    throw new Error('Demo crash: Unhandled route error in Express');
});

// Async error (unhandled promise rejection)
app.get('/reject', (_req, _res, next) => {
    Promise.reject(new Error('Demo reject: Async database failure'))
        .catch(next); // Pass to Express error handler
});

// Manual captureException
app.get('/manual', (_req, res) => {
    try {
        const obj: any = null;
        obj.someMethod();
    } catch (err) {
        captureException(err, {
            route: '/manual',
            action: 'simulated-null-reference',
        });
        res.json({ message: 'Error captured manually! Check the dashboard.' });
    }
});

// Manual captureMessage
app.get('/message', (_req, res) => {
    captureMessage('Demo API health check passed', {
        level: 'info',
        extras: { route: '/message', uptime: process.uptime() },
    });
    res.json({ message: 'Info message captured! Check the dashboard.' });
});

// ─── Error handler (MUST be last) ────────────────────────

app.use(expressErrorHandler());

// ─── Start ───────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`\n🚀 Demo API running at http://localhost:${PORT}`);
    console.log(`\n  Routes:`);
    console.log(`  GET /ok      → success response`);
    console.log(`  GET /error   → throws sync error`);
    console.log(`  GET /reject  → async rejection`);
    console.log(`  GET /manual  → captureException()`);
    console.log(`  GET /message → captureMessage()\n`);
});
