/**
 * Supprime les comptes utilisateur dont l'email contient "motomind" (insensible à la casse).
 * Usage : npx tsx scripts/delete-users-email-motomind.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.user.findMany({
    where: { email: { contains: "motomind", mode: "insensitive" } },
    select: { id: true, email: true },
  });

  if (matches.length === 0) {
    console.log("Aucun compte avec « motomind » dans l’email.");
    return;
  }

  console.log("Suppression de", matches.length, "compte(s) :");
  matches.forEach((u) => console.log(" -", u.email));

  const result = await prisma.user.deleteMany({
    where: { email: { contains: "motomind", mode: "insensitive" } },
  });

  console.log("Terminé. Supprimés :", result.count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
