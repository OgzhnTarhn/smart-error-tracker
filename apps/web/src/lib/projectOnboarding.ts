import type { ProjectPlatform, ProjectRuntimeType } from './projectRecords';

export interface ProjectSetupGuide {
    installCommand: string;
    initializeSnippet: string;
    apiKeySnippet: string;
    testEventSnippet: string;
    initFileLabel: string;
    envFileLabel: string;
    testFileLabel: string;
    notes: string[];
}

function buildBrowserInitSnippet(apiKey: string) {
    return `import { init, installGlobalHandlers } from '@smart-error-tracker/browser';

init({
  baseUrl: import.meta.env.VITE_SMART_ERROR_TRACKER_BASE_URL ?? 'http://localhost:3000',
  apiKey: import.meta.env.VITE_SMART_ERROR_TRACKER_API_KEY ?? '${apiKey}',
  environment: 'production',
  release: 'web@1.0.0',
});

installGlobalHandlers();`;
}

function buildNodeInitSnippet(apiKey: string) {
    return `import { init, installGlobalHandlers } from '@smart-error-tracker/node';

init({
  baseUrl: process.env.SMART_ERROR_TRACKER_BASE_URL ?? 'http://localhost:3000',
  apiKey: process.env.SMART_ERROR_TRACKER_API_KEY ?? '${apiKey}',
  environment: 'production',
  release: 'api@1.0.0',
});

installGlobalHandlers();`;
}

function buildExpressInitSnippet(apiKey: string) {
    return `import express from 'express';
import { init, installGlobalHandlers, expressErrorHandler } from '@smart-error-tracker/node';

init({
  baseUrl: process.env.SMART_ERROR_TRACKER_BASE_URL ?? 'http://localhost:3000',
  apiKey: process.env.SMART_ERROR_TRACKER_API_KEY ?? '${apiKey}',
  environment: 'production',
  release: 'api@1.0.0',
});

installGlobalHandlers();

const app = express();
app.use(expressErrorHandler());`;
}

function buildNextJsInitSnippet(apiKey: string) {
    return `// app/error-tracking.client.ts
import { init as initBrowser, installGlobalHandlers } from '@smart-error-tracker/browser';

initBrowser({
  baseUrl: process.env.NEXT_PUBLIC_SMART_ERROR_TRACKER_BASE_URL ?? 'http://localhost:3000',
  apiKey: process.env.NEXT_PUBLIC_SMART_ERROR_TRACKER_API_KEY ?? '${apiKey}',
  environment: process.env.NODE_ENV,
  release: 'web@1.0.0',
});

installGlobalHandlers();

// server/error-tracking.ts
import { init as initNode } from '@smart-error-tracker/node';

initNode({
  baseUrl: process.env.SMART_ERROR_TRACKER_BASE_URL ?? 'http://localhost:3000',
  apiKey: process.env.SMART_ERROR_TRACKER_API_KEY ?? '${apiKey}',
  environment: process.env.NODE_ENV,
  release: 'api@1.0.0',
});`;
}

function buildBrowserTestSnippet() {
    return `import { captureException } from '@smart-error-tracker/browser';

captureException(new Error('Smart Error Tracker test event'));`;
}

function buildNodeTestSnippet() {
    return `import { captureException } from '@smart-error-tracker/node';

captureException(new Error('Smart Error Tracker test event'));`;
}

function buildExpressTestSnippet() {
    return `app.get('/debug-smart-error-tracker', (_req, res) => {
  res.status(500).json({ ok: false });
  throw new Error('Smart Error Tracker test event');
});`;
}

export function getProjectSetupGuide(
    platform: ProjectPlatform,
    runtimeType: ProjectRuntimeType,
    apiKey = 'YOUR_PROJECT_KEY',
): ProjectSetupGuide {
    if (platform === 'react') {
        return {
            installCommand: 'pnpm add @smart-error-tracker/browser',
            initializeSnippet: buildBrowserInitSnippet(apiKey),
            apiKeySnippet: `VITE_SMART_ERROR_TRACKER_BASE_URL=http://localhost:3000
VITE_SMART_ERROR_TRACKER_API_KEY=${apiKey}`,
            testEventSnippet: buildBrowserTestSnippet(),
            initFileLabel: 'src/main.tsx',
            envFileLabel: '.env.local',
            testFileLabel: 'Anywhere after init()',
            notes: [
                'Use the browser SDK for uncaught errors and rejected promises.',
                'Enable source maps in production builds for readable stack traces.',
            ],
        };
    }

    if (platform === 'nextjs') {
        return {
            installCommand:
                'pnpm add @smart-error-tracker/browser @smart-error-tracker/node',
            initializeSnippet: buildNextJsInitSnippet(apiKey),
            apiKeySnippet: `NEXT_PUBLIC_SMART_ERROR_TRACKER_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SMART_ERROR_TRACKER_API_KEY=${apiKey}
SMART_ERROR_TRACKER_BASE_URL=http://localhost:3000
SMART_ERROR_TRACKER_API_KEY=${apiKey}`,
            testEventSnippet: buildBrowserTestSnippet(),
            initFileLabel: 'app/error-tracking.client.ts and server bootstrap',
            envFileLabel: '.env.local',
            testFileLabel: 'Client action or route handler',
            notes: [
                'Use the browser SDK for client rendering surfaces.',
                'Use the Node SDK for route handlers, server actions, and jobs.',
            ],
        };
    }

    if (platform === 'express') {
        return {
            installCommand: 'pnpm add @smart-error-tracker/node',
            initializeSnippet: buildExpressInitSnippet(apiKey),
            apiKeySnippet: `SMART_ERROR_TRACKER_BASE_URL=http://localhost:3000
SMART_ERROR_TRACKER_API_KEY=${apiKey}`,
            testEventSnippet: buildExpressTestSnippet(),
            initFileLabel: 'src/server.ts',
            envFileLabel: '.env',
            testFileLabel: 'src/server.ts',
            notes: [
                'Register expressErrorHandler() after your routes and other middleware.',
                'The Node SDK also captures uncaught exceptions and rejected promises.',
            ],
        };
    }

    if (platform === 'nodejs') {
        return {
            installCommand: 'pnpm add @smart-error-tracker/node',
            initializeSnippet: buildNodeInitSnippet(apiKey),
            apiKeySnippet: `SMART_ERROR_TRACKER_BASE_URL=http://localhost:3000
SMART_ERROR_TRACKER_API_KEY=${apiKey}`,
            testEventSnippet: buildNodeTestSnippet(),
            initFileLabel: 'src/index.ts',
            envFileLabel: '.env',
            testFileLabel: 'Any startup path',
            notes: [
                'Use this setup for workers, queue consumers, scheduled jobs, or plain services.',
                'Call init() early so global handlers are registered before runtime failures.',
            ],
        };
    }

    if (runtimeType === 'frontend') {
        return {
            installCommand: 'pnpm add @smart-error-tracker/browser',
            initializeSnippet: buildBrowserInitSnippet(apiKey),
            apiKeySnippet: `VITE_SMART_ERROR_TRACKER_BASE_URL=http://localhost:3000
VITE_SMART_ERROR_TRACKER_API_KEY=${apiKey}`,
            testEventSnippet: buildBrowserTestSnippet(),
            initFileLabel: 'Your app bootstrap file',
            envFileLabel: '.env.local',
            testFileLabel: 'Any mounted screen',
            notes: [
                'The generic frontend path uses the browser SDK.',
                'Adjust environment variable names to match your bundler.',
            ],
        };
    }

    if (runtimeType === 'fullstack') {
        return {
            installCommand:
                'pnpm add @smart-error-tracker/browser @smart-error-tracker/node',
            initializeSnippet: buildNextJsInitSnippet(apiKey),
            apiKeySnippet: `VITE_SMART_ERROR_TRACKER_BASE_URL=http://localhost:3000
VITE_SMART_ERROR_TRACKER_API_KEY=${apiKey}
SMART_ERROR_TRACKER_BASE_URL=http://localhost:3000
SMART_ERROR_TRACKER_API_KEY=${apiKey}`,
            testEventSnippet: buildNodeTestSnippet(),
            initFileLabel: 'Client bootstrap and server entry',
            envFileLabel: '.env.local and .env',
            testFileLabel: 'Any client or server execution path',
            notes: [
                'Use the browser SDK on the client and the Node SDK on the server.',
                'Start with one shared API key until project-level permissions evolve.',
            ],
        };
    }

    return {
        installCommand: 'pnpm add @smart-error-tracker/node',
        initializeSnippet: buildNodeInitSnippet(apiKey),
        apiKeySnippet: `SMART_ERROR_TRACKER_BASE_URL=http://localhost:3000
SMART_ERROR_TRACKER_API_KEY=${apiKey}`,
        testEventSnippet: buildNodeTestSnippet(),
        initFileLabel: 'Your service entry file',
        envFileLabel: '.env',
        testFileLabel: 'Any startup path',
        notes: [
            'The generic backend path defaults to the Node SDK.',
            'Swap to the browser SDK if this project ends up being client-only.',
        ],
    };
}
