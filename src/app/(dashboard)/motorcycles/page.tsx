"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import TrashIcon from "@/components/TrashIcon";
import { Button } from "@/components/ui/Button";
import PremiumPaywall from "@/components/PremiumPaywall";

type Moto = {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  kilometrage: number;
  photo: string | null;
  shareToken?: string | null;
};

export default function MotosPage() {
  const [motos, setMotos] = useState<Moto[]>([]);
  const [loading, setLoading] = useState(true);
  const [canAddMoto, setCanAddMoto] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [plan, setPlan] = useState<"FREE" | "PRO">("FREE");
  const [shareLoading, setShareLoading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/motos").then((r) => r.json()),
      fetch("/api/account/plan").then((r) => r.json()).catch(() => ({ canAddMoto: true, plan: "FREE" })),
    ]).then(([motosData, planData]) => {
      setMotos(Array.isArray(motosData) ? motosData : []);
      setCanAddMoto(planData?.canAddMoto !== false);
      setPlan(planData?.plan === "PRO" ? "PRO" : "FREE");
    }).finally(() => setLoading(false));
  }, []);

  async function handleShare(m: Moto) {
    if (plan !== "PRO") return;
    setShareLoading(m.id);
    try {
      if (m.shareToken) return;
      const res = await fetch("/api/share/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motoId: m.id }),
      });
      if (res.ok) {
        const { token } = await res.json();
        setMotos((prev) =>
          prev.map((x) => (x.id === m.id ? { ...x, shareToken: token } : x))
        );
      }
    } finally {
      setShareLoading(null);
    }
  }

  async function handleRevokeShare(motoId: string) {
    if (plan !== "PRO") return;
    const res = await fetch("/api/share/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motoId }),
    });
    if (res.ok) {
      setMotos((prev) =>
        prev.map((x) => (x.id === motoId ? { ...x, shareToken: null } : x))
      );
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/motos/${id}`, { method: "DELETE" });
    if (res.ok) {
      const next = motos.filter((m) => m.id !== id);
      setMotos(next);
      setDeleteTarget(null);
      if (next.length === 0) setCanAddMoto(true);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Mes motos</h1>
          <p className="text-zinc-500 mt-1">Gérez vos motos</p>
        </div>
        <Button href="/motorcycles/add">+ Ajouter une moto</Button>
      </div>

      {loading ? (
        <p className="text-zinc-500">Chargement...</p>
      ) : motos.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 md:p-8 text-center">
          <p className="text-zinc-500 mb-4">Aucune moto enregistrée.</p>
          <Button href="/motorcycles/add">Ajouter ma première moto</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {motos.map((m) => (
            <div
              key={m.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-5"
            >
              <h3 className="font-semibold text-white text-lg">
                {m.marque} {m.modele}
              </h3>
              <p className="text-zinc-500 text-sm mt-1">{m.annee}</p>
              <p className="text-orange-500 font-medium mt-1">
                {m.kilometrage.toLocaleString("fr-FR")} km
              </p>
              <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap gap-2">
                <Link
                  href={`/motos/${m.id}/edit`}
                  className="inline-flex items-center justify-center min-h-[44px] px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 rounded transition-colors border border-zinc-700 sm:min-h-0"
                >
                  Modifier
                </Link>
                <Link
                  href={`/entretiens/ajouter?motoId=${m.id}`}
                  className="inline-flex items-center justify-center min-h-[44px] px-3 py-1.5 text-sm text-orange-500 hover:bg-zinc-800 rounded transition-colors sm:min-h-0"
                >
                  Ajouter un entretien
                </Link>
                {plan === "PRO" ? (
                  m.shareToken ? (
                    <div className="flex flex-wrap gap-1">
                      <a
                        href={`/share/${m.shareToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center min-h-[44px] px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 rounded transition-colors border border-zinc-600 sm:min-h-0"
                      >
                        Voir le lien
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRevokeShare(m.id)}
                        className="inline-flex items-center justify-center min-h-[44px] px-3 py-1.5 text-sm text-zinc-400 hover:text-red-400 rounded transition-colors sm:min-h-0"
                      >
                        Révoquer
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleShare(m)}
                      disabled={!!shareLoading}
                      className="inline-flex items-center justify-center min-h-[44px] px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 rounded transition-colors border border-zinc-600 sm:min-h-0 disabled:opacity-50"
                    >
                      {shareLoading === m.id ? "..." : "Partager"}
                    </button>
                  )
                ) : (
                  <Link
                    href="/premium"
                    className="inline-flex items-center justify-center min-h-[44px] px-3 py-1.5 text-sm text-zinc-500 border border-zinc-700 rounded hover:border-zinc-600 hover:text-zinc-400 transition-colors sm:min-h-0"
                    title="Fonctionnalité Premium"
                  >
                    Partager
                  </Link>
                )}
                <button
                  onClick={() => setDeleteTarget(m.id)}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-1 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors border border-red-500/30 sm:min-h-0"
                >
                  <TrashIcon className="w-4 h-4" />
                  Supprimer la moto
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && motos.length > 0 && !canAddMoto && (
        <PremiumPaywall
          title="Fonctionnalité Premium"
          subtitle="La version gratuite est limitée à 1 moto. Débloque pour :"
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer la moto"
        message="La moto et ses entretiens seront déplacés dans la corbeille. Vous pourrez les restaurer pendant 30 jours."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
