"use client";

import Link from "next/link";

const BENEFITS = [
  "exporter ton carnet",
  "partager tes entretiens",
  "ajouter plusieurs motos",
  "recevoir des rappels automatiques par email",
  "enregistrer tes factures",
];

export default function PremiumPaywall({
  title = "Fonctionnalité Premium",
  subtitle,
  compact = false,
}: {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="rounded-lg border border-zinc-700/80 bg-zinc-800/40 p-4 text-center">
        <p className="text-sm font-medium text-white mb-2">{title}</p>
        <p className="text-xs text-zinc-500 mb-3">
          {subtitle ?? "Débloque cette fonctionnalité"}
        </p>
        <Link
          href="/premium"
          className="inline-flex min-h-[40px] items-center justify-center px-4 py-2 bg-moto-orange hover:bg-moto-orange-dark text-white font-medium rounded-lg text-sm transition-colors"
        >
          Débloquer le Premium
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/40 p-6 sm:p-8 text-center">
      <p className="text-base font-medium text-white mb-2">{title}</p>
      <p className="text-sm text-zinc-400 mb-4">
        {subtitle ?? "Débloque cette fonctionnalité pour :"}
      </p>
      <ul className="text-sm text-zinc-500 space-y-1.5 mb-6 text-left max-w-xs mx-auto">
        {BENEFITS.map((b) => (
          <li key={b} className="flex items-center gap-2">
            <span className="text-zinc-600">•</span>
            {b}
          </li>
        ))}
      </ul>
      <Link
        href="/premium"
        className="inline-flex min-h-[44px] items-center justify-center px-5 py-2.5 bg-moto-orange hover:bg-moto-orange-dark text-white font-medium rounded-lg text-sm transition-colors"
      >
        Débloquer le Premium
      </Link>
    </div>
  );
}
