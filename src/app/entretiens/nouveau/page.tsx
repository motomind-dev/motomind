"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import TrashIcon from "@/components/TrashIcon";

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
  moto?: { marque: string; modele: string } | null;
};

export default function Page() {
  const [motos, setMotos] = useState<Moto[]>([]);
  const [entretiens, setEntretiens] = useState<Entretien[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [motoId, setMotoId] = useState("");
  const [type, setType] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [kilometrage, setKilometrage] = useState<number | "">("");

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
        fetch("/api/motos"),
        fetch("/api/entretiens"),
      ]);

      const motosJson = motosRes.ok ? await motosRes.json() : [];
      const entretiensJson = entretiensRes.ok ? await entretiensRes.json() : [];

      setMotos(Array.isArray(motosJson) ? motosJson : []);
      setEntretiens(Array.isArray(entretiensJson) ? entretiensJson : []);
      if (!motoId && Array.isArray(motosJson) && motosJson.length > 0) {
        setMotoId(motosJson[0].id);
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
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!motoId || !type.trim() || !date || kilometrage === "") {
      setError("Moto, type, date et kilométrage sont requis.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        motoId,
        type: type.trim(),
        date,
        kilometrage,
      };

      const res = await fetch("/api/entretiens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Safe fallback: do not crash if API rejects
        console.log("[Ajouter entretien] POST /api/entretiens failed", await res.text());
        setError("Impossible d'enregistrer l'entretien.");
        return;
      }

      const created = (await res.json()) as Entretien;
      setEntretiens((prev) => [created, ...prev]);
      setType("");
      setKilometrage("");
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
      }
    } catch {
      setEntretiens(prev);
      setError("Suppression impossible.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Ajouter un entretien</h1>
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
                disabled={loading}
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

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                disabled={loading}
              />
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
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || loading || motos.length === 0}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
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
                  <div>
                    <p className="text-white font-medium">{e.type}</p>
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
