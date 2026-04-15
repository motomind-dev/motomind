"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate as globalMutate } from "swr";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import PremiumPaywall from "@/components/PremiumPaywall";
import { SWR_KEYS } from "@/lib/dashboard-swr";
import { revalidateDashboardCrudData } from "@/lib/dashboard-cache";

type Moto = {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  kilometrage: number;
  photo: string | null;
  shareToken?: string | null;
};

type MotosPayload = {
  motos: Moto[];
  plan: string;
  canAddMoto: boolean;
};

export default function AddMotorcyclePage() {
  const router = useRouter();
  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [annee, setAnnee] = useState(new Date().getFullYear().toString());
  const [kilometrage, setKilometrage] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowPremiumPrompt(false);

    const res = await fetch("/api/motos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marque,
        modele,
        annee: parseInt(annee, 10),
        kilometrage: parseInt(kilometrage, 10) || 0,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur lors de l'ajout");
      setShowPremiumPrompt(data.code === "FREE_LIMIT_REACHED");
      setLoading(false);
      return;
    }

    const createdMoto = data as Moto;
    await globalMutate<MotosPayload>(
      SWR_KEYS.motosPlan,
      (prev) =>
        prev
          ? {
              ...prev,
              motos: [createdMoto, ...prev.motos],
              canAddMoto: true,
            }
          : prev,
      { revalidate: false }
    );
    await revalidateDashboardCrudData();
    router.push("/motorcycles");
  }

  const inputClass =
    "w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500";

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <Link
          href="/motorcycles"
          className="text-sm text-zinc-500 hover:text-orange-500 mb-4 inline-block"
        >
          ← Retour aux motos
        </Link>
        <h1 className="text-2xl font-bold text-white">Ajouter une moto</h1>
        <p className="text-zinc-500 mt-1">Enregistrer une nouvelle moto</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
              {showPremiumPrompt && (
                <PremiumPaywall
                  title="Fonctionnalité Premium"
                  subtitle="La version gratuite est limitée à 1 moto. Débloque pour :"
                />
              )}
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
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Ajout en cours..." : "Ajouter la moto"}
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
