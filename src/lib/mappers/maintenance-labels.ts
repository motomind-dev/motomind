/**
 * Map maintenance types and statuses to French labels for UI.
 * Accepts both legacy strings and Prisma enum values.
 */

const TYPE_LABELS: Record<string, string> = {
  vidange: "Vidange moteur",
  chaine: "Chaîne",
  pneus: "Pneus",
  freins: "Freins",
  revision_generale: "Révision générale",
  OIL_CHANGE: "Vidange moteur",
  CHAIN: "Chaîne",
  TIRES: "Pneus",
  BRAKES: "Freins",
  GENERAL_SERVICE: "Révision générale",
};

const STATUS_LABELS: Record<string, string> = {
  A_VENIR: "À venir",
  proche: "À venir",
  en_retard: "En retard",
  termine: "Terminé",
  UPCOMING: "À venir",
  SOON: "À venir",
  OVERDUE: "En retard",
  COMPLETED: "Terminé",
};

/** Display status for dashboard (OK / À venir / En retard) */
export const DISPLAY_STATUS_LABELS: Record<string, string> = {
  OK: "OK",
  SOON: "À venir",
  OVERDUE: "En retard",
};

/** Tailwind class for status dot */
export const DISPLAY_STATUS_COLORS: Record<string, string> = {
  OK: "bg-green-500",
  SOON: "bg-green-500",
  OVERDUE: "bg-red-500",
};

export function getMaintenanceTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

export function getMaintenanceStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function getDisplayStatusColor(status: "OK" | "SOON" | "OVERDUE"): string {
  return DISPLAY_STATUS_COLORS[status] ?? "bg-zinc-500";
}

export function getDisplayStatusLabel(status: "OK" | "SOON" | "OVERDUE"): string {
  return DISPLAY_STATUS_LABELS[status] ?? status;
}
