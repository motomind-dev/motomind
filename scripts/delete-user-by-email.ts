/**
 * Supprime un utilisateur et les données en cascade (schéma Prisma).
 * Usage : npx dotenv-cli -e .env -- npx tsx scripts/delete-user-by-email.ts <email>
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const raw = process.argv[2]?.trim();
  if (!raw?.includes("@")) {
    console.error(
      "Usage : npx dotenv-cli -e .env -- npx tsx scripts/delete-user-by-email.ts <email>"
    );
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: raw, mode: "insensitive" } },
    select: { id: true, email: true },
  });

  if (!user) {
    console.log("Aucun compte trouvé pour :", raw);
    return;
  }

  await prisma.user.delete({ where: { id: user.id } });
  console.log("Compte supprimé :", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
