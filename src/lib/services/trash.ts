import { prisma } from "@/lib/prisma";
import { getRemainingRestoreDays } from "./soft-delete";

/** Liste les motos et entretiens soft-deleted pour un utilisateur */
export async function getTrashItems(userId: string) {
  const [motos, entretiens] = await Promise.all([
    prisma.moto.findMany({
      where: { userId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.entretien.findMany({
      where: { moto: { userId }, deletedAt: { not: null } },
      include: { moto: true },
      orderBy: { deletedAt: "desc" },
    }),
  ]);

  return {
    motos: motos.map((m) => ({
      id: m.id,
      marque: m.marque,
      modele: m.modele,
      annee: m.annee,
      deletedAt: m.deletedAt,
      purgeAt: m.purgeAt,
      remainingDays: getRemainingRestoreDays(m.purgeAt),
    })),
    entretiens: entretiens.map((e) => ({
      id: e.id,
      type: e.type,
      date: e.date,
      kilometrage: e.kilometrage,
      moto: { marque: e.moto.marque, modele: e.moto.modele },
      deletedAt: e.deletedAt,
      purgeAt: e.purgeAt,
      remainingDays: getRemainingRestoreDays(e.purgeAt),
      motoDeleted: !!e.moto.deletedAt,
    })),
  };
}
