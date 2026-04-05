import { prisma } from "./prisma";
import { INTERVALLES_KM, getMaintenanceStatus } from "./utils";
import {
  sendMaintenanceReminderEmail,
  sendPlannedEntretienReminderEmail,
  sendPlannedEntretienOverdueEmail,
} from "./email";
import {
  MAINTENANCE_CATEGORIES,
  entretienMatchesCategory,
} from "./maintenance-entretien-category";

export {
  entretienMatchesCategory,
  MAINTENANCE_CATEGORIES,
} from "./maintenance-entretien-category";

/**
 * Entretien planifié par l’utilisateur (Premium) :
 * - avec `nextDueDate` : envoi **uniquement** le jour calendaire J-1 (veille de l’échéance) ;
 * - sans date, avec `nextDueMileage` seul : inchangé (km dans la fenêtre `reminderKmBefore`).
 */
function shouldNotifyPlannedEntretien(
  currentKm: number,
  nextDueDate: Date | null,
  nextDueMileage: number | null,
  reminderKmBefore: number
): boolean {
  const hasDate =
    nextDueDate != null && !Number.isNaN(new Date(nextDueDate).getTime());

  if (hasDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(nextDueDate!);
    due.setHours(0, 0, 0, 0);
    const dayBeforeDue = new Date(due);
    dayBeforeDue.setDate(dayBeforeDue.getDate() - 1);
    return today.getTime() === dayBeforeDue.getTime();
  }

  if (nextDueMileage != null) {
    const dueKm = Number(nextDueMileage);
    if (!Number.isNaN(dueKm)) {
      return (
        currentKm >= dueKm || currentKm >= dueKm - reminderKmBefore
      );
    }
  }

  return false;
}

/**
 * Avec `nextDueDate` : mail « retard » **uniquement** le jour calendaire J+1 (lendemain de la date prévue).
 */
function shouldNotifyPlannedEntretienOverdueByDate(nextDueDate: Date | null): boolean {
  if (nextDueDate == null || Number.isNaN(new Date(nextDueDate).getTime())) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate);
  due.setHours(0, 0, 0, 0);
  const dayAfterDue = new Date(due);
  dayAfterDue.setDate(dayAfterDue.getDate() + 1);
  return today.getTime() === dayAfterDue.getTime();
}

/**
 * Rappels e-mail pour les fiches « à venir » créées / planifiées par l’utilisateur (Premium).
 * Un seul envoi par fiche (reminderSent), comme pour l’autre flux.
 */
async function checkPlannedEntretienReminders(
  userId: string,
  userEmail: string
): Promise<{ sent: number; errors: string[] }> {
  const planned = await prisma.entretien.findMany({
    where: {
      deletedAt: null,
      reminderSent: false,
      statut: { in: ["A_VENIR", "proche", "en_retard"] },
      moto: { userId, deletedAt: null },
      OR: [
        { nextDueDate: { not: null } },
        { nextDueMileage: { not: null } },
      ],
    },
    include: {
      moto: { select: { marque: true, modele: true, kilometrage: true } },
    },
  });

  let sent = 0;
  const errors: string[] = [];

  for (const e of planned) {
    const kmBefore = e.reminderMileageBefore ?? 500;
    const currentKm = e.moto.kilometrage;

    if (
      !shouldNotifyPlannedEntretien(
        currentKm,
        e.nextDueDate,
        e.nextDueMileage,
        kmBefore
      )
    ) {
      continue;
    }

    const result = await sendPlannedEntretienReminderEmail(
      userEmail,
      {
        type: e.type,
        nextDueDate: e.nextDueDate,
        nextDueMileage: e.nextDueMileage,
      },
      {
        marque: e.moto.marque,
        modele: e.moto.modele,
      }
    );

    if (result.success) {
      await prisma.entretien.update({
        where: { id: e.id },
        data: { reminderSent: true },
      });
      sent++;
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  return { sent, errors };
}

/**
 * Mail « retard » pour entretien planifié avec date : **un seul** envoi le jour J+1 (`plannedLateReminderSent`).
 */
async function checkPlannedEntretienOverdueByDateReminders(
  userId: string,
  userEmail: string
): Promise<{ sent: number; errors: string[] }> {
  const planned = await prisma.entretien.findMany({
    where: {
      deletedAt: null,
      plannedLateReminderSent: false,
      nextDueDate: { not: null },
      statut: { in: ["A_VENIR", "proche", "en_retard"] },
      moto: { userId, deletedAt: null },
    },
    include: {
      moto: { select: { marque: true, modele: true, kilometrage: true } },
    },
  });

  let sent = 0;
  const errors: string[] = [];

  for (const e of planned) {
    if (!shouldNotifyPlannedEntretienOverdueByDate(e.nextDueDate)) {
      continue;
    }

    const result = await sendPlannedEntretienOverdueEmail(
      userEmail,
      {
        type: e.type,
        nextDueDate: e.nextDueDate,
        nextDueMileage: e.nextDueMileage,
      },
      {
        marque: e.moto.marque,
        modele: e.moto.modele,
      }
    );

    if (result.success) {
      await prisma.entretien.update({
        where: { id: e.id },
        data: { plannedLateReminderSent: true },
      });
      sent++;
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  return { sent, errors };
}

/**
 * Rappels e-mail Premium — deux flux distincts (e-mail uniquement, pas de push) :
 * 1) Ancienne logique : échéance calculée depuis le dernier entretien **terminé** (SOON / OVERDUE au km ou à la date).
 * 2) Entretiens **planifiés** par l’utilisateur (fiches A_VENIR / proche / en_retard avec nextDueDate / nextDueMileage).
 */
export async function checkMaintenanceReminders(
  userId: string
): Promise<{ sent: number; errors: string[] }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, plan: true },
  });
  if (!user?.email || user.plan !== "PRO") {
    return { sent: 0, errors: [] };
  }

  let sent = 0;
  const errors: string[] = [];

  const motos = await prisma.moto.findMany({
    where: { userId, deletedAt: null },
    include: {
      entretiens: {
        where: { statut: "termine", deletedAt: null },
        orderBy: { kilometrage: "desc" },
      },
    },
  });

  for (const moto of motos) {
    for (const type of MAINTENANCE_CATEGORIES) {
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
        user.email,
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

  const planned = await checkPlannedEntretienReminders(userId, user.email);
  sent += planned.sent;
  errors.push(...planned.errors);

  const plannedOverdue = await checkPlannedEntretienOverdueByDateReminders(
    userId,
    user.email
  );
  sent += plannedOverdue.sent;
  errors.push(...plannedOverdue.errors);

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
