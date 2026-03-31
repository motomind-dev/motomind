/**
 * Simple in-memory rate limiter for auth and sensitive endpoints.
 * For production at scale, use Redis or Vercel KV.
 */

const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_LOGIN = 10;
const MAX_RESET_PASSWORD = 5;
const MAX_REGISTER = 5;

function getKey(prefix: string, id: string): string {
  return `${prefix}:${id}`;
}

function getOrCreate(key: string, limit: number): { count: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);
  if (entry && now < entry.resetAt) {
    return entry;
  }
  const newEntry = { count: 0, resetAt: now + WINDOW_MS };
  store.set(key, newEntry);
  return newEntry;
}

export function checkRateLimit(
  prefix: "login" | "reset-password" | "register",
  identifier: string
): { allowed: boolean; remaining: number } {
  const limits = {
    login: MAX_LOGIN,
    "reset-password": MAX_RESET_PASSWORD,
    register: MAX_REGISTER,
  };
  const key = getKey(prefix, identifier.toLowerCase());
  const entry = getOrCreate(key, limits[prefix]);
  entry.count += 1;
  const remaining = Math.max(0, limits[prefix] - entry.count);
  return {
    allowed: entry.count <= limits[prefix],
    remaining,
  };
}
