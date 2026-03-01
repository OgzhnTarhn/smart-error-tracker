/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_API_KEY: string;
    readonly VITE_ENVIRONMENT: string;
    readonly VITE_RELEASE: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
