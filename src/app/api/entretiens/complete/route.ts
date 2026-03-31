import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INTERVALLES_KM } from "@/lib/utils";

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

  const intervalleKm = INTERVALLES_KM[type] ?? 5000;
  const now = new Date();
  const nextDueDate = new Date(now);
  nextDueDate.setDate(nextDueDate.getDate() + 365);
  const nextDueMileage = moto.kilometrage + intervalleKm;

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
        date: now,
        kilometrage: moto.kilometrage,
        nextDueDate,
        nextDueMileage,
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
      intervalleKm,
      nextDueMileage,
      nextDueDate,
      reminderMileageBefore: 500,
      reminderDaysBefore: 30,
    },
  });

  return NextResponse.json(entretien);
}
