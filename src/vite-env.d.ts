/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Override the Flask backend origin. Defaults to http://localhost:5000. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
