import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatEntretienType } from "@/lib/utils";
import ReminderChecker from "@/components/ReminderChecker";
import PremiumBanner from "@/components/PremiumBanner";
import ProchainsEntretiensCard from "@/components/ProchainsEntretiensCard";
import WelcomeCard from "@/components/onboarding/WelcomeCard";
import {
  computeMaintenanceStatusItems,
  plannedEntretiensToStatusItems,
  mergeMaintenanceItems,
} from "@/lib/maintenance-status";
import {
  getEntretienStatus,
  getStatusColor,
  getStatusLabel,
  getStatusDotColor,
} from "@/lib/services/maintenance-status";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

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
          OR: [
            { nextDueDate: { not: null } },
            { nextDueMileage: { not: null } },
          ],
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

  const computedItems = computeMaintenanceStatusItems(motosWithEntretiens);
  const plannedItems = plannedEntretiensToStatusItems(
    plannedEntretiens.map((e) => ({
      id: e.id,
      motoId: e.motoId,
      type: e.type,
      nextDueDate: e.nextDueDate,
      nextDueMileage: e.nextDueMileage,
      reminderMileageBefore: e.reminderMileageBefore,
      reminderDaysBefore: e.reminderDaysBefore,
      moto: e.moto,
    }))
  );
  const maintenanceStatusItems = mergeMaintenanceItems(computedItems, plannedItems);

  const plan = userPlan?.plan === "PRO" ? "PRO" : "FREE";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <ReminderChecker />
      <PremiumBanner plan={plan} />
      {motorcyclesCount === 0 && (
        <WelcomeCard userName={session.user.name} />
      )}
      <div>
        <h1 className="text-2xl font-bold text-white mb-4">Tableau de bord</h1>
        <p className="text-zinc-500">
          Vue d&apos;ensemble de vos motos et entretiens
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="space-y-4">
            <CardHeader title="Total motos" />
            <p className="text-3xl font-bold text-orange-500">
              {motorcyclesCount}
            </p>
            <Button href="/motorcycles/add" variant="primary" size="sm">
              Ajouter une moto
            </Button>
          </div>
        </Card>

        <Card>
          <div className="space-y-4 flex flex-col min-h-0">
            <CardHeader
              title="Prochains entretiens"
              subtitle="Vos maintenances à prévoir"
              action={
                <Button href="/entretiens/ajouter" variant="primary" size="sm">
                  Ajouter un entretien
                </Button>
              }
            />
            <div className="max-h-[300px] overflow-y-auto -mx-1 px-1">
              <ProchainsEntretiensCard items={maintenanceStatusItems} />
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <div className="space-y-4 flex flex-col min-h-0">
            <CardHeader
              title="Entretiens récents"
              subtitle="10 derniers enregistrements"
              action={
                <Button href="/history" variant="ghost" size="sm">
                  Voir l&apos;historique
                </Button>
              }
            />
            <div className="max-h-[300px] overflow-y-auto -mx-1 px-1">
              {recentMaintenance.length === 0 ? (
                <p className="text-zinc-500 text-sm">Aucun entretien enregistré</p>
              ) : (
                <ul className="space-y-3">
                  {recentMaintenance.map((m) => {
                    const displayStatus = getEntretienStatus({
                      isCompleted: m.statut === "termine",
                      currentMileage: m.kilometrage,
                      nextDueMileage: null,
                      nextDueDate: new Date(m.date),
                    });

                    return (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-zinc-300 font-medium truncate">
                            {formatEntretienType(m.type)} — {m.moto.marque} {m.moto.modele}
                          </p>
                          <p className="text-zinc-500 text-xs mt-0.5">
                            {new Date(m.date).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${getStatusColor(displayStatus)}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDotColor(displayStatus)}`}
                          />
                          {getStatusLabel(displayStatus)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
