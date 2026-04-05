import { prisma } from "./prisma";
import { INTERVALLES_KM, getMaintenanceStatus } from "./utils";
import { sendMaintenanceReminderEmail } from "./email";

const REMINDER_CATEGORIES = [
  "vidange",
  "chaine",
  "pneus",
  "freins",
  "revision_generale",
] as const;

type ReminderCategory = (typeof REMINDER_CATEGORIES)[number];

/**
 * L’UI / imports peuvent enregistrer `type` en minuscule, en majuscules ou avec un libellé
 * (ex. « L’huile moteur », « FREIN »). On mappe vers la catégorie métier pour les rappels.
 */
export function entretienMatchesCategory(
  storedType: string,
  category: ReminderCategory
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

/**
 * Vérifie les entretiens à venir et envoie les emails de rappel si nécessaire.
 * Envoie uniquement pour SOON et OVERDUE, une seule fois par entretien (reminderSent).
 */
export async function checkMaintenanceReminders(
  userId: string
): Promise<{ sent: number; errors: string[] }> {
  const motos = await prisma.moto.findMany({
    where: { userId, deletedAt: null },
    include: {
      user: { select: { email: true, plan: true } },
      entretiens: {
        where: { statut: "termine", deletedAt: null },
        orderBy: { kilometrage: "desc" },
      },
    },
  });

  const user = motos[0]?.user;
  if (!user || user.plan !== "PRO") {
    return { sent: 0, errors: [] };
  }

  let sent = 0;
  const errors: string[] = [];

  for (const moto of motos) {
    const userEmail = moto.user?.email;
    if (!userEmail) continue;

    for (const type of REMINDER_CATEGORIES) {
      const dernier = moto.entretiens.find((e) =>
        entretienMatchesCategory(e.type, type)
      );
      if (!dernier) continue;

      const intervalle = dernier.intervalleKm ?? INTERVALLES_KM[type] ?? 5000;
      const nextDueKm = dernier.kilometrage + intervalle;
      const nextDueDate = dernier.intervalleJours
        ? (() => {
            const d = new Date(dernier.date);
            d.setDate(d.getDate() + dernier.intervalleJours!);
            return d;
          })()
        : null;
      const status = getMaintenanceStatus(
        moto.kilometrage,
        nextDueKm,
        nextDueDate,
        dernier.reminderMileageBefore ?? 500,
        dernier.reminderDaysBefore ?? 30
      );

      if (status !== "SOON" && status !== "OVERDUE") continue;
      if (dernier.reminderSent) continue;

      const result = await sendMaintenanceReminderEmail(
        userEmail,
        {
          type,
          nextDueMileage: nextDueKm,
        },
        {
          marque: moto.marque,
          modele: moto.modele,
        }
      );

      if (result.success && dernier) {
        await prisma.entretien.update({
          where: { id: dernier.id },
          data: { reminderSent: true },
        });
        sent++;
      } else if (result.error) {
        errors.push(result.error);
      }
    }
  }

  return { sent, errors };
}

/**
 * Vérifie les rappels pour tous les utilisateurs (utilisé par le cron).
 */
export async function checkAllMaintenanceReminders(): Promise<{
  sent: number;
  errors: string[];
}> {
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  let totalSent = 0;
  const allErrors: string[] = [];

  for (const user of users) {
    const { sent, errors } = await checkMaintenanceReminders(user.id);
    totalSent += sent;
    allErrors.push(...errors);
  }

  return { sent: totalSent, errors: allErrors };
}
