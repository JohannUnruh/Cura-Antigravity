// src/lib/env.ts
// Utility to expose only server‑side environment variables.
// Import this module ONLY in server‑only code (API routes, Server Components, etc.).
// Client‑side code should never import this file, otherwise the values end up in the bundle.

export const SERVER_ENV = {
  // Add any secret keys that must stay on the server here.
  // Example (currently only GEMINI_API_KEY):
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  // If you later add more secrets (e.g., Firebase service account keys), include them here.
} as const;

// Type for easier consumption
export type ServerEnv = typeof SERVER_ENV;
