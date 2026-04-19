import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectivePlanLabel } from "@/lib/plan-access";
import {
  FIRST_UNIVERSAL_REVISION_KM,
  getEffectiveIntervalKmForCategory,
  getMergedIntervalKmForCategory,
  hasRevisionPreconizationKmSource,
  nextRevisionDueMileage,
  resolveIntervalleJoursForCategory,
} from "@/lib/auto-revision-intervals";
import {
  getMaintenanceCategoryForType,
  isAutoPrecomputedMaintenanceCategory,
} from "@/lib/maintenance-entretien-category";
import { whereEntretienActive } from "@/lib/prisma-filters";
import { kilometrageAtCompletion } from "@/lib/entretien-km";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const motoId = searchParams.get("motoId");
  const withAccount = searchParams.get("withAccount") === "1";

  const baseWhere = whereEntretienActive(session.user.id);
  const where = motoId ? { ...baseWhere, motoId } : baseWhere;

  const orderBy = [{ date: "desc" as const }, { kilometrage: "desc" as const }];

  if (withAccount) {
    const [entretiens, user] = await Promise.all([
      prisma.entretien.findMany({
        where,
        include: { moto: true },
        orderBy,
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { plan: true },
      }),
    ]);
    const plan = effectivePlanLabel(user?.plan);
    return NextResponse.json({ entretiens, plan });
  }

  const entretiens = await prisma.entretien.findMany({
    where,
    include: { moto: true },
    orderBy,
  });

  return NextResponse.json(entretiens);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json();
  const {
    motoId,
    type,
    status,
    date,
    kilometrage,
    nextDueDate: bodyNextDueDate,
    nextDueMileage: bodyNextDueMileage,
    note,
    cout,
    statut,
    garage,
    invoiceUrl,
    invoiceType,
  } = body;

  if (!motoId || !type) {
    return NextResponse.json(
      { error: "Moto et type requis" },
      { status: 400 }
    );
  }

  const isUpcoming = status === "UPCOMING" || statut === "A_VENIR";

  if (!isUpcoming) {
    if (!date || kilometrage === undefined) {
      return NextResponse.json(
        { error: "Pour un entretien effectué, date et kilométrage sont requis" },
        { status: 400 }
      );
    }
  } else {
    const hasDate = bodyNextDueDate != null && String(bodyNextDueDate).trim() !== "";
    const hasMileage = bodyNextDueMileage !== undefined && bodyNextDueMileage !== null && String(bodyNextDueMileage).trim() !== "";
    if (!hasDate && !hasMileage) {
      return NextResponse.json(
        { error: "Pour un entretien à venir, indique au moins la date prévue ou le kilométrage prévu" },
        { status: 400 }
      );
    }
  }

  const moto = await prisma.moto.findFirst({
    where: { id: motoId, userId: session.user.id, deletedAt: null },
  });
  if (!moto) {
    return NextResponse.json({ error: "Moto non trouvée" }, { status: 404 });
  }

  const motoCtx = {
    marque: moto.marque,
    modele: moto.modele,
    annee: moto.annee,
    cylindreeCm3: moto.cylindreeCm3 ?? null,
  };

  const category = getMaintenanceCategoryForType(String(type));
  const planNextRevisionKm =
    !isUpcoming &&
    category != null &&
    isAutoPrecomputedMaintenanceCategory(category);

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

  let dateObj: Date;
  let km: number;
  let nextDueDate: Date | null = null;
  let nextDueMileage: number | null = null;
  let existingPlannedCompleted: Awaited<
    ReturnType<typeof prisma.entretien.findFirst>
  > = null;

  if (isUpcoming) {
    dateObj = bodyNextDueDate ? new Date(bodyNextDueDate) : new Date();
    km = bodyNextDueMileage != null && String(bodyNextDueMileage).trim() !== ""
      ? parseInt(String(bodyNextDueMileage), 10)
      : moto.kilometrage;
    if (bodyNextDueDate) nextDueDate = new Date(bodyNextDueDate);
    if (bodyNextDueMileage != null && String(bodyNextDueMileage).trim() !== "") nextDueMileage = parseInt(String(bodyNextDueMileage), 10);
  } else {
    dateObj = new Date(date);
    const kmParsed = parseInt(String(kilometrage), 10);
    if (Number.isNaN(kmParsed)) {
      return NextResponse.json(
        { error: "Kilométrage invalide" },
        { status: 400 }
      );
    }

    existingPlannedCompleted = await prisma.entretien.findFirst({
      where: {
        motoId,
        type,
        statut: { in: ["A_VENIR", "proche", "en_retard"] },
        moto: { userId: session.user.id, deletedAt: null },
        deletedAt: null,
      },
    });

    km = existingPlannedCompleted
      ? Math.max(
          kmParsed,
          kilometrageAtCompletion(moto.kilometrage, existingPlannedCompleted)
        )
      : Math.max(moto.kilometrage, kmParsed);

    if (
      planNextRevisionKm &&
      intervalleKmResolved != null &&
      intervalleKmResolved > 0
    ) {
      if (intervalleJours != null && intervalleJours > 0) {
        nextDueDate = new Date(dateObj);
        nextDueDate.setDate(nextDueDate.getDate() + intervalleJours);
      }
      const newMotoKmForNext = Math.max(moto.kilometrage, km);
      nextDueMileage = nextRevisionDueMileage(
        km,
        intervalleKmResolved,
        newMotoKmForNext
      );
    }

    if (
      planNextRevisionKm &&
      !hasRevisionPreconizationKmSource(motoCtx) &&
      nextDueMileage != null &&
      nextDueMileage !== FIRST_UNIVERSAL_REVISION_KM
    ) {
      nextDueMileage = null;
      nextDueDate = null;
    }
  }

  const newMotoKmCompleted = !isUpcoming
    ? Math.max(moto.kilometrage, km)
    : moto.kilometrage;

  if (!isUpcoming && existingPlannedCompleted) {
    const [, entretien] = await prisma.$transaction([
      prisma.moto.update({
        where: { id: motoId },
        data: { kilometrage: newMotoKmCompleted },
      }),
      prisma.entretien.update({
        where: { id: existingPlannedCompleted.id },
        data: {
          statut: "termine",
          date: dateObj,
          kilometrage: km,
          note: note || null,
          cout: cout != null ? parseFloat(cout) : null,
          garage: garage || null,
          nextDueDate: planNextRevisionKm ? nextDueDate : null,
          nextDueMileage: planNextRevisionKm ? nextDueMileage : null,
          intervalleKm: planNextRevisionKm ? intervalleKmResolved : null,
          intervalleJours: planNextRevisionKm ? intervalleJours : null,
          ...(invoiceUrl != null && invoiceType != null && {
            invoiceUrl: String(invoiceUrl),
            invoiceType: String(invoiceType),
          }),
        },
      }),
    ]);
    return NextResponse.json(entretien);
  }

  if (!isUpcoming) {
    const [, entretien] = await prisma.$transaction([
      prisma.moto.update({
        where: { id: motoId },
        data: { kilometrage: newMotoKmCompleted },
      }),
      prisma.entretien.create({
        data: {
          motoId,
          type,
          date: dateObj,
          kilometrage: km,
          note: note || null,
          cout: cout != null ? parseFloat(cout) : null,
          statut: statut || "termine",
          garage: garage || null,
          intervalleKm: planNextRevisionKm ? intervalleKmResolved : null,
          intervalleJours: planNextRevisionKm ? intervalleJours : null,
          ...(nextDueMileage != null && { nextDueMileage }),
          ...(nextDueDate != null && { nextDueDate }),
          reminderMileageBefore: 500,
          reminderDaysBefore: 15,
          ...(invoiceUrl != null && invoiceType != null && {
            invoiceUrl: String(invoiceUrl),
            invoiceType: String(invoiceType),
          }),
        },
      }),
    ]);
    return NextResponse.json(entretien);
  }

  const entretien = await prisma.entretien.create({
    data: {
      motoId,
      type,
      date: dateObj,
      kilometrage: km,
      note: note || null,
      cout: cout != null ? parseFloat(cout) : null,
      statut: "A_VENIR",
      garage: garage || null,
      intervalleKm: null,
      intervalleJours: null,
      ...(nextDueMileage != null && { nextDueMileage }),
      ...(nextDueDate != null && { nextDueDate }),
      reminderMileageBefore: 500,
      reminderDaysBefore: 1,
      ...(invoiceUrl != null && invoiceType != null && {
        invoiceUrl: String(invoiceUrl),
        invoiceType: String(invoiceType),
      }),
    },
  });

  return NextResponse.json(entretien);
}
