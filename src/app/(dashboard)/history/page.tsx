"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import Image from "next/image";
import { jsonFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/dashboard-swr";
import { formatEntretienType } from "@/lib/utils";
import {
  getEntretienStatus,
  getStatusColor,
  getStatusLabel,
} from "@/lib/services/maintenance-status";
import { exportMaintenanceToPdf } from "@/lib/export-pdf";
import PremiumPaywall from "@/components/PremiumPaywall";

type Entretien = {
  id: string;
  type: string;
  date: string;
  kilometrage: number;
  note: string | null;
  statut: string;
  moto: { id: string; marque: string; modele: string; annee: number };
  invoiceUrl?: string | null;
  invoiceType?: string | null;
};

const TYPES_ENTRETIEN = [
  { value: "", label: "Tous les types" },
  { value: "vidange", label: "Vidange" },
  { value: "chaine", label: "Chaîne" },
  { value: "pneus", label: "Pneus" },
  { value: "freins", label: "Freins" },
  { value: "revision_generale", label: "Révision générale" },
];

const RANGES_KM = [
  { value: "", label: "Tous les km" },
  { value: "0-5000", label: "< 5 000 km" },
  { value: "5000-10000", label: "5 000 - 10 000 km" },
  { value: "10000-20000", label: "10 000 - 20 000 km" },
  { value: "20000+", label: "> 20 000 km" },
];

function StatutBadge({
  statut,
  date,
  kilometrage,
}: {
  statut: string;
  date: string;
  kilometrage: number;
}) {
  const displayStatus = getEntretienStatus({
    isCompleted: statut === "termine",
    currentMileage: kilometrage,
    nextDueMileage: null,
    nextDueDate: new Date(date),
  });

  const label = getStatusLabel(displayStatus);
  const colorClasses = getStatusColor(displayStatus);

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${colorClasses}`}
    >
      {label}
    </span>
  );
}

export default function HistoryPage() {
  const { data, isLoading, error } = useSWR<{
    entretiens: Entretien[];
    plan: string;
  }>(SWR_KEYS.entretiensPlan, jsonFetcher, {
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
  });

  const entretiens = data?.entretiens ?? [];
  const loading = isLoading && !data;
  const plan = data?.plan === "PRO" ? "PRO" : "FREE";

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterMotoId, setFilterMotoId] = useState("");
  const [filterAnnee, setFilterAnnee] = useState("");
  const [filterKm, setFilterKm] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedEntretienIds, setSelectedEntretienIds] = useState<string[]>([]);

  const entretiensTermines = useMemo(
    () => entretiens.filter((e) => e.statut === "termine"),
    [entretiens]
  );

  const motosUniques = useMemo(() => {
    const seen = new Set<string>();
    return entretiensTermines
      .filter((e) => {
        const key = e.moto.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((e) => e.moto)
      .sort((a, b) => `${a.marque} ${a.modele}`.localeCompare(`${b.marque} ${b.modele}`));
  }, [entretiensTermines]);

  const anneesUniques = useMemo(() => {
    const years = new Set(motosUniques.map((m) => m.annee));
    return Array.from(years).sort((a, b) => b - a);
  }, [motosUniques]);

  const filteredAndSorted = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    let list = [...entretiensTermines];

    if (searchLower) {
      list = list.filter(
        (e) =>
          formatEntretienType(e.type).toLowerCase().includes(searchLower) ||
          e.moto.marque.toLowerCase().includes(searchLower) ||
          e.moto.modele.toLowerCase().includes(searchLower) ||
          (e.note && e.note.toLowerCase().includes(searchLower))
      );
    }
    if (filterType) {
      list = list.filter((e) => e.type === filterType);
    }
    if (filterMotoId) {
      list = list.filter((e) => e.moto.id === filterMotoId);
    }
    if (filterAnnee) {
      list = list.filter((e) => e.moto.annee === parseInt(filterAnnee, 10));
    }
    if (filterKm) {
      const [min, max] = filterKm.split("-").map((x) => (x === "" ? 0 : parseInt(x, 10)));
      if (filterKm.endsWith("+")) {
        list = list.filter((e) => e.kilometrage >= 20000);
      } else if (max) {
        list = list.filter(
          (e) => e.kilometrage >= min && e.kilometrage < max
        );
      } else {
        list = list.filter((e) => e.kilometrage < min);
      }
    }

    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [
    entretiensTermines,
    search,
    filterType,
    filterMotoId,
    filterAnnee,
    filterKm,
  ]);

  useEffect(() => {
    // Conserve la sélection uniquement pour les entrées visibles (selon filtres/recherche).
    setSelectedEntretienIds((prev) =>
      prev.filter((id) => filteredAndSorted.some((e) => e.id === id))
    );
  }, [filteredAndSorted]);

  function toggleSelected(id: string) {
    setSelectedEntretienIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleExportPdf() {
    if (plan !== "PRO") return;
    setExporting(true);
    try {
      const listToExport =
        selectedEntretienIds.length > 0
          ? filteredAndSorted.filter((e) => selectedEntretienIds.includes(e.id))
          : filteredAndSorted;
      await exportMaintenanceToPdf(listToExport);
    } catch {
      // Log only, don't crash UI
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Historique</h1>
          <p className="text-zinc-500 mt-1">
            Entretiens terminés, triés du plus récent au plus ancien
          </p>
        </div>
        {plan === "PRO" ? (
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting || filteredAndSorted.length === 0}
            className="px-4 py-2 bg-moto-orange hover:bg-moto-orange-dark disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex-shrink-0 min-h-[44px]"
          >
            {exporting ? "Export en cours..." : "Exporter en PDF"}
          </button>
        ) : (
          <div className="max-w-xs">
            <PremiumPaywall
              title="Fonctionnalité Premium"
              subtitle="Débloque l'export PDF et le partage du carnet"
              compact
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <input
          type="search"
          placeholder="Rechercher un entretien..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
          aria-label="Rechercher un entretien"
        />

        {/* Mobile: accordéon des filtres */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="flex items-center justify-between w-full min-h-[44px] px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 text-sm"
            aria-expanded={filtersOpen}
          >
            <span>Filtres</span>
            <svg
              className={`w-5 h-5 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {filtersOpen && (
            <div className="mt-3 flex flex-col gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="min-h-[44px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                aria-label="Filtrer par type d'entretien"
              >
                {TYPES_ENTRETIEN.map((t) => (
                  <option key={t.value || "all"} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select
                value={filterMotoId}
                onChange={(e) => setFilterMotoId(e.target.value)}
                className="min-h-[44px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                aria-label="Filtrer par moto"
              >
                <option value="">Toutes les motos</option>
                {motosUniques.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.marque} {m.modele}
                  </option>
                ))}
              </select>
              <select
                value={filterAnnee}
                onChange={(e) => setFilterAnnee(e.target.value)}
                className="min-h-[44px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                aria-label="Filtrer par année"
              >
                <option value="">Toutes les années</option>
                {anneesUniques.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <select
                value={filterKm}
                onChange={(e) => setFilterKm(e.target.value)}
                className="min-h-[44px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                aria-label="Filtrer par kilométrage"
              >
                {RANGES_KM.map((r) => (
                  <option key={r.value || "all"} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {/* Desktop: filtres inline */}
        <div className="hidden md:flex flex-wrap gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            aria-label="Filtrer par type d'entretien"
          >
            {TYPES_ENTRETIEN.map((t) => (
              <option key={t.value || "all"} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={filterMotoId}
            onChange={(e) => setFilterMotoId(e.target.value)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            aria-label="Filtrer par moto"
          >
            <option value="">Toutes les motos</option>
            {motosUniques.map((m) => (
              <option key={m.id} value={m.id}>
                {m.marque} {m.modele}
              </option>
            ))}
          </select>
          <select
            value={filterAnnee}
            onChange={(e) => setFilterAnnee(e.target.value)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            aria-label="Filtrer par année"
          >
            <option value="">Toutes les années</option>
            {anneesUniques.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={filterKm}
            onChange={(e) => setFilterKm(e.target.value)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            aria-label="Filtrer par kilométrage"
          >
            {RANGES_KM.map((r) => (
              <option key={r.value || "all"} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3 py-6" aria-busy="true">
          <div className="h-12 w-full max-w-xl bg-zinc-800 rounded-lg" />
          <div className="h-24 rounded-xl bg-zinc-900 border border-zinc-800" />
          <div className="h-24 rounded-xl bg-zinc-900 border border-zinc-800" />
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 md:p-12 text-center">
          <p className="text-zinc-500">
            {entretiensTermines.length === 0
              ? "Aucun entretien terminé dans l'historique."
              : "Aucun entretien ne correspond à vos critères."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSorted.map((e) => (
            <div
              key={e.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 md:p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <div className="flex items-start gap-3">
                    {plan === "PRO" && (
                      <input
                        type="checkbox"
                        checked={selectedEntretienIds.includes(e.id)}
                        onChange={() => toggleSelected(e.id)}
                        className="mt-1 h-5 w-5 rounded border-zinc-700 bg-zinc-900 accent-moto-orange"
                        aria-label={`Inclure ${formatEntretienType(e.type)}`}
                      />
                    )}
                    <p className="text-white font-medium text-lg">
                      {formatEntretienType(e.type)}
                    </p>
                  </div>
                  <p className="text-zinc-500 text-sm mt-0.5">
                    Moto : {e.moto.marque} {e.moto.modele}
                  </p>
                  <p className="text-zinc-500 text-sm">
                    Date : {new Date(e.date).toLocaleDateString("fr-FR")}
                  </p>
                  <p className="text-orange-500 text-sm">
                    Kilométrage : {e.kilometrage.toLocaleString("fr-FR")} km
                  </p>
                  {e.note && (
                    <p className="text-zinc-400 text-sm mt-2">{e.note}</p>
                  )}
                  {e.invoiceUrl && (
                    <div className="mt-2">
                      {plan === "PRO" ? (
                        e.invoiceType === "image" ? (
                          <a
                            href={e.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-16 h-16 rounded border border-zinc-600 overflow-hidden"
                          >
                            <Image
                              src={e.invoiceUrl}
                              alt="Facture"
                              width={64}
                              height={64}
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
                          <div className="w-14 h-14 rounded bg-zinc-700 blur-sm" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs text-zinc-400">Premium</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <StatutBadge
                    statut={e.statut}
                    date={e.date}
                    kilometrage={e.kilometrage}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
