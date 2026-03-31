import { z } from "zod";
import { MAINTENANCE_TYPES } from "@/lib/constants/maintenance";

const MAX_KM = 2_000_000;
const MAX_NOTE = 2000;
const MAX_GARAGE = 200;

const legacyTypeEnum = z.enum(MAINTENANCE_TYPES);

export const createMaintenanceSchema = z.object({
  motoId: z.string().cuid("ID moto invalide"),
  type: legacyTypeEnum,
  date: z.coerce.date(),
  kilometrage: z.number().int().min(0).max(MAX_KM),
  note: z.string().max(MAX_NOTE).optional().nullable(),
  cout: z.number().min(0).optional().nullable(),
  statut: z.enum(["A_VENIR", "proche", "en_retard", "termine"]).optional(),
  garage: z.string().max(MAX_GARAGE).optional().nullable(),
});

export const updateMaintenanceSchema = z.object({
  type: legacyTypeEnum.optional(),
  date: z.coerce.date().optional(),
  kilometrage: z.number().int().min(0).max(MAX_KM).optional(),
  note: z.string().max(MAX_NOTE).optional().nullable(),
  cout: z.number().min(0).optional().nullable(),
  statut: z.enum(["A_VENIR", "proche", "en_retard", "termine"]).optional(),
  garage: z.string().max(MAX_GARAGE).optional().nullable(),
});

/** Body from API (all fields may be string) */
export const createMaintenanceBodySchema = z.object({
  motoId: z.string().min(1, "Moto requise"),
  type: legacyTypeEnum,
  date: z.union([z.string(), z.date()]).pipe(z.coerce.date()),
  kilometrage: z.union([z.number(), z.string()]).pipe(
    z.coerce.number().int().min(0).max(MAX_KM)
  ),
  note: z.string().max(MAX_NOTE).optional().nullable(),
  cout: z.union([z.number(), z.string()]).pipe(z.coerce.number().min(0)).optional().nullable(),
  statut: z.enum(["A_VENIR", "proche", "en_retard", "termine"]).optional(),
  garage: z.string().max(MAX_GARAGE).optional().nullable(),
});

export const markCompleteBodySchema = z.object({
  motoId: z.string().cuid("ID moto invalide"),
  type: legacyTypeEnum,
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;
export type MarkCompleteInput = z.infer<typeof markCompleteBodySchema>;
