/**
 * Centralized environment configuration for the web app.
 *
 * Next.js exposes env vars prefixed with NEXT_PUBLIC_ to the browser.
 * Defaults fall back to localhost for development convenience.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || API_URL;
