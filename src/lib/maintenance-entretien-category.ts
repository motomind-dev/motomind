/**
 * Catégories métier d’entretien (alignées sur INTERVALLES_KM / rappels / dashboard).
 * Le champ Prisma `Entretien.type` peut être un libellé libre ; on le rattache à une catégorie.
 */

export const MAINTENANCE_CATEGORIES = [
  "vidange",
  "chaine",
  "pneus",
  "freins",
  "revision_generale",
] as const;

export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];

/**
 * Préconisation auto (km / date depuis le dernier entretien terminé, rappels mail associés).
 * Vidange, chaîne, pneus, freins : pas d’inférence — l’utilisateur planifie (fiches à venir).
 */
export function isAutoPrecomputedMaintenanceCategory(
  category: MaintenanceCategory | null | undefined
): boolean {
  return category === "revision_generale";
}

/** Première catégorie métier qui correspond au libellé stocké, ou null. */
export function getMaintenanceCategoryForType(
  storedType: string | null | undefined
): MaintenanceCategory | null {
  if (storedType == null || String(storedType).trim() === "") return null;
  for (const c of MAINTENANCE_CATEGORIES) {
    if (entretienMatchesCategory(storedType, c)) return c;
  }
  return null;
}

export function entretienMatchesCategory(
  storedType: string | null | undefined,
  category: MaintenanceCategory
): boolean {
  const t = String(storedType ?? "")
    .trim()
    .toLowerCase();
  if (!t) return false;
  switch (category) {
    case "vidange":
      return (
        t === "vidange" ||
        t.includes("huile") ||
        t.includes("vidange") ||
        t === "oil_change"
      );
    case "freins":
      return t === "freins" || t === "frein" || t.startsWith("frein");
    case "chaine":
      return t === "chaine" || t === "chain";
    case "pneus":
      return t === "pneus" || t.includes("pneu");
    case "revision_generale":
      return (
        t === "revision_generale" ||
        t.includes("revision") ||
        t.includes("révision") ||
        t.includes("revison")
      );
    default:
      return t === category;
  }
}
