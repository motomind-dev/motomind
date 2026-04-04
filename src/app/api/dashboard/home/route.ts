import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = session.user.id;

  const [motorcyclesCount, motosWithEntretiens, recentMaintenance, plannedEntretiens, userPlan] =
    await Promise.all([
      prisma.moto.count({ where: { userId, deletedAt: null } }),
      prisma.moto.findMany({
        where: { userId, deletedAt: null },
        include: {
          entretiens: {
            where: { statut: "termine", deletedAt: null },
            select: {
              type: true,
              kilometrage: true,
              date: true,
              intervalleKm: true,
              intervalleJours: true,
              reminderMileageBefore: true,
              reminderDaysBefore: true,
            },
          },
        },
      }),
      prisma.entretien.findMany({
        where: { moto: { userId, deletedAt: null }, deletedAt: null },
        include: { moto: true },
        orderBy: { date: "desc" },
        take: 10,
      }),
      prisma.entretien.findMany({
        where: {
          moto: { userId, deletedAt: null },
          deletedAt: null,
          statut: { in: ["A_VENIR", "proche", "en_retard"] },
          OR: [{ nextDueDate: { not: null } }, { nextDueMileage: { not: null } }],
        },
        include: {
          moto: { select: { marque: true, modele: true, kilometrage: true } },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      }),
    ]);

  return NextResponse.json({
    userName: session.user.name ?? null,
    motorcycleCount: motorcyclesCount,
    motosWithEntretiens,
    recentMaintenance,
    plannedEntretiens,
    plan: userPlan?.plan === "PRO" ? "PRO" : "FREE",
  });
}
