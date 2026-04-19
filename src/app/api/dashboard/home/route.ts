import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectivePlanLabel, hasPremiumAccess } from "@/lib/plan-access";
import { isPremiumAutoPreconizationEnabled } from "@/lib/auto-revision-intervals";
import {
  computeMaintenanceStatusItems,
  mergeMaintenanceItems,
  plannedEntretiensToStatusItems,
  type PlannedEntretien,
} from "@/lib/maintenance-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProchainItemJson = {
  motoId: string;
  motoName: string;
  type: string;
  typeLabel: string;
  status: string;
  nextDueMileage: number | null;
  nextDueDate: string | null;
  currentMileage: number;
  kmRemaining: number | null;
  daysRemaining: number | null;
  entretienId: string | null;
  constructorIntervalKm: number | null;
};

function safeDateToIso(d: Date | null | undefined): string | null {
  if (d == null) return null;
  const ms = d.getTime();
  if (Number.isNaN(ms)) return null;
  return d.toISOString();
}

function serializeProchainsItems(
  items: ReturnType<typeof mergeMaintenanceItems>
): ProchainItemJson[] {
  return items.map((item) => ({
    motoId: item.motoId,
    motoName: item.motoName,
    type: item.type,
    typeLabel: item.typeLabel,
    status: item.status,
    nextDueMileage: item.nextDueMileage,
    nextDueDate: safeDateToIso(item.nextDueDate),
    currentMileage: item.currentMileage,
    kmRemaining: item.kmRemaining,
    daysRemaining: item.daysRemaining,
    entretienId: item.entretienId ?? null,
    constructorIntervalKm: item.constructorIntervalKm ?? null,
  }));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = session.user.id;

  const [motorcyclesCount, recentMaintenance, plannedEntretiens, userPlan] =
    await Promise.all([
      prisma.moto.count({ where: { userId, deletedAt: null } }),
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

  const planLabel = effectivePlanLabel(userPlan?.plan);

  let prochainsMaintenanceItems: ProchainItemJson[] | undefined;

  if (
    isPremiumAutoPreconizationEnabled() &&
    hasPremiumAccess(userPlan?.plan)
  ) {
    try {
      const motosFull = await prisma.moto.findMany({
        where: { userId, deletedAt: null },
        include: {
          entretiens: {
            where: { statut: "termine", deletedAt: null },
            orderBy: [{ kilometrage: "desc" }, { date: "desc" }],
          },
        },
      });

      const motosForCompute = motosFull.map((m) => ({
        id: m.id,
        marque: m.marque,
        modele: m.modele,
        annee: m.annee,
        cylindreeCm3: m.cylindreeCm3 ?? null,
        kilometrage: m.kilometrage,
        entretiens: m.entretiens.map((e) => ({
          type: e.type,
          kilometrage: e.kilometrage,
          date: e.date,
          intervalleKm: e.intervalleKm,
          intervalleJours: e.intervalleJours,
          reminderMileageBefore: e.reminderMileageBefore,
          reminderDaysBefore: e.reminderDaysBefore,
        })),
      }));

      const computed = computeMaintenanceStatusItems(motosForCompute);

      const planned: PlannedEntretien[] = plannedEntretiens.map((e) => ({
        id: e.id,
        motoId: e.motoId,
        type: e.type,
        nextDueDate: e.nextDueDate,
        nextDueMileage: e.nextDueMileage,
        reminderMileageBefore: e.reminderMileageBefore,
        reminderDaysBefore: e.reminderDaysBefore,
        moto: e.moto,
      }));

      const plannedItems = plannedEntretiensToStatusItems(planned);
      const merged = mergeMaintenanceItems(computed, plannedItems);
      prochainsMaintenanceItems = serializeProchainsItems(merged);
    } catch (err) {
      console.error("[dashboard/home] prochainsMaintenanceItems", err);
      prochainsMaintenanceItems = [];
    }
  }

  return NextResponse.json({
    userName: session.user.name ?? null,
    motorcycleCount: motorcyclesCount,
    recentMaintenance,
    plannedEntretiens,
    plan: planLabel,
    ...(prochainsMaintenanceItems !== undefined && {
      prochainsMaintenanceItems,
    }),
  });
}
