import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getEffectiveIntervalKmForCategory,
  getMergedIntervalKmForCategory,
  nextRevisionDueMileage,
  resolveIntervalleJoursForCategory,
} from "@/lib/auto-revision-intervals";
import {
  getMaintenanceCategoryForType,
  isAutoPrecomputedMaintenanceCategory,
} from "@/lib/maintenance-entretien-category";
import { kilometrageAtCompletion } from "@/lib/entretien-km";

/**
 * Marque un entretien planifié comme effectué (mise à jour par ID).
 */
export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID requis" }, { status: 400 });
  }

  const entretien = await prisma.entretien.findFirst({
    where: {
      id,
      moto: { userId: session.user.id, deletedAt: null },
      deletedAt: null,
    },
    include: { moto: true },
  });

  if (!entretien) {
    return NextResponse.json({ error: "Entretien non trouvé" }, { status: 404 });
  }

  const now = new Date();
  const motoCtx = {
    marque: entretien.moto.marque,
    modele: entretien.moto.modele,
    annee: entretien.moto.annee,
    cylindreeCm3: entretien.moto.cylindreeCm3 ?? null,
  };

  const category = getMaintenanceCategoryForType(entretien.type);
  const planNextRevisionKm =
    category != null && isAutoPrecomputedMaintenanceCategory(category);

  let intervalleKmResolved = planNextRevisionKm
    ? getEffectiveIntervalKmForCategory("revision_generale", motoCtx, undefined)
    : null;
  if (
    planNextRevisionKm &&
    (intervalleKmResolved == null || intervalleKmResolved <= 0)
  ) {
    intervalleKmResolved = getMergedIntervalKmForCategory("revision_generale");
  }

  const intervalleJours =
    planNextRevisionKm && category != null
      ? resolveIntervalleJoursForCategory(category, undefined, motoCtx)
      : null;

  const kmRevision = kilometrageAtCompletion(
    entretien.moto.kilometrage,
    entretien
  );

  const newMotoKm = Math.max(entretien.moto.kilometrage, kmRevision);

  let nextDueDate: Date | null = null;
  let nextDueMileage: number | null = null;
  if (
    planNextRevisionKm &&
    intervalleKmResolved != null &&
    intervalleKmResolved > 0
  ) {
    if (intervalleJours != null && intervalleJours > 0) {
      nextDueDate = new Date(now);
      nextDueDate.setDate(nextDueDate.getDate() + intervalleJours);
    }
    nextDueMileage = nextRevisionDueMileage(
      kmRevision,
      intervalleKmResolved,
      newMotoKm
    );
  }

  const [, updated] = await prisma.$transaction([
    prisma.moto.update({
      where: { id: entretien.motoId },
      data: { kilometrage: newMotoKm },
    }),
    prisma.entretien.update({
      where: { id },
      data: {
        statut: "termine",
        date: now,
        kilometrage: kmRevision,
        nextDueDate,
        nextDueMileage,
        intervalleKm: planNextRevisionKm ? intervalleKmResolved : null,
        intervalleJours: planNextRevisionKm ? intervalleJours : null,
      },
    }),
  ]);

  return NextResponse.json(updated);
}
