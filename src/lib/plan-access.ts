/**
 * Bêta / démo : si PREMIUM_UNLOCK_ALL vaut 1, true ou yes, toutes les fonctionnalités
 * Premium sont autorisées sans modifier User.plan en base (retirer la variable pour revenir au comportement normal).
 */
function premiumUnlockAllFromEnv(): boolean {
  const v = process.env.PREMIUM_UNLOCK_ALL;
  return v === "1" || v === "true" || v === "yes";
}

export function hasPremiumAccess(dbPlan: string | null | undefined): boolean {
  if (premiumUnlockAllFromEnv()) return true;
  return dbPlan === "PRO";
}

export function effectivePlanLabel(
  dbPlan: string | null | undefined
): "PRO" | "FREE" {
  return hasPremiumAccess(dbPlan) ? "PRO" : "FREE";
}
