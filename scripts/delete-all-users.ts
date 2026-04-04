/**
 * Supprime tous les utilisateurs et les données d’auth / sécurité associées.
 * Les motos, entretiens, comptes OAuth et sessions suivent le onDelete: Cascade du schéma User.
 *
 * Usage : npx tsx scripts/delete-all-users.ts --yes
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.argv.includes("--yes")) {
    const n = await prisma.user.count();
    console.error(
      `Refusé : ${n} utilisateur(s) en base. Pour supprimer, relance avec : npx tsx scripts/delete-all-users.ts --yes`
    );
    process.exit(1);
  }

  const before = await prisma.user.count();
  console.log("Suppression de", before, "utilisateur(s) et données liées…");

  await prisma.$transaction([
    prisma.knownDevice.deleteMany({}),
    prisma.securityEvent.deleteMany({}),
    prisma.passwordResetToken.deleteMany({}),
    prisma.verificationToken.deleteMany({}),
    prisma.user.deleteMany({}),
  ]);

  const after = await prisma.user.count();
  console.log("Terminé. Utilisateurs restants :", after);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
