/**
 * Envoie les deux modèles Premium : rappel planifié (type J-1) et retard (type J+1).
 * Données fictives — ne modifie pas la base.
 *
 * Usage : npx dotenv-cli -e .env -- npx tsx scripts/send-test-planned-emails.ts [email]
 */
import {
  sendPlannedEntretienReminderEmail,
  sendPlannedEntretienOverdueEmail,
} from "../src/lib/email";

const to =
  process.argv[2]?.trim() || "djibril_k@outlook.fr";

if (!to.includes("@")) {
  console.error("Adresse email invalide.");
  process.exit(1);
}

const motorcycle = { marque: "Yamaha", modele: "MT-07" };

// Date affichée dans les mails (exemple cohérent)
const nextDue = new Date();
nextDue.setDate(nextDue.getDate() + 3);
nextDue.setHours(12, 0, 0, 0);

async function main() {
  console.log("Envoi J-1 (template rappel planifié) →", to);
  const r1 = await sendPlannedEntretienReminderEmail(
    to,
    {
      type: "vidange",
      nextDueDate: nextDue,
      nextDueMileage: 24_000,
    },
    motorcycle
  );
  if (!r1.success) {
    console.error("J-1 échec :", r1.error);
    process.exit(1);
  }
  console.log("J-1 OK.");

  console.log("Envoi J+1 (template retard planifié) →", to);
  const r2 = await sendPlannedEntretienOverdueEmail(
    to,
    {
      type: "revision_generale",
      nextDueDate: nextDue,
      nextDueMileage: null,
    },
    motorcycle
  );
  if (!r2.success) {
    console.error("J+1 échec :", r2.error);
    process.exit(1);
  }
  console.log("J+1 OK.");
  console.log("Vérifie ta boîte (et les courriers indésirables).");
}

main();
