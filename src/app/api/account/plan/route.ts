import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectivePlanLabel } from "@/lib/plan-access";
import { whereMotoActive } from "@/lib/prisma-filters";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const plan = effectivePlanLabel(user.plan);
  const motoCount = await prisma.moto.count({
    where: whereMotoActive(session.user.id),
  });

  const canAddMoto = plan === "PRO" || motoCount < 1;

  return NextResponse.json({ plan, canAddMoto });
}
