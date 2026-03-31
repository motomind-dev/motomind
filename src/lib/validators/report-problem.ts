import { z } from "zod";

export const reportProblemSchema = z.object({
  message: z
    .string()
    .min(10, "Le message doit contenir au moins 10 caractères")
    .max(2000, "Le message ne doit pas dépasser 2000 caractères")
    .trim(),
  type: z.enum(["bug", "suggestion", "autre"]).optional(),
  page: z.string().max(500).optional(),
  email: z.string().email().optional(),
});

export type ReportProblemInput = z.infer<typeof reportProblemSchema>;
