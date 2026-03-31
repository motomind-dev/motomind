import { prisma } from "./prisma";
import { INTERVALLES_KM, getMaintenanceStatus } from "./utils";
import { sendMaintenanceReminderEmail } from "./email";

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

    const types = [
      "vidange",
      "chaine",
      "pneus",
      "freins",
      "revision_generale",
    ] as const;

    for (const type of types) {
      const dernier = moto.entretiens.find((e) => e.type === type);
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
