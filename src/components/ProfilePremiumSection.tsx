"use client";

import Link from "next/link";

const BENEFITS = [
  "Plusieurs motos",
  "Rappels d'entretiens automatiques",
  "Export PDF",
  "Partage du carnet",
  "Factures",
];

export default function ProfilePremiumSection({
  plan,
}: {
  plan: "FREE" | "PRO";
}) {
  return (
    <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/50 p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <p className="text-sm text-zinc-500 mb-1">Plan actuel</p>
          <span
            className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              plan === "PRO"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-zinc-700/50 text-zinc-400 border border-zinc-600"
            }`}
          >
            {plan === "PRO" ? "Premium" : "Gratuit"}
          </span>
        </div>
        {plan === "FREE" && (
          <Link
            href="/premium"
            className="inline-flex min-h-[44px] items-center justify-center px-5 py-2.5 bg-moto-orange hover:bg-moto-orange-dark text-white font-medium rounded-lg text-sm transition-colors flex-shrink-0"
          >
            Passer en Premium
          </Link>
        )}
      </div>
      {plan === "FREE" && (
        <div>
          <p className="text-xs text-zinc-500 mb-2">Avec Premium :</p>
          <ul className="text-sm text-zinc-400 space-y-1.5">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-2">
                <span className="text-zinc-600">•</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
