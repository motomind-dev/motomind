-- Colonne pour le mail « retard » (J+1) sur entretien planifié.
-- Idempotent : relancer ce script ne change rien si la colonne existe déjà (PostgreSQL).
ALTER TABLE "Entretien" ADD COLUMN IF NOT EXISTS "plannedLateReminderSent" BOOLEAN NOT NULL DEFAULT false;
