"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatEntretienType } from "@/lib/utils";
import {
  getEntretienStatus,
  getStatusColor,
  getStatusLabel,
} from "@/lib/services/maintenance-status";
import ConfirmDialog from "@/components/ConfirmDialog";
import TrashIcon from "@/components/TrashIcon";
import EntretienInvoiceManager from "@/components/EntretienInvoiceManager";

type Entretien = {
  id: string;
  motoId: string;
  type: string;
  date: string;
  kilometrage: number;
  note: string | null;
  statut?: string;
  moto: { marque: string; modele: string };
  invoiceUrl?: string | null;
  invoiceType?: string | null;
};

export default function EntretiensPage() {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");

  const [entretiens, setEntretiens] = useState<Entretien[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [plan, setPlan] = useState<"FREE" | "PRO">("FREE");

  const filteredEntretiens = useMemo(() => {
    if (filter === "upcoming") {
      return entretiens.filter((e) => e.statut !== "termine");
    }
    return entretiens;
  }, [entretiens, filter]);

  useEffect(() => {
    fetch("/api/entretiens?withAccount=1")
      .then((r) => r.json())
      .then((data) => {
        if (data?.entretiens) {
          setEntretiens(data.entretiens);
          setPlan(data.plan === "PRO" ? "PRO" : "FREE");
        } else {
          setEntretiens(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => setEntretiens([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/entretiens/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntretiens((prev) => prev.filter((e) => e.id !== id));
      setDeleteTarget(null);
    }
  }

  const pageTitle = filter === "upcoming" ? "Prochains entretiens" : "Tous les entretiens";
  const pageSubtitle =
    filter === "upcoming"
      ? "Vos maintenances à prévoir"
      : "Liste de vos entretiens de maintenance";

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
          <p className="text-zinc-500 mt-1">{pageSubtitle}</p>
        </div>
        <Link
          href="/entretiens/ajouter"
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg w-fit transition-colors"
        >
          + Ajouter un entretien
        </Link>
      </div>

      {loading ? (
        <div className="text-zinc-500">Chargement...</div>
      ) : filteredEntretiens.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-500 mb-4">
            {filter === "upcoming" ? "Aucun entretien à prévoir." : "Aucun entretien enregistré."}
          </p>
          <Link
            href="/entretiens/ajouter"
            className="inline-block px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
          >
            Ajouter un entretien
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEntretiens.map((e) => (
            <div
              key={e.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-white font-medium text-lg">
                  {formatEntretienType(e.type)}
                </p>
                {(() => {
                  const displayStatus = getEntretienStatus({
                    isCompleted: e.statut === "termine",
                    currentMileage: e.kilometrage,
                    nextDueMileage: null,
                    nextDueDate: new Date(e.date),
                  });

                  return (
                <span
                  className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${getStatusColor(displayStatus)}`}
                >
                  {getStatusLabel(displayStatus)}
                </span>
                  );
                })()}
              </div>
              <p className="text-zinc-500 text-sm mt-1">
                {e.moto.marque} {e.moto.modele}
              </p>
              <p className="text-zinc-500 text-sm">
                {new Date(e.date).toLocaleDateString("fr-FR")}
              </p>
              <p className="text-orange-500 text-sm mt-1">
                {e.kilometrage.toLocaleString("fr-FR")} km
              </p>
              <EntretienInvoiceManager
                plan={plan}
                entretienId={e.id}
                invoiceUrl={e.invoiceUrl}
                invoiceType={e.invoiceType}
                onInvoiceChanged={({ invoiceUrl, invoiceType }) => {
                  setEntretiens((prev) =>
                    prev.map((x) =>
                      x.id === e.id ? { ...x, invoiceUrl, invoiceType } : x
                    )
                  );
                }}
              />
              <div className="mt-4 flex gap-2 justify-end">
                <Link
                  href={`/entretiens/ajouter?motoId=${e.motoId}&edit=${e.id}`}
                  className="px-3 py-1.5 border border-zinc-600 text-zinc-300 rounded-lg hover:bg-zinc-800 text-sm transition-colors"
                >
                  Modifier
                </Link>
                <button
                  onClick={() => setDeleteTarget(e.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                  title="Supprimer"
                >
                  <TrashIcon className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer cet entretien"
        message="L'entretien sera déplacé dans la corbeille. Vous pourrez le restaurer pendant 30 jours."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
