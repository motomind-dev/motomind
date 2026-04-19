import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getEffectiveIntervalKmForCategory,
  hasRevisionPreconizationKmSource,
  nextYamahaGridDueMileage,
  resolveIntervalleJoursForCategory,
} from "@/lib/auto-revision-intervals";
import {
  entretienMatchesCategory,
  getMaintenanceCategoryForType,
  isAutoPrecomputedMaintenanceCategory,
} from "@/lib/maintenance-entretien-category";

/**
 * Marque un entretien comme effectué en créant un nouvel enregistrement termine.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: { motoId?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format invalide" }, { status: 400 });
  }

  const { motoId, type } = body;
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
  const autoCompute =
    isAutoPrecomputedMaintenanceCategory(category) &&
    hasRevisionPreconizationKmSource(motoCtx);

  const intervalleKmResolved = autoCompute
    ? getEffectiveIntervalKmForCategory("revision_generale", motoCtx, undefined)
    : null;

  const intervalleJours =
    autoCompute && category != null
      ? resolveIntervalleJoursForCategory(category, undefined, motoCtx)
      : null;

  const now = new Date();
  let nextDueDate: Date | null = null;
  let nextDueMileage: number | null = null;
  if (
    autoCompute &&
    intervalleKmResolved != null &&
    intervalleKmResolved > 0
  ) {
    if (intervalleJours != null && intervalleJours > 0) {
      nextDueDate = new Date(now);
      nextDueDate.setDate(nextDueDate.getDate() + intervalleJours);
    }
    nextDueMileage = nextYamahaGridDueMileage(
      moto.kilometrage,
      intervalleKmResolved
    );
  }

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

  if (existingPlanned) {
    const entretien = await prisma.entretien.update({
      where: { id: existingPlanned.id },
      data: {
        statut: "termine",
        date: now,
        kilometrage: moto.kilometrage,
        nextDueDate,
        nextDueMileage,
        intervalleKm: autoCompute ? intervalleKmResolved : null,
        intervalleJours: autoCompute ? intervalleJours : null,
      },
    });
    return NextResponse.json(entretien);
  }

  const entretien = await prisma.entretien.create({
    data: {
      motoId,
      type,
      date: now,
      kilometrage: moto.kilometrage,
      statut: "termine",
      intervalleKm: autoCompute ? intervalleKmResolved : null,
      intervalleJours: autoCompute ? intervalleJours : null,
      nextDueMileage,
      nextDueDate,
      reminderMileageBefore: 500,
      reminderDaysBefore: 30,
    },
  });

  return NextResponse.json(entretien);
}
