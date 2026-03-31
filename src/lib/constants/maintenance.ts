/**
 * Maintenance types and intervals.
 * Use these constants instead of magic strings.
 * Compatible with legacy string values (vidange, chaine, …) and Prisma enums (OIL_CHANGE, …).
 */

export const MAINTENANCE_TYPES = [
  "vidange",
  "chaine",
  "pneus",
  "freins",
  "revision_generale",
] as const;

export type MaintenanceTypeLegacy = (typeof MAINTENANCE_TYPES)[number];

/** Prisma enum values (when using schema.postgres.prisma) */
export const MAINTENANCE_TYPE_ENUM = [
  "OIL_CHANGE",
  "CHAIN",
  "TIRES",
  "BRAKES",
  "GENERAL_SERVICE",
] as const;

export type MaintenanceTypeEnum = (typeof MAINTENANCE_TYPE_ENUM)[number];

/** Legacy string → Prisma enum (for migration / API) */
export const LEGACY_TYPE_TO_ENUM: Record<MaintenanceTypeLegacy, MaintenanceTypeEnum> = {
  vidange: "OIL_CHANGE",
  chaine: "CHAIN",
  pneus: "TIRES",
  freins: "BRAKES",
  revision_generale: "GENERAL_SERVICE",
};

/** Prisma enum → legacy string (for backward compat if needed) */
export const ENUM_TO_LEGACY_TYPE: Record<MaintenanceTypeEnum, MaintenanceTypeLegacy> = {
  OIL_CHANGE: "vidange",
  CHAIN: "chaine",
  TIRES: "pneus",
  BRAKES: "freins",
  GENERAL_SERVICE: "revision_generale",
};

/** Intervals (km) per maintenance type — keyed by legacy string for current code */
export const INTERVALS_KM: Record<string, number> = {
  vidange: 5000,
  chaine: 3000,
  pneus: 10000,
  freins: 10000,
  revision_generale: 10000,
  OIL_CHANGE: 5000,
  CHAIN: 3000,
  TIRES: 10000,
  BRAKES: 10000,
  GENERAL_SERVICE: 10000,
};

export const DEFAULT_INTERVAL_KM = 5000;

/** Status: legacy DB values */
export const MAINTENANCE_STATUS_LEGACY = [
  "A_VENIR",
  "proche",
  "en_retard",
  "termine",
] as const;

export type MaintenanceStatusLegacy = (typeof MAINTENANCE_STATUS_LEGACY)[number];

/** Prisma enum values */
export const MAINTENANCE_STATUS_ENUM = [
  "UPCOMING",
  "SOON",
  "OVERDUE",
  "COMPLETED",
] as const;

export type MaintenanceStatusEnum = (typeof MAINTENANCE_STATUS_ENUM)[number];

export const LEGACY_STATUS_TO_ENUM: Record<
  MaintenanceStatusLegacy,
  MaintenanceStatusEnum
> = {
  A_VENIR: "UPCOMING",
  proche: "SOON",
  en_retard: "OVERDUE",
  termine: "COMPLETED",
};

export const ENUM_TO_LEGACY_STATUS: Record<
  MaintenanceStatusEnum,
  MaintenanceStatusLegacy
> = {
  UPCOMING: "A_VENIR",
  SOON: "proche",
  OVERDUE: "en_retard",
  COMPLETED: "termine",
};

/** Reminder type: legacy → enum */
export const REMINDER_TYPE_LEGACY = ["distance", "date"] as const;
export const REMINDER_TYPE_ENUM = ["DISTANCE", "DATE"] as const;

export const LEGACY_REMINDER_TO_ENUM: Record<
  (typeof REMINDER_TYPE_LEGACY)[number],
  (typeof REMINDER_TYPE_ENUM)[number]
> = {
  distance: "DISTANCE",
  date: "DATE",
};

/** Thresholds for "soon" (display / computation) */
export const REMINDER_MILEAGE_BEFORE_DEFAULT = 500;
export const REMINDER_DAYS_BEFORE_DEFAULT = 30;
