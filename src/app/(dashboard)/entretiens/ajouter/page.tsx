"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { mutate as globalMutate } from "swr";
import { Button } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import TrashIcon from "@/components/TrashIcon";
import {
  getEntretienStatus,
  getStatusColor,
  getStatusLabel,
} from "@/lib/services/maintenance-status";
import PremiumPaywall from "@/components/PremiumPaywall";
import { SWR_KEYS } from "@/lib/dashboard-swr";
import { revalidateDashboardCrudData } from "@/lib/dashboard-cache";

type Moto = {
  id: string;
  marque: string;
  modele: string;
};

type Entretien = {
  id: string;
  motoId: string;
  type: string;
  date: string;
  kilometrage: number;
  statut?: string;
  nextDueDate?: string | null;
  nextDueMileage?: number | null;
  moto?: { marque: string; modele: string } | null;
  invoiceUrl?: string | null;
  invoiceType?: string | null;
};

export default function AjouterEntretienPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedMotoId = searchParams.get("motoId");
  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);
  const [motos, setMotos] = useState<Moto[]>([]);
  const [entretiens, setEntretiens] = useState<Entretien[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [plan, setPlan] = useState<"FREE" | "PRO">("FREE");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [motoId, setMotoId] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState<"COMPLETED" | "UPCOMING">("COMPLETED");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [kilometrage, setKilometrage] = useState<number | "">("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [nextDueMileage, setNextDueMileage] = useState<number | "">("");

  const motoLabelById = useMemo(() => {
    const map = new Map<string, string>();
    motos.forEach((m) => map.set(m.id, `${m.marque} ${m.modele}`));
    return map;
  }, [motos]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [motosRes, entretiensRes] = await Promise.all([
        fetch("/api/motos?withAccount=1"),
        fetch("/api/entretiens?withAccount=1"),
      ]);

      const motosJson = motosRes.ok ? await motosRes.json() : {};
      const entretiensJson = entretiensRes.ok ? await entretiensRes.json() : {};

      const motosList = motosJson?.motos ?? (Array.isArray(motosJson) ? motosJson : []);
      const entretiensList =
        entretiensJson?.entretiens ?? (Array.isArray(entretiensJson) ? entretiensJson : []);
      const planRaw = motosJson?.plan ?? entretiensJson?.plan ?? "FREE";

      setMotos(motosList);
      setEntretiens(entretiensList);
      setPlan(planRaw === "PRO" ? "PRO" : "FREE");
      setMotoId((current) => {
        if (current) return current;
        if (requestedMotoId && motosList.some((m: Moto) => m.id === requestedMotoId)) {
          return requestedMotoId;
        }
        return motosList[0]?.id ?? "";
      });

      if (editId) {
        const found = entretiensList.find((e: Entretien) => e.id === editId);
        if (found) {
          setMotoId(found.motoId);
          setType(found.type ?? "");
          if (found.statut === "termine") {
            setStatus("COMPLETED");
            setDate(new Date(found.date).toISOString().slice(0, 10));
            setKilometrage(found.kilometrage ?? "");
          } else {
            setStatus("UPCOMING");
            setNextDueDate(found.nextDueDate ? new Date(found.nextDueDate).toISOString().slice(0, 10) : "");
            setNextDueMileage(found.nextDueMileage ?? "");
          }
        }
      }
    } catch {
      setError("Impossible de charger tes motos / entretiens.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, requestedMotoId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!motoId || !type.trim()) {
      setError("Moto et type sont requis.");
      return;
    }
    if (status === "COMPLETED" && (!date || kilometrage === "")) {
      setError("Pour un entretien effectué, date et kilométrage sont requis.");
      return;
    }
    if (status === "UPCOMING" && !nextDueDate && nextDueMileage === "") {
      setError("Pour un entretien à venir, indique au moins la date prévue ou le kilométrage prévu.");
      return;
    }

    setSubmitting(true);
    try {
      let invoiceUrl: string | undefined;
      let invoiceType: string | undefined;

      if (plan === "PRO" && invoiceFile) {
        try {
          const fd = new FormData();
          fd.append("file", invoiceFile);
          const uploadRes = await fetch("/api/invoices/upload", {
            method: "POST",
            body: fd,
          });
          if (uploadRes.ok) {
            const { url, invoiceType: type } = await uploadRes.json();
            invoiceUrl = url;
            invoiceType = type;
          } else {
            console.error("[Ajouter entretien] Upload facture échoué:", await uploadRes.text());
          }
        } catch (uploadErr) {
          console.error("[Ajouter entretien] Upload facture erreur:", uploadErr);
        }
      }

      const payload: Record<string, unknown> = {
        motoId,
        type: type.trim(),
        status,
      };
      if (status === "COMPLETED") {
        payload.date = date;
        payload.kilometrage = kilometrage;
      } else {
        if (nextDueDate) payload.nextDueDate = nextDueDate;
        if (nextDueMileage !== "") payload.nextDueMileage = nextDueMileage;
      }
      if (invoiceUrl && invoiceType) {
        payload.invoiceUrl = invoiceUrl;
        payload.invoiceType = invoiceType;
      }

      const endpoint = editId ? `/api/entretiens/${editId}` : "/api/entretiens";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.log("[Ajouter entretien] POST /api/entretiens failed", await res.text());
        setError("Impossible d'enregistrer l'entretien.");
        return;
      }

      const saved = (await res.json()) as Entretien;
      setEntretiens((prev) =>
        editId ? prev.map((e) => (e.id === saved.id ? { ...e, ...saved } : e)) : [saved, ...prev]
      );
      await globalMutate(
        SWR_KEYS.entretiensPlan,
        (prev: { entretiens: Entretien[]; plan: string } | undefined) =>
          prev
            ? {
                ...prev,
                entretiens: editId
                  ? prev.entretiens.map((e) => (e.id === saved.id ? { ...e, ...saved } : e))
                  : [saved, ...prev.entretiens],
              }
            : prev,
        { revalidate: false }
      );
      await revalidateDashboardCrudData();
      setType("");
      setKilometrage("");
      setNextDueDate("");
      setNextDueMileage("");
      setInvoiceFile(null);
      router.push("/dashboard/entretiens");
    } catch (err) {
      console.log("[Ajouter entretien] fallback", err);
      setError("Impossible d'enregistrer l'entretien.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const prev = entretiens;
    setEntretiens((curr) => curr.filter((e) => e.id !== id));
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/entretiens/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setEntretiens(prev);
        setError("Suppression impossible.");
        return;
      }
      await globalMutate(
        SWR_KEYS.entretiensPlan,
        (cached: { entretiens: Entretien[]; plan: string } | undefined) =>
          cached
            ? { ...cached, entretiens: cached.entretiens.filter((e) => e.id !== id) }
            : cached,
        { revalidate: false }
      );
      await revalidateDashboardCrudData();
    } catch {
      setEntretiens(prev);
      setError("Suppression impossible.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/entretiens"
          className="text-sm text-zinc-500 hover:text-orange-500 mb-4 inline-block"
        >
          ← Retour
        </Link>
        <h1 className="text-2xl font-bold text-white">
          {isEditMode ? "Modifier un entretien" : "Ajouter un entretien"}
        </h1>
        <p className="text-zinc-500 mt-1">
          Enregistre un entretien et retrouve la liste ci-dessous.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Moto</label>
              <select
                value={motoId}
                onChange={(e) => setMotoId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                disabled={loading || isEditMode}
              >
                {motos.length === 0 ? (
                  <option value="">Aucune moto</option>
                ) : (
                  motos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.marque} {m.modele}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Type</label>
              <input
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="ex. vidange, pneus, freins..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                disabled={loading}
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="text-sm text-zinc-400 block">Statut</label>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="COMPLETED"
                    checked={status === "COMPLETED"}
                    onChange={() => setStatus("COMPLETED")}
                    className="text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-white">Entretien effectué</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="UPCOMING"
                    checked={status === "UPCOMING"}
                    onChange={() => setStatus("UPCOMING")}
                    className="text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-white">Entretien à venir</span>
                </label>
              </div>
            </div>

            {status === "COMPLETED" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="mobile-date-input w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm md:text-base text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      disabled={loading}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-500 md:hidden">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M16 3v4M8 3v4M3 10h18" />
                      </svg>
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Kilométrage</label>
                  <input
                    type="number"
                    value={kilometrage}
                    onChange={(e) =>
                      setKilometrage(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    min={0}
                    placeholder="ex. 24500"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    disabled={loading}
                  />
                </div>
              </>
            )}

            {status === "UPCOMING" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Date prévue (optionnel)</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                      className="mobile-date-input w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm md:text-base text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      disabled={loading}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-500 md:hidden">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M16 3v4M8 3v4M3 10h18" />
                      </svg>
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Kilométrage prévu (optionnel)</label>
                  <input
                    type="number"
                    value={nextDueMileage}
                    onChange={(e) =>
                      setNextDueMileage(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    min={0}
                    placeholder="ex. 30000"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    disabled={loading}
                  />
                </div>
              </>
            )}
          </div>

          {plan === "PRO" ? (
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Ajouter une facture (optionnel)</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-zinc-700 file:text-white"
                disabled={loading}
              />
            </div>
          ) : (
            <PremiumPaywall
              title="Fonctionnalité Premium"
              subtitle="Débloque l'ajout de factures pour :"
            />
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || loading || motos.length === 0}>
              {submitting ? "Enregistrement..." : isEditMode ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Tes entretiens</h2>

        {loading ? (
          <p className="text-zinc-500">Chargement...</p>
        ) : entretiens.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <p className="text-zinc-500">Aucun entretien enregistré.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {entretiens.map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-medium">{e.type}</p>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          getStatusColor(
                            getEntretienStatus({
                              isCompleted: e.statut === "termine",
                              currentMileage: e.kilometrage,
                              nextDueMileage: null,
                              nextDueDate: new Date(e.date),
                            })
                          )
                        }`}
                      >
                        {getStatusLabel(
                          getEntretienStatus({
                            isCompleted: e.statut === "termine",
                            currentMileage: e.kilometrage,
                            nextDueMileage: null,
                            nextDueDate: new Date(e.date),
                          })
                        )}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-sm mt-1">
                      {e.moto
                        ? `${e.moto.marque} ${e.moto.modele}`
                        : motoLabelById.get(e.motoId) ?? "Moto"}
                    </p>
                    <p className="text-zinc-500 text-sm">
                      {new Date(e.date).toLocaleDateString("fr-FR")}
                    </p>
                    <p className="text-orange-500 text-sm mt-1">
                      {Number(e.kilometrage).toLocaleString("fr-FR")} km
                    </p>
                    {e.invoiceUrl && (
                      <div className="mt-2">
                        {plan === "PRO" ? (
                          e.invoiceType === "image" ? (
                            <a
                              href={e.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-20 h-20 rounded border border-zinc-600 overflow-hidden"
                            >
                              <Image
                                src={e.invoiceUrl}
                                alt="Facture"
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ) : (
                            <a
                              href={e.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-moto-orange hover:underline"
                            >
                              Voir la facture
                            </a>
                          )
                        ) : (
                          <div className="relative inline-block">
                            <div className="w-16 h-16 rounded bg-zinc-700 blur-sm" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs text-zinc-400">Premium</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
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
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer cet entretien"
        message="L'entretien sera déplacé dans la corbeille. Tu pourras le restaurer pendant 30 jours."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
