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
  entretienMatchesCategory,
  getMaintenanceCategoryForType,
  isAutoPrecomputedMaintenanceCategory,
} from "@/lib/maintenance-entretien-category";
import { kilometrageAtCompletion } from "@/lib/entretien-km";

/**
 * Marque un entretien comme effectué en créant un nouvel enregistrement termine.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: { motoId?: string; type?: string; completedAtKm?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format invalide" }, { status: 400 });
  }

  const { motoId, type, completedAtKm } = body;
  if (!motoId || !type) {
    return NextResponse.json(
      { error: "Moto et type requis" },
      { status: 400 }
    );
  }

  const moto = await prisma.moto.findFirst({
    where: { id: motoId, userId: session.user.id, deletedAt: null },
  });

  if (!moto) {
    return NextResponse.json({ error: "Moto non trouvée" }, { status: 404 });
  }

  const validTypes = ["vidange", "chaine", "pneus", "freins", "revision_generale"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  }

  const motoCtx = {
    marque: moto.marque,
    modele: moto.modele,
    annee: moto.annee,
    cylindreeCm3: moto.cylindreeCm3 ?? null,
  };

  const category = getMaintenanceCategoryForType(type);
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

  const categoryForMatch = getMaintenanceCategoryForType(type);
  const plannedCandidates = await prisma.entretien.findMany({
    where: {
      motoId,
      statut: { in: ["A_VENIR", "proche", "en_retard"] },
      moto: { userId: session.user.id, deletedAt: null },
      deletedAt: null,
    },
  });
  const existingPlanned =
    plannedCandidates.find((e) =>
      categoryForMatch != null
        ? entretienMatchesCategory(e.type, categoryForMatch)
        : e.type === type
    ) ?? null;

  /** Révision auto : palier complété (ex. 10 000 km) via le client ; sinon km issu du plan ou du compteur. */
  let kmRevision = moto.kilometrage;
  if (
    planNextRevisionKm &&
    type === "revision_generale" &&
    typeof completedAtKm === "number" &&
    Number.isFinite(completedAtKm) &&
    completedAtKm > 0 &&
    completedAtKm < 1_000_000
  ) {
    kmRevision = Math.round(completedAtKm);
  } else if (existingPlanned) {
    kmRevision = kilometrageAtCompletion(moto.kilometrage, existingPlanned);
  }

  const newMotoKm = Math.max(moto.kilometrage, kmRevision);

  const now = new Date();
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

  if (existingPlanned) {
    const [, entretien] = await prisma.$transaction([
      prisma.moto.update({
        where: { id: motoId },
        data: { kilometrage: newMotoKm },
      }),
      prisma.entretien.update({
        where: { id: existingPlanned.id },
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
    return NextResponse.json(entretien);
  }

  const [, entretien] = await prisma.$transaction([
    prisma.moto.update({
      where: { id: motoId },
      data: { kilometrage: newMotoKm },
    }),
    prisma.entretien.create({
      data: {
        motoId,
        type,
        date: now,
        kilometrage: kmRevision,
        statut: "termine",
        intervalleKm: planNextRevisionKm ? intervalleKmResolved : null,
        intervalleJours: planNextRevisionKm ? intervalleJours : null,
        nextDueMileage,
        nextDueDate,
        reminderMileageBefore: 500,
        reminderDaysBefore: 15,
      },
    }),
  ]);

  return NextResponse.json(entretien);
}
