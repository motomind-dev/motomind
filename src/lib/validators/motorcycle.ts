import { z } from "zod";

const currentYear = new Date().getFullYear();
const MIN_YEAR = 1900;
const MAX_KM = 2_000_000;
const MAX_STRING = 200;

const cylindreeCm3Field = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = typeof v === "string" ? parseInt(v, 10) : v;
    if (Number.isNaN(n) || n < 1 || n > 3000) return undefined;
    return n;
  });

export const createMotorcycleSchema = z.object({
  marque: z.string().min(1, "Marque requise").max(MAX_STRING).trim(),
  modele: z.string().min(1, "Modèle requis").max(MAX_STRING).trim(),
  annee: z
    .number({ invalid_type_error: "Année invalide" })
    .int()
    .min(MIN_YEAR)
    .max(currentYear + 1),
  kilometrage: z
    .number({ invalid_type_error: "Kilométrage invalide" })
    .int()
    .min(0)
    .max(MAX_KM)
    .optional()
    .default(0),
  photo: z.string().url().optional().nullable().or(z.literal("")),
  dateAchat: z.coerce.date().optional().nullable(),
  cylindreeCm3: cylindreeCm3Field,
});

/** For API JSON body: strings from client */
export const createMotorcycleBodySchema = z.object({
  marque: z.string().min(1, "Marque requise").max(MAX_STRING).trim(),
  modele: z.string().min(1, "Modèle requis").max(MAX_STRING).trim(),
  annee: z.union([z.number(), z.string()]).pipe(
    z.coerce.number().int().min(MIN_YEAR).max(currentYear + 1)
  ),
  kilometrage: z.union([z.number(), z.string()]).pipe(
    z.coerce.number().int().min(0).max(MAX_KM)
  ).optional().default(0),
  photo: z.string().optional().nullable().or(z.literal("")),
  dateAchat: z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((v) => (v && v !== "" ? new Date(v as string) : null)),
  cylindreeCm3: cylindreeCm3Field,
});

export const updateMotorcycleSchema = createMotorcycleSchema.partial();

export type CreateMotorcycleInput = z.infer<typeof createMotorcycleSchema>;
export type UpdateMotorcycleInput = z.infer<typeof updateMotorcycleSchema>;

export const updateMotorcycleBodySchema = z.object({
  marque: z.string().max(MAX_STRING).trim().optional(),
  modele: z.string().max(MAX_STRING).trim().optional(),
  annee: z.union([z.number(), z.string()]).pipe(
    z.coerce.number().int().min(MIN_YEAR).max(currentYear + 1)
  ).optional(),
  kilometrage: z.union([z.number(), z.string()]).pipe(
    z.coerce.number().int().min(0).max(MAX_KM)
  ).optional(),
  photo: z.string().optional().nullable(),
  dateAchat: z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((v) => (v && v !== "" ? new Date(v as string) : null)),
  /** null = effacer la cylindrée enregistrée */
  cylindreeCm3: z
    .union([
      z.number().int().min(1).max(3000),
      z.string().regex(/^\d+$/).transform((s) => parseInt(s, 10)),
      z.null(),
    ])
    .optional(),
});
