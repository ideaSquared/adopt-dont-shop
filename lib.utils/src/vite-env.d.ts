/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_BASE_URL: string;
  readonly VITE_API_URL: string; // Legacy support
  readonly VITE_WEBSOCKET_URL: string; // Legacy support
  readonly VITE_SOCKET_URL: string; // Legacy support
  readonly VITE_ENABLE_DEBUG_LOGGING: string;
  readonly MODE: string;
  readonly NODE_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
