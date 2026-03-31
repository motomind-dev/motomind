import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INTERVALLES_KM } from "@/lib/utils";

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
  const intervalleKm = INTERVALLES_KM[entretien.type as keyof typeof INTERVALLES_KM] ?? 5000;
  const nextDueDate = new Date(now);
  nextDueDate.setDate(nextDueDate.getDate() + 365);
  const nextDueMileage = entretien.moto.kilometrage + intervalleKm;

  const updated = await prisma.entretien.update({
    where: { id },
    data: {
      statut: "termine",
      date: now,
      kilometrage: entretien.moto.kilometrage,
      nextDueDate,
      nextDueMileage,
    },
  });

  return NextResponse.json(updated);
}
