"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import MaintenanceStatusDot from "@/components/MaintenanceStatusDot";
import type { MaintenanceStatusItem } from "@/lib/maintenance-status";
import { getStatusColor, getStatusLabel } from "@/lib/services/maintenance-status";
import { revalidateDashboardCrudData } from "@/lib/dashboard-cache";

export default function ProchainsEntretiensCard({
  items,
  onComplete,
}: {
  items: MaintenanceStatusItem[];
  onComplete?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleMarkComplete(item: MaintenanceStatusItem) {
    const key = `${item.motoId}-${item.type}`;
    setLoading(key);
    try {
      let res: Response;
      if (item.entretienId) {
        res = await fetch(`/api/entretiens/${item.entretienId}/complete`, {
          method: "PUT",
          credentials: "include",
        });
      } else {
        res = await fetch("/api/entretiens/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ motoId: item.motoId, type: item.type }),
        });
      }
      if (res.ok) {
        onComplete?.();
        await revalidateDashboardCrudData();
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Error completing maintenance:", err);
      }
    } catch (error) {
      console.error("Error completing maintenance:", error);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <p className="text-zinc-500 text-sm">
          {items.length} entretien{items.length !== 1 ? "s" : ""} à prévoir
        </p>
      )}
      {items.length === 0 ? (
        <p className="text-zinc-500 text-sm">
          Aucune échéance proche pour l’instant (bientôt ou en retard). Tu seras alerté quand tu
          t’approcheras du kilométrage ou de la date prévue.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const key = `${item.motoId}-${item.type}`;
            const isLoading = loading === key;
            const intervalConstructeur = item.constructorIntervalKm;
            const showYamahaInterval =
              !item.entretienId &&
              intervalConstructeur != null &&
              intervalConstructeur > 0;

            // Préconisation Yamaha (AUTO) : uniquement l’intervalle grille (6k / 10k), pas le km absolu au compteur
            // (dernier passage + 10k → ex. 11 500 km, ce qui prête à confusion avec « tous les 10 000 km »).
            const dueText =
              showYamahaInterval && intervalConstructeur != null
                ? `tous les ${intervalConstructeur.toLocaleString("fr-FR")} km`
                : item.nextDueMileage != null
                  ? `${item.nextDueMileage.toLocaleString("fr-FR")} km`
                  : item.nextDueDate
                    ? new Date(item.nextDueDate).toLocaleDateString("fr-FR")
                    : "—";

            const kmAvantEcheanceCompteur =
              item.nextDueMileage != null
                ? Math.round(item.nextDueMileage - item.currentMileage)
                : null;

            return (
              <li
                key={key}
                className="flex flex-col gap-4 py-6 border-b border-zinc-800 last:border-0 lg:flex-row lg:items-center lg:justify-between lg:gap-6"
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <MaintenanceStatusDot status={item.status} className="mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-zinc-300 text-sm font-medium flex flex-wrap items-center gap-2">
                      <span>
                        {item.typeLabel} — {item.motoName}
                      </span>
                      {!item.entretienId && (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-zinc-600 text-zinc-400 font-normal">
                          Auto
                        </span>
                      )}
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Échéance : {dueText}
                      {item.status === "SOON" && item.kmRemaining != null && item.kmRemaining > 0 && (
                        <> · Dans {item.kmRemaining.toLocaleString("fr-FR")} km</>
                      )}
                      {item.status === "SOON" && item.daysRemaining != null && item.daysRemaining > 0 && (
                        <> · Dans {item.daysRemaining} jours</>
                      )}
                    </p>
                    {showYamahaInterval && item.nextDueMileage != null && kmAvantEcheanceCompteur != null && (
                      <p className="text-zinc-600 text-[11px] mt-1 leading-snug max-w-md">
                        Prochaine échéance au compteur : {item.nextDueMileage.toLocaleString("fr-FR")} km (dernier passage +{" "}
                        {intervalConstructeur?.toLocaleString("fr-FR")} km). Km restants :{" "}
                        {kmAvantEcheanceCompteur > 0
                          ? `${kmAvantEcheanceCompteur.toLocaleString("fr-FR")} km`
                          : `${kmAvantEcheanceCompteur.toLocaleString("fr-FR")} km`}{" "}
                        = échéance − km actuels.
                      </p>
                    )}
                    <span
                      className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded ${getStatusColor(item.status)}`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-shrink-0 w-full lg:w-auto min-h-[44px]"
                  disabled={isLoading}
                  onClick={() => handleMarkComplete(item)}
                >
                  {isLoading ? "En cours..." : "Marquer comme effectué"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
