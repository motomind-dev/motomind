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

export function entretienMatchesCategory(
  storedType: string,
  category: MaintenanceCategory
): boolean {
  const t = storedType.trim().toLowerCase();
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
