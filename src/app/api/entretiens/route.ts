import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectivePlanLabel } from "@/lib/plan-access";
import { INTERVALLES_KM } from "@/lib/utils";
import { whereEntretienActive } from "@/lib/prisma-filters";

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

  const intervalleKm = INTERVALLES_KM[type as keyof typeof INTERVALLES_KM] ?? 5000;
  const intervalleJours = 365;

  let dateObj: Date;
  let km: number;
  let nextDueDate: Date | null = null;
  let nextDueMileage: number | null = null;

  if (isUpcoming) {
    dateObj = bodyNextDueDate ? new Date(bodyNextDueDate) : new Date();
    km = bodyNextDueMileage != null && String(bodyNextDueMileage).trim() !== ""
      ? parseInt(String(bodyNextDueMileage), 10)
      : moto.kilometrage;
    if (bodyNextDueDate) nextDueDate = new Date(bodyNextDueDate);
    if (bodyNextDueMileage != null && String(bodyNextDueMileage).trim() !== "") nextDueMileage = parseInt(String(bodyNextDueMileage), 10);
  } else {
    dateObj = new Date(date);
    km = parseInt(String(kilometrage), 10);
    nextDueDate = new Date(dateObj);
    nextDueDate.setDate(nextDueDate.getDate() + intervalleJours);
    nextDueMileage = km + intervalleKm;
  }

  if (!isUpcoming) {
    const existingPlanned = await prisma.entretien.findFirst({
      where: {
        motoId,
        type,
        statut: { in: ["A_VENIR", "proche", "en_retard"] },
        moto: { userId: session.user.id, deletedAt: null },
        deletedAt: null,
      },
    });

    if (existingPlanned) {
      const entretien = await prisma.entretien.update({
        where: { id: existingPlanned.id },
        data: {
          statut: "termine",
          date: dateObj,
          kilometrage: km,
          note: note || null,
          cout: cout != null ? parseFloat(cout) : null,
          garage: garage || null,
          nextDueDate,
          nextDueMileage,
          intervalleKm,
          ...(invoiceUrl != null && invoiceType != null && { invoiceUrl: String(invoiceUrl), invoiceType: String(invoiceType) }),
        },
      });
      return NextResponse.json(entretien);
    }
  }

  const entretien = await prisma.entretien.create({
    data: {
      motoId,
      type,
      date: dateObj,
      kilometrage: km,
      note: note || null,
      cout: cout != null ? parseFloat(cout) : null,
      statut: isUpcoming ? "A_VENIR" : (statut || "termine"),
      garage: garage || null,
      intervalleKm,
      ...(nextDueMileage != null && { nextDueMileage }),
      ...(nextDueDate != null && { nextDueDate }),
      reminderMileageBefore: 500,
      reminderDaysBefore: isUpcoming ? 1 : 30,
      ...(invoiceUrl != null && invoiceType != null && { invoiceUrl: String(invoiceUrl), invoiceType: String(invoiceType) }),
    },
  });

  return NextResponse.json(entretien);
}
