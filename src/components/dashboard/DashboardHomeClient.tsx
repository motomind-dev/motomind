"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatEntretienType } from "@/lib/utils";
import { jsonFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/dashboard-swr";
import ReminderChecker from "@/components/ReminderChecker";
import PremiumBanner from "@/components/PremiumBanner";
import ProchainsEntretiensCard from "@/components/ProchainsEntretiensCard";
import WelcomeCard from "@/components/onboarding/WelcomeCard";
import {
  plannedEntretiensToStatusItems,
  type MaintenanceStatusItem,
} from "@/lib/maintenance-status";
import {
  getEntretienStatus,
  getStatusColor,
  getStatusDotColor,
  getStatusLabel,
} from "@/lib/services/maintenance-status";

type HomePayload = {
  userName: string | null;
  motorcycleCount: number;
  recentMaintenance: Array<{
    id: string;
    type: string;
    date: string;
    kilometrage: number;
    statut: string;
    moto: { marque: string; modele: string };
  }>;
  plannedEntretiens: Array<{
    id: string;
    motoId: string;
    type: string;
    nextDueDate: string | null;
    nextDueMileage: number | null;
    reminderMileageBefore: number;
    reminderDaysBefore: number;
    moto: { marque: string; modele: string; kilometrage: number };
  }>;
  plan: "FREE" | "PRO";
  /** Présent si préconisations auto Premium activées (fusion planifié + calculé). */
  prochainsMaintenanceItems?: Array<{
    motoId: string;
    motoName: string;
    type: string;
    typeLabel: string;
    status: MaintenanceStatusItem["status"];
    nextDueMileage: number | null;
    nextDueDate: string | null;
    currentMileage: number;
    kmRemaining: number | null;
    daysRemaining: number | null;
    entretienId: string | null;
  }>;
};

const swrOptions = {
  dedupingInterval: 60_000,
  revalidateOnFocus: false,
};

export default function DashboardHomeClient() {
  const { data, error, isLoading } = useSWR<HomePayload>(
    SWR_KEYS.home,
    jsonFetcher,
    swrOptions
  );

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-red-400 text-sm">
          Impossible de charger le tableau de bord. Réessaie dans un instant.
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-pulse" aria-busy="true">
        <div className="h-8 w-56 bg-zinc-800 rounded-lg" />
        <div className="h-4 w-72 bg-zinc-800/70 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-36 rounded-xl border border-zinc-800 bg-zinc-900/80" />
          <div className="h-36 rounded-xl border border-zinc-800 bg-zinc-900/80" />
        </div>
      </div>
    );
  }

  const maintenanceStatusItems = useMemo(() => {
    if (data.prochainsMaintenanceItems) {
      return data.prochainsMaintenanceItems.map((row) => ({
        motoId: row.motoId,
        motoName: row.motoName,
        type: row.type,
        typeLabel: row.typeLabel,
        status: row.status,
        nextDueMileage: row.nextDueMileage,
        nextDueDate: row.nextDueDate ? new Date(row.nextDueDate) : null,
        currentMileage: row.currentMileage,
        kmRemaining: row.kmRemaining,
        daysRemaining: row.daysRemaining,
        entretienId: row.entretienId ?? undefined,
      }));
    }
    return plannedEntretiensToStatusItems(
      data.plannedEntretiens.map((e) => ({
        id: e.id,
        motoId: e.motoId,
        type: e.type,
        nextDueDate: e.nextDueDate ? new Date(e.nextDueDate) : null,
        nextDueMileage: e.nextDueMileage,
        reminderMileageBefore: e.reminderMileageBefore,
        reminderDaysBefore: e.reminderDaysBefore,
        moto: e.moto,
      }))
    );
  }, [data.plannedEntretiens, data.prochainsMaintenanceItems]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <ReminderChecker />
      <PremiumBanner plan={data.plan} />
      {data.motorcycleCount === 0 && <WelcomeCard userName={data.userName} />}
      <div>
        <h1 className="text-2xl font-bold text-white mb-4">Tableau de bord</h1>
        <p className="text-zinc-500">Vue d&apos;ensemble de tes motos et entretiens</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="space-y-4">
            <CardHeader title="Total motos" />
            <p className="text-3xl font-bold text-orange-500">{data.motorcycleCount}</p>
            <Button href="/motorcycles/add" variant="primary" size="sm">
              Ajouter une moto
            </Button>
          </div>
        </Card>

        <Card>
          <div className="space-y-4 flex flex-col min-h-0">
            <CardHeader
              title="Prochains entretiens"
              subtitle="Tes maintenances à prévoir"
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
              {data.recentMaintenance.length === 0 ? (
                <p className="text-zinc-500 text-sm">Aucun entretien enregistré</p>
              ) : (
                <ul className="space-y-3">
                  {data.recentMaintenance.map((m) => {
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
