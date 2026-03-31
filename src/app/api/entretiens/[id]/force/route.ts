import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Suppression définitive d'un entretien déjà en corbeille (deletedAt !== null).
 * Ne supprime JAMAIS un enregistrement actif.
 */
export async function DELETE(
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
      moto: { userId: session.user.id },
      deletedAt: { not: null },
    },
  });

  if (!entretien) {
    return NextResponse.json(
      { error: "Entretien non trouvé ou déjà actif" },
      { status: 404 }
    );
  }

  await prisma.entretien.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
