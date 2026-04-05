/**
 * Usage : npx tsx scripts/run-reminder-check.ts [email]
 * Lit la BDD (.env) et exécute checkMaintenanceReminders (comme /api/reminders/check).
 */

import { prisma } from "../src/lib/prisma";
import { checkMaintenanceReminders } from "../src/lib/reminders";
import { entretienMatchesCategory } from "../src/lib/maintenance-entretien-category";
import { getMaintenanceStatus, INTERVALLES_KM } from "../src/lib/utils";

const email =
  process.argv[2] || process.env.TEST_USER_EMAIL || "djibril_k@outlook.fr";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, plan: true, email: true },
  });
  if (!user) {
    console.error("Utilisateur introuvable :", email);
    process.exit(1);
  }
  console.log("Compte :", user.email, "| Plan :", user.plan);

  const motos = await prisma.moto.findMany({
    where: { userId: user.id, deletedAt: null },
    include: {
      entretiens: {
        where: { statut: "termine", deletedAt: null },
        orderBy: { kilometrage: "desc" },
      },
    },
  });

  for (const m of motos) {
    console.log(
      `\n— ${m.marque} ${m.modele} | Kilométrage actuel : ${m.kilometrage.toLocaleString("fr-FR")} km`
    );
    const types = [
      "vidange",
      "chaine",
      "pneus",
      "freins",
      "revision_generale",
    ] as const;
    for (const type of types) {
      const dernier = m.entretiens.find((e) =>
        entretienMatchesCategory(e.type, type)
      );
      if (!dernier) continue;
      const intervalle =
        dernier.intervalleKm ?? INTERVALLES_KM[type] ?? 5000;
      const nextDueKm = dernier.kilometrage + intervalle;
      const nextDueDate = dernier.intervalleJours
        ? (() => {
            const d = new Date(dernier.date);
            d.setDate(d.getDate() + dernier.intervalleJours!);
            return d;
          })()
        : null;
      const status = getMaintenanceStatus(
        m.kilometrage,
        nextDueKm,
        nextDueDate,
        dernier.reminderMileageBefore ?? 500,
        dernier.reminderDaysBefore ?? 30
      );
      console.log(
        `  ${type} | dernier ${dernier.kilometrage} km | échéance ~${nextDueKm} km | statut ${status} | reminderSent=${dernier.reminderSent}`
      );
    }
  }

  console.log("\n→ Exécution checkMaintenanceReminders()…");
  const { sent, errors } = await checkMaintenanceReminders(user.id);
  console.log("   emails envoyés :", sent);
  if (errors.length) console.log("   erreurs :", errors);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
