import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPremiumAccess } from "@/lib/plan-access";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  if (!user || !hasPremiumAccess(user.plan)) {
    return NextResponse.json(
      { error: "Fonctionnalité réservée aux abonnés Premium" },
      { status: 403 }
    );
  }

  let body: { motoId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format invalide" }, { status: 400 });
  }

  const { motoId } = body;
  if (!motoId || typeof motoId !== "string") {
    return NextResponse.json(
      { error: "motoId requis" },
      { status: 400 }
    );
  }

  const moto = await prisma.moto.findFirst({
    where: { id: motoId, userId: session.user.id, deletedAt: null },
  });
  if (!moto) {
    return NextResponse.json({ error: "Moto non trouvée" }, { status: 404 });
  }

  await prisma.moto.update({
    where: { id: motoId },
    data: { shareToken: null },
  });

  return NextResponse.json({ success: true });
}
