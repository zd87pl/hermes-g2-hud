/** Environment variables — set via Vite's import.meta.env or .env file */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** WebSocket URL for the Hermes gateway */
  readonly VITE_WS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
