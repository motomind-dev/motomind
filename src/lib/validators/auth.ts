import { z } from "zod";

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;
const MAX_NAME_LENGTH = 100;

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Email requis")
    .email("Email invalide")
    .max(255)
    .transform((v) => v.trim().toLowerCase()),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Minimum ${MIN_PASSWORD_LENGTH} caractères`)
    .max(MAX_PASSWORD_LENGTH),
  name: z
    .preprocess(
      (val) =>
        val === "" || val === null || val === undefined ? undefined : val,
      z.string().min(1).max(MAX_NAME_LENGTH).optional()
    )
    .optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email requis")
    .email("Email invalide")
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, "Mot de passe requis"),
});

export const resetPasswordRequestSchema = z.object({
  email: z
    .string()
    .min(1, "Email requis")
    .email("Email invalide")
    .max(255)
    .transform((v) => v.trim().toLowerCase()),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token requis"),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Minimum ${MIN_PASSWORD_LENGTH} caractères`)
      .max(MAX_PASSWORD_LENGTH),
    confirmPassword: z.string().min(1, "Confirmez le mot de passe"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
