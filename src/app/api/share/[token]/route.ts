import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || token.length < 32) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  }

  const moto = await prisma.moto.findFirst({
    where: { shareToken: token, deletedAt: null },
    select: {
      id: true,
      marque: true,
      modele: true,
      annee: true,
      kilometrage: true,
    },
  });

  if (!moto) {
    return NextResponse.json({ error: "Lien introuvable ou expiré" }, { status: 404 });
  }

  const entretiens = await prisma.entretien.findMany({
    where: {
      motoId: moto.id,
      deletedAt: null,
      statut: "termine",
    },
    orderBy: [{ date: "desc" }, { kilometrage: "desc" }],
    select: {
      id: true,
      type: true,
      date: true,
      kilometrage: true,
      note: true,
      garage: true,
      invoiceUrl: true,
      invoiceType: true,
    },
  });

  return NextResponse.json({
    moto: {
      ...moto,
      dateAchat: undefined,
    },
    entretiens,
  });
}
