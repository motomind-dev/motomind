import { INTERVALLES_KM } from "./utils";

/** Période par défaut entre deux révisions « calendaires » (ex. révision annuelle). */
export const DEFAULT_REVISION_INTERVALLE_JOURS = 365;

/**
 * Intervalles km optionnels via env (JSON), fusionnés avec `INTERVALLES_KM`.
 * Exemple dans `.env` :
 * AUTO_REVISION_INTERVALLES_KM={"vidange":5000,"chaine":3000,"pneus":10000,"freins":10000,"revision_generale":10000}
 */
export function parseAutoRevisionIntervalsFromEnv(): Record<string, number> {
  const raw = process.env.AUTO_REVISION_INTERVALLES_KM;
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "number" && !Number.isNaN(v) && v > 0) {
        out[k] = Math.round(v);
      } else if (typeof v === "string" && /^\d+$/.test(v)) {
        out[k] = parseInt(v, 10);
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function getMergedIntervalKmForCategory(category: string): number {
  const fromEnv = parseAutoRevisionIntervalsFromEnv()[category];
  if (fromEnv != null && fromEnv > 0) return fromEnv;
  const fromDefaults = INTERVALLES_KM[category];
  if (fromDefaults != null && fromDefaults > 0) return fromDefaults;
  return 5000;
}

/** Active la fusion dashboard + e-mails pour les préconisations auto (Premium). */
export function isPremiumAutoPreconizationEnabled(): boolean {
  const v = process.env.PREMIUM_AUTO_PRECONIZATION?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
