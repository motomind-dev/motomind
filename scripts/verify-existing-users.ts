/**
 * Script one-shot : vérifier tous les utilisateurs existants (avant l'activation de la vérification d'email).
 * À exécuter une seule fois après la migration du schéma.
 *
 * npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/verify-existing-users.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { verificationToken: null },
    data: { emailVerified: true },
  });
  console.log(`${result.count} utilisateur(s) marqué(s) comme vérifié(s).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
