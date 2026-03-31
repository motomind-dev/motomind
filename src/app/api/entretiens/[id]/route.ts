import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { softDeleteEntretien } from "@/lib/services/soft-delete";
import { whereEntretienActive } from "@/lib/prisma-filters";

async function checkEntretienOwnership(id: string, userId: string) {
  const entretien = await prisma.entretien.findFirst({
    where: { id, ...whereEntretienActive(userId) },
    include: { moto: true },
  });
  return entretien;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const entretien = await checkEntretienOwnership(id, session.user.id);
  if (!entretien) {
    return NextResponse.json({ error: "Entretien non trouvé" }, { status: 404 });
  }

  const body = await req.json();
  const { type, date, kilometrage, note, cout, statut, garage, invoiceUrl, invoiceType } = body;

  if (invoiceUrl !== undefined || invoiceType !== undefined) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });
    if (!user || user.plan !== "PRO") {
      return NextResponse.json(
        { error: "Fonctionnalité réservée aux abonnés Premium" },
        { status: 403 }
      );
    }
  }

  const updated = await prisma.entretien.update({
    where: { id },
    data: {
      ...(type && { type }),
      ...(date && { date: new Date(date) }),
      ...(kilometrage !== undefined && { kilometrage: parseInt(kilometrage, 10) }),
      ...(note !== undefined && { note }),
      ...(cout !== undefined && { cout: parseFloat(cout) }),
      ...(statut && { statut }),
      ...(garage !== undefined && { garage }),
      ...(invoiceUrl !== undefined && { invoiceUrl: invoiceUrl || null }),
      ...(invoiceType !== undefined && { invoiceType: invoiceType || null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const entretien = await checkEntretienOwnership(id, session.user.id);
  if (!entretien) {
    return NextResponse.json({ error: "Entretien non trouvé" }, { status: 404 });
  }

  const result = await softDeleteEntretien(id, session.user.id);
  if (!result) {
    return NextResponse.json({ error: "Suppression impossible" }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
