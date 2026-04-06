"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { formatEntretienType } from "@/lib/utils";
import { jsonFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/dashboard-swr";

type TrashMoto = {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  deletedAt: string | null;
  purgeAt: string | null;
  remainingDays: number | null;
};

type TrashEntretien = {
  id: string;
  type: string;
  date: string;
  kilometrage: number;
  moto: { marque: string; modele: string };
  deletedAt: string | null;
  purgeAt: string | null;
  remainingDays: number | null;
  motoDeleted: boolean;
};

type TrashData = {
  motos: TrashMoto[];
  entretiens: TrashEntretien[];
};

const swrOpts = { dedupingInterval: 60_000, revalidateOnFocus: false };

function invalidateAfterTrashChange() {
  void globalMutate(SWR_KEYS.trash);
  void globalMutate(SWR_KEYS.home);
  void globalMutate(SWR_KEYS.motosPlan);
  void globalMutate(SWR_KEYS.entretiensPlan);
}

export default function TrashPage() {
  const { data, isLoading, error, mutate } = useSWR<TrashData>(
    SWR_KEYS.trash,
    jsonFetcher,
    swrOpts
  );

  const [restoring, setRestoring] = useState<string | null>(null);
  const [forceDeleting, setForceDeleting] = useState<string | null>(null);

  const loading = isLoading && !data;

  async function handleRestoreMoto(id: string) {
    setRestoring(id);
    try {
      const res = await fetch(`/api/motos/${id}/restore`, { method: "POST" });
      if (res.ok) {
        void mutate(
          (prev) =>
            prev ? { ...prev, motos: prev.motos.filter((m) => m.id !== id) } : prev,
          { revalidate: false }
        );
        invalidateAfterTrashChange();
      }
    } finally {
      setRestoring(null);
    }
  }

  async function handleRestoreEntretien(id: string) {
    setRestoring(id);
    try {
      const res = await fetch(`/api/entretiens/${id}/restore`, {
        method: "POST",
      });
      if (res.ok) {
        void mutate(
          (prev) =>
            prev
              ? { ...prev, entretiens: prev.entretiens.filter((e) => e.id !== id) }
              : prev,
          { revalidate: false }
        );
        invalidateAfterTrashChange();
      }
    } finally {
      setRestoring(null);
    }
  }

  async function handleForceDeleteEntretien(id: string) {
    if (!confirm("Supprimer définitivement cet entretien ?")) return;
    setForceDeleting(id);
    try {
      const res = await fetch(`/api/entretiens/${id}/force`, { method: "DELETE" });
      if (res.ok) {
        void mutate(
          (prev) =>
            prev
              ? { ...prev, entretiens: prev.entretiens.filter((e) => e.id !== id) }
              : prev,
          { revalidate: false }
        );
        invalidateAfterTrashChange();
      }
    } finally {
      setForceDeleting(null);
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Corbeille</h1>
        <p className="text-red-400 text-sm">Impossible de charger la corbeille.</p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse" aria-busy="true">
        <h1 className="text-2xl font-bold text-white">Corbeille</h1>
        <div className="h-24 rounded-xl bg-zinc-900 border border-zinc-800" />
      </div>
    );
  }

  const totalCount = data.motos.length + data.entretiens.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Corbeille</h1>
        <p className="text-zinc-500 mt-1">
          Éléments supprimés, restaurables pendant 30 jours
        </p>
      </div>

      {totalCount === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-500">Aucun élément dans la corbeille.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {data.motos.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">
                Motos supprimées ({data.motos.length})
              </h2>
              <div className="space-y-3">
                {data.motos.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {m.marque} {m.modele} ({m.annee})
                      </p>
                      <p className="text-zinc-500 text-sm mt-0.5">
                        Supprimée le{" "}
                        {m.deletedAt
                          ? new Date(m.deletedAt).toLocaleDateString("fr-FR")
                          : "—"}{" "}
                        ·{" "}
                        {m.remainingDays != null && m.remainingDays > 0
                          ? `Encore ${m.remainingDays} jours pour restaurer`
                          : "expirée"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestoreMoto(m.id)}
                      disabled={
                        restoring === m.id ||
                        (m.remainingDays != null && m.remainingDays <= 0)
                      }
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {restoring === m.id
                        ? "Restauration..."
                        : m.remainingDays != null && m.remainingDays <= 0
                          ? "Expiré"
                          : "Restaurer"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.entretiens.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">
                Entretiens supprimés ({data.entretiens.length})
              </h2>
              <div className="space-y-3">
                {data.entretiens.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {formatEntretienType(e.type)} — {e.moto.marque}{" "}
                        {e.moto.modele}
                      </p>
                      <p className="text-zinc-500 text-sm mt-0.5">
                        {e.kilometrage.toLocaleString("fr-FR")} km ·{" "}
                        {new Date(e.date).toLocaleDateString("fr-FR")}
                      </p>
                      <p className="text-zinc-500 text-sm">
                        Supprimé le{" "}
                        {e.deletedAt
                          ? new Date(e.deletedAt).toLocaleDateString("fr-FR")
                          : "—"}{" "}
                        ·{" "}
                        {e.remainingDays != null && e.remainingDays > 0
                          ? `Encore ${e.remainingDays} jours pour restaurer`
                          : "expirée"}
                        {e.motoDeleted && (
                          <span className="text-orange-400">
                            {" "}
                            · Restaure d&apos;abord la moto
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleRestoreEntretien(e.id)}
                        disabled={
                          restoring === e.id ||
                          forceDeleting === e.id ||
                          e.motoDeleted ||
                          (e.remainingDays != null && e.remainingDays <= 0)
                        }
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {restoring === e.id
                          ? "Restauration..."
                          : e.motoDeleted
                            ? "Moto supprimée"
                            : e.remainingDays != null && e.remainingDays <= 0
                              ? "Expiré"
                              : "Restaurer"}
                      </button>
                      <button
                        onClick={() => handleForceDeleteEntretien(e.id)}
                        disabled={restoring === e.id || forceDeleting === e.id}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 text-sm font-medium rounded-lg border border-red-500/30 transition-colors"
                      >
                        {forceDeleting === e.id
                          ? "Suppression..."
                          : "Supprimer définitivement"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
