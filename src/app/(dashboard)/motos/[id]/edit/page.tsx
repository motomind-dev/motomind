"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { mutate as globalMutate } from "swr";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SWR_KEYS } from "@/lib/dashboard-swr";
import { revalidateDashboardCrudData } from "@/lib/dashboard-cache";

type Moto = {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  kilometrage: number;
  cylindreeCm3?: number | null;
};

export default function EditMotoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [annee, setAnnee] = useState(new Date().getFullYear().toString());
  const [kilometrage, setKilometrage] = useState("");
  const [cylindreeCm3, setCylindreeCm3] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/motos/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Moto non trouvée");
        return r.json();
      })
      .then((m: Moto) => {
        setMarque(m.marque ?? "");
        setModele(m.modele ?? "");
        setAnnee(String(m.annee ?? new Date().getFullYear()));
        setKilometrage(String(m.kilometrage ?? 0));
        setCylindreeCm3(m.cylindreeCm3 != null ? String(m.cylindreeCm3) : "");
      })
      .catch(() => setError("Impossible de charger la moto."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const ccRaw = cylindreeCm3.trim();
    let cylindreeValue: number | null;
    if (ccRaw === "") {
      cylindreeValue = null;
    } else {
      const n = parseInt(ccRaw, 10);
      if (Number.isNaN(n) || n < 1 || n > 3000) {
        setError("Cylindrée : entre 1 et 3000 cm³, ou laisse vide.");
        setSubmitting(false);
        return;
      }
      cylindreeValue = n;
    }

    const res = await fetch(`/api/motos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marque: marque.trim(),
        modele: modele.trim(),
        annee: parseInt(annee, 10) || new Date().getFullYear(),
        kilometrage: parseInt(kilometrage, 10) || 0,
        cylindreeCm3: cylindreeValue,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur lors de la mise à jour");
      setSubmitting(false);
      return;
    }

    await globalMutate(
      SWR_KEYS.motosPlan,
      (prev: {
        motos: Moto[];
        plan: string;
        canAddMoto: boolean;
      } | undefined) =>
        prev
          ? {
              ...prev,
              motos: prev.motos.map((m) => (m.id === id ? { ...m, ...data } : m)),
            }
          : prev,
      { revalidate: false }
    );
    await revalidateDashboardCrudData();
    router.push("/motorcycles");
  }

  const inputClass =
    "w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500";

  if (loading) {
    return (
      <div className="space-y-8 max-w-xl">
        <Link
          href="/motorcycles"
          className="text-sm text-zinc-500 hover:text-orange-500 mb-4 inline-block"
        >
          ← Retour aux motos
        </Link>
        <p className="text-zinc-500">Chargement...</p>
      </div>
    );
  }

  if (error && !marque && !modele) {
    return (
      <div className="space-y-8 max-w-xl">
        <Link
          href="/motorcycles"
          className="text-sm text-zinc-500 hover:text-orange-500 mb-4 inline-block"
        >
          ← Retour aux motos
        </Link>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <Link
          href="/motorcycles"
          className="text-sm text-zinc-500 hover:text-orange-500 mb-4 inline-block"
        >
          ← Retour aux motos
        </Link>
        <h1 className="text-2xl font-bold text-white">Modifier la moto</h1>
        <p className="text-zinc-500 mt-1">Mets à jour les informations de ta moto</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Marque
              </label>
              <input
                type="text"
                value={marque}
                onChange={(e) => setMarque(e.target.value)}
                required
                placeholder="ex. Honda, Yamaha"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Modèle
              </label>
              <input
                type="text"
                value={modele}
                onChange={(e) => setModele(e.target.value)}
                required
                placeholder="ex. X-ADV 750"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Année
              </label>
              <input
                type="number"
                value={annee}
                onChange={(e) => setAnnee(e.target.value)}
                required
                min="1900"
                max={new Date().getFullYear() + 1}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Kilométrage (km)
              </label>
              <input
                type="number"
                value={kilometrage}
                onChange={(e) => setKilometrage(e.target.value)}
                min="0"
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Cylindrée (cm³) — optionnel
            </label>
            <input
              type="number"
              value={cylindreeCm3}
              onChange={(e) => setCylindreeCm3(e.target.value)}
              min={1}
              max={3000}
              placeholder="ex. 125, 689, 998…"
              className={inputClass}
            />
            <p className="text-xs text-zinc-500 mt-1.5">
              Améliore les préconisations de révision (ex. 125 → 6 000 km, &gt;125 → 10 000 km).
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/motorcycles")}>
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
