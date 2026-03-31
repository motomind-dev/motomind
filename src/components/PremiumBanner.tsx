"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "motomind-premium-banner-dismissed";

export default function PremiumBanner({ plan }: { plan: "FREE" | "PRO" }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setDismissed(false);
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (plan !== "FREE" || dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-700/60 bg-zinc-800/30 px-4 py-3">
      <p className="text-sm text-zinc-500">
        Passe au Premium pour débloquer toutes les fonctionnalités
      </p>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href="/premium"
          className="text-sm text-moto-orange hover:text-moto-orange-dark font-medium transition-colors"
        >
          En savoir plus
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-zinc-500 hover:text-zinc-400 transition-colors"
          aria-label="Fermer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
