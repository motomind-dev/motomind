/**
 * Centralized maintenance status logic and consistent color/label helpers.
 * DO NOT break existing logic: safe fallbacks when nextDue values are missing.
 */

export type MaintenanceDisplayStatus = "UPCOMING" | "SOON" | "OVERDUE" | "COMPLETED";

/** Aligné sur `reminderMileageBefore` par défaut (500) et `getMaintenanceStatus`. */
const SOON_KM_THRESHOLD = 500;
const SOON_DAYS_THRESHOLD = 30;

export type ComputeStatusOptions = {
  isCompleted?: boolean;
  currentMileage: number;
  nextDueMileage: number | null;
  nextDueDate: Date | null;
  reminderMileageBefore?: number;
  reminderDaysBefore?: number;
};

/**
 * Statut d’échéance : **km ou date**, le premier critère atteint (comme les rappels / getMaintenanceStatus).
 * Ainsi, si l’utilisateur met à jour le kilométrage de la moto et dépasse l’échéance km de la révision,
 * le statut passe bien en retard même quand une date calendaire est encore dans le futur.
 */
export function getEntretienStatus(options: {
  isCompleted?: boolean;
  currentMileage: number;
  nextDueMileage: number | null;
  nextDueDate: Date | null;
  reminderMileageBefore?: number;
  reminderDaysBefore?: number;
}): MaintenanceDisplayStatus {
  const {
    isCompleted = false,
    currentMileage,
    nextDueMileage,
    nextDueDate,
    reminderMileageBefore = SOON_KM_THRESHOLD,
    reminderDaysBefore = SOON_DAYS_THRESHOLD,
  } = options;

  if (isCompleted) return "COMPLETED";

  const mileage = Number(currentMileage) || 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // En retard : km dépassé OU date atteinte / passée
  if (
    nextDueMileage != null &&
    !Number.isNaN(Number(nextDueMileage)) &&
    mileage >= Number(nextDueMileage)
  ) {
    return "OVERDUE";
  }
  if (nextDueDate && !Number.isNaN(nextDueDate.getTime())) {
    const dueDate = new Date(nextDueDate);
    dueDate.setHours(0, 0, 0, 0);
    if (today.getTime() >= dueDate.getTime()) return "OVERDUE";
  }

  // Bientôt : fenêtre km ou fenêtre date
  if (
    nextDueMileage != null &&
    !Number.isNaN(Number(nextDueMileage)) &&
    mileage >= Number(nextDueMileage) - reminderMileageBefore
  ) {
    return "SOON";
  }
  if (nextDueDate && !Number.isNaN(nextDueDate.getTime())) {
    const reminderDate = new Date(nextDueDate);
    reminderDate.setDate(reminderDate.getDate() - reminderDaysBefore);
    reminderDate.setHours(0, 0, 0, 0);
    if (today.getTime() >= reminderDate.getTime()) return "SOON";
  }

  return "UPCOMING";
}

/**
 * Calcul (historique) utilisé par le dashboard.
 * On le base désormais sur les règles centralisées de `getEntretienStatus`.
 */
export function computeMaintenanceDisplayStatus(
  options: ComputeStatusOptions
): MaintenanceDisplayStatus {
  const {
    isCompleted = false,
    currentMileage,
    nextDueMileage,
    nextDueDate,
    reminderMileageBefore = SOON_KM_THRESHOLD,
    reminderDaysBefore = SOON_DAYS_THRESHOLD,
  } = options;

  return getEntretienStatus({
    isCompleted,
    currentMileage,
    nextDueMileage,
    nextDueDate,
    reminderMileageBefore,
    reminderDaysBefore,
  });
}

const STATUS_COLORS: Record<MaintenanceDisplayStatus, string> = {
  UPCOMING: "text-green-400 bg-green-500/10",
  SOON: "text-green-400 bg-green-500/10",
  OVERDUE: "text-red-400 bg-red-500/10",
  COMPLETED: "text-blue-400 bg-blue-500/10",
};

/** Dot only (solid bg for small indicator). Accepts legacy "OK", DB statut. */
const STATUS_DOT_COLORS: Record<string, string> = {
  UPCOMING: "bg-green-500",
  OK: "bg-green-500",
  SOON: "bg-green-500",
  OVERDUE: "bg-red-500",
  COMPLETED: "bg-blue-500",
  termine: "bg-blue-500",
  A_VENIR: "bg-green-500",
  proche: "bg-green-500",
  en_retard: "bg-red-500",
};

const STATUS_LABELS_FR: Record<MaintenanceDisplayStatus, string> = {
  UPCOMING: "À venir",
  SOON: "À venir",
  OVERDUE: "En retard",
  COMPLETED: "Terminé",
};

/** Legacy: OK is displayed as UPCOMING. DB statut: termine, A_VENIR, proche, en_retard */
const STATUS_LABELS_LEGACY: Record<string, string> = {
  OK: "À venir",
  UPCOMING: "À venir",
  SOON: "À venir",
  OVERDUE: "En retard",
  COMPLETED: "Terminé",
  termine: "Terminé",
  A_VENIR: "À venir",
  proche: "À venir",
  en_retard: "En retard",
};

/** DB statut → Tailwind badge classes */
const DB_STATUT_COLORS: Record<string, string> = {
  termine: "text-blue-400 bg-blue-500/10",
  en_retard: "text-red-400 bg-red-500/10",
  proche: "text-green-400 bg-green-500/10",
  A_VENIR: "text-green-400 bg-green-500/10",
};

/**
 * Tailwind classes for badge/chip (text + background).
 * Accepts MaintenanceDisplayStatus, legacy "OK", or DB statut (termine, A_VENIR, proche, en_retard).
 */
export function getStatusColor(status: string): string {
  if (!status) return STATUS_COLORS.UPCOMING;
  return (
    STATUS_COLORS[status as MaintenanceDisplayStatus] ??
    DB_STATUT_COLORS[status] ??
    STATUS_COLORS.UPCOMING
  );
}

/**
 * Solid background class for status dot only.
 * Accepts MaintenanceDisplayStatus or legacy "OK".
 */
export function getStatusDotColor(status: string): string {
  return STATUS_DOT_COLORS[status] ?? STATUS_DOT_COLORS.UPCOMING;
}

/**
 * French label for UI.
 * Accepts MaintenanceDisplayStatus, legacy "OK", or DB statut. Default: "À venir".
 */
export function getStatusLabel(status: string): string {
  if (!status) return "À venir";
  return STATUS_LABELS_LEGACY[status] ?? STATUS_LABELS_FR[status as MaintenanceDisplayStatus] ?? "À venir";
}
