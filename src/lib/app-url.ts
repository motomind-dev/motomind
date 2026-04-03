/**
 * URL publique de l'app (NEXTAUTH_URL). Retire le slash final pour éviter des URLs doubles // et soucis de cookies.
 */
export function getAppBaseUrl(): string {
  const raw = process.env.NEXTAUTH_URL || "http://localhost:3002";
  return raw.replace(/\/+$/, "");
}
