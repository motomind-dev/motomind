/**
 * Bêta / démo : si PREMIUM_UNLOCK_ALL vaut 1, true ou yes, toutes les fonctionnalités
 * Premium sont autorisées sans modifier User.plan en base (retirer la variable pour revenir au comportement normal).
 */
export function isPremiumUnlockAllEnabled(): boolean {
  const v = process.env.PREMIUM_UNLOCK_ALL?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function hasPremiumAccess(dbPlan: string | null | undefined): boolean {
  if (isPremiumUnlockAllEnabled()) return true;
  return dbPlan === "PRO";
}

export function effectivePlanLabel(
  dbPlan: string | null | undefined
): "PRO" | "FREE" {
  return hasPremiumAccess(dbPlan) ? "PRO" : "FREE";
}
