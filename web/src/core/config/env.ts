export const BFF_BASE_URL = (import.meta.env.VITE_BFF_BASE_URL ?? '/bff').replace(/\/$/, '');
export const API_TIMEOUT_MS = 60_000;
export const RETRY_DELAYS_MS = [2_000, 5_000, 10_000];
