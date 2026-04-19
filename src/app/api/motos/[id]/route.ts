import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { softDeleteMoto } from "@/lib/services/soft-delete";
import { whereMotoActive } from "@/lib/prisma-filters";
import { updateMotorcycleBodySchema } from "@/lib/validators/motorcycle";

async function checkMotoOwnership(id: string, userId: string) {
  const moto = await prisma.moto.findFirst({
    where: { id, ...whereMotoActive(userId) },
  });
  return moto;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const moto = await checkMotoOwnership(id, session.user.id);
  if (!moto) {
    return NextResponse.json({ error: "Moto non trouvée" }, { status: 404 });
  }

  return NextResponse.json(moto);
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
  const moto = await checkMotoOwnership(id, session.user.id);
  if (!moto) {
    return NextResponse.json({ error: "Moto non trouvée" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateMotorcycleBodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Données invalides";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const d = parsed.data;
  const updated = await prisma.moto.update({
    where: { id },
    data: {
      ...(d.marque !== undefined && { marque: d.marque }),
      ...(d.modele !== undefined && { modele: d.modele }),
      ...(d.annee !== undefined && { annee: d.annee }),
      ...(d.kilometrage !== undefined && { kilometrage: d.kilometrage }),
      ...(d.photo !== undefined && { photo: d.photo }),
      ...(d.dateAchat !== undefined && { dateAchat: d.dateAchat }),
      ...(d.cylindreeCm3 !== undefined && { cylindreeCm3: d.cylindreeCm3 ?? null }),
    },
  });

  return NextResponse.json(updated);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(req, { params });
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
  const moto = await checkMotoOwnership(id, session.user.id);
  if (!moto) {
    return NextResponse.json({ error: "Moto non trouvée" }, { status: 404 });
  }

  const result = await softDeleteMoto(id, session.user.id);
  if (!result) {
    return NextResponse.json({ error: "Suppression impossible" }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
