import { prisma } from "@/lib/prisma";

const RESTORE_DAYS = 30;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getRemainingRestoreDays(purgeAt: Date | null): number | null {
  if (!purgeAt) return null;
  const now = new Date();
  if (now >= purgeAt) return 0;
  return Math.ceil((purgeAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function isRestorable(purgeAt: Date | null): boolean {
  if (!purgeAt) return false;
  return new Date() < purgeAt;
}

/** Soft delete une moto et tous ses entretiens */
export async function softDeleteMoto(id: string, userId: string) {
  const moto = await prisma.moto.findFirst({
    where: { id, userId, deletedAt: null },
    include: { entretiens: { where: { deletedAt: null } } },
  });
  if (!moto) return null;

  const now = new Date();
  const purgeAt = addDays(now, RESTORE_DAYS);

  await prisma.$transaction([
    ...moto.entretiens.map((e) =>
      prisma.entretien.update({
        where: { id: e.id },
        data: { deletedAt: now, purgeAt },
      })
    ),
    prisma.moto.update({
      where: { id },
      data: { deletedAt: now, purgeAt },
    }),
  ]);

  return { id, deletedAt: now, purgeAt };
}

/** Soft delete un entretien */
export async function softDeleteEntretien(id: string, userId: string) {
  const entretien = await prisma.entretien.findFirst({
    where: { id, moto: { userId }, deletedAt: null },
  });
  if (!entretien) return null;

  const now = new Date();
  const purgeAt = addDays(now, RESTORE_DAYS);

  await prisma.entretien.update({
    where: { id },
    data: { deletedAt: now, purgeAt },
  });

  return { id, deletedAt: now, purgeAt };
}

/** Restaure une moto et ses entretiens soft-deleted liés */
export async function restoreMoto(id: string, userId: string) {
  const moto = await prisma.moto.findFirst({
    where: { id, userId, deletedAt: { not: null } },
    include: { entretiens: { where: { deletedAt: { not: null } } } },
  });
  if (!moto) return null;
  if (!isRestorable(moto.purgeAt)) return { error: "expired" };

  await prisma.$transaction([
    ...moto.entretiens.map((e) =>
      prisma.entretien.update({
        where: { id: e.id },
        data: { deletedAt: null, purgeAt: null },
      })
    ),
    prisma.moto.update({
      where: { id },
      data: { deletedAt: null, purgeAt: null },
    }),
  ]);

  return { id };
}

/** Restaure un entretien (si la moto parente est active) */
export async function restoreEntretien(id: string, userId: string) {
  const entretien = await prisma.entretien.findFirst({
    where: { id, moto: { userId }, deletedAt: { not: null } },
    include: { moto: true },
  });
  if (!entretien) return null;
  if (!isRestorable(entretien.purgeAt)) return { error: "expired" };
  if (entretien.moto.deletedAt) return { error: "moto_deleted" };

  await prisma.entretien.update({
    where: { id },
    data: { deletedAt: null, purgeAt: null },
  });

  return { id };
}

/** Purge définitive des données expirées */
export async function purgeExpired(): Promise<{
  motosDeleted: number;
  entretiensDeleted: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let motosDeleted = 0;
  let entretiensDeleted = 0;

  try {
    const toPurgeMotos = await prisma.moto.findMany({
      where: { deletedAt: { not: null }, purgeAt: { lte: now } },
      select: { id: true },
    });

    const toPurgeEntretiens = await prisma.entretien.findMany({
      where: { deletedAt: { not: null }, purgeAt: { lte: now } },
      select: { id: true, motoId: true },
    });

    const entretienIdsToPurge = toPurgeEntretiens.map((e) => e.id);
    const motoIdsToPurge = toPurgeMotos.map((m) => m.id);

    if (entretienIdsToPurge.length > 0) {
      const result = await prisma.entretien.deleteMany({
        where: { id: { in: entretienIdsToPurge } },
      });
      entretiensDeleted = result.count;
    }

    if (motoIdsToPurge.length > 0) {
      const result = await prisma.moto.deleteMany({
        where: { id: { in: motoIdsToPurge } },
      });
      motosDeleted = result.count;
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Erreur purge");
  }

  return { motosDeleted, entretiensDeleted, errors };
}
