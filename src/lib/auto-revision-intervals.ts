import { INTERVALLES_KM } from "./utils";
import { getRevisionIntervalRuleForMoto } from "./yamaha-revision-intervals";

export type MotoIntervalContext = {
  marque: string;
  modele: string;
  annee: number;
  cylindreeCm3: number | null;
};

/** Rappel annuel type carnet Yamaha (uniquement si une source de préconisation km existe). */
export const DEFAULT_REVISION_INTERVALLE_JOURS = 365;

export function hasRevisionPreconizationKmSource(moto: MotoIntervalContext): boolean {
  return getRevisionIntervalRuleForMoto(moto) != null;
}

/**
 * Jours entre deux passages : priorité à la valeur enregistrée sur l’entretien.
 * Pour `revision_generale`, 365 j seulement si une grille Yamaha s’applique au km.
 */
export function resolveIntervalleJoursForCategory(
  category: string,
  intervalleJoursFromEntretien: number | null | undefined,
  moto?: MotoIntervalContext | null
): number | null {
  if (
    intervalleJoursFromEntretien != null &&
    intervalleJoursFromEntretien > 0
  ) {
    return intervalleJoursFromEntretien;
  }
  if (category === "revision_generale") {
    if (moto && hasRevisionPreconizationKmSource(moto)) {
      return DEFAULT_REVISION_INTERVALLE_JOURS;
    }
    return null;
  }
  return null;
}

/**
 * Intervalle km effectif pour la préconisation.
 * `revision_generale` : uniquement si une grille Yamaha s’applique ; `intervalleKm` sur la fiche terminée
 * ne compte que dans ce cas (sinon un ancien intervalle auto-rempli sur Honda ferait encore une ligne « Auto »).
 * Autres catégories : intervalle enregistré puis défauts / env.
 */
export function getEffectiveIntervalKmForCategory(
  category: string,
  moto: MotoIntervalContext,
  dernierIntervalleKm: number | null | undefined
): number | null {
  if (category === "revision_generale") {
    const rule = getRevisionIntervalRuleForMoto(moto);
    if (rule != null) {
      if (dernierIntervalleKm != null && dernierIntervalleKm > 0) {
        return dernierIntervalleKm;
      }
      return rule.intervalKm;
    }
    return null;
  }
  if (dernierIntervalleKm != null && dernierIntervalleKm > 0) {
    return dernierIntervalleKm;
  }
  return getMergedIntervalKmForCategory(category);
}

/**
 * Intervalles km optionnels via env (JSON), fusionnés avec `INTERVALLES_KM` pour les types hors révision.
 * Ne pas inclure `revision_generale` : la clé est ignorée à la lecture (révision = grilles Yamaha uniquement).
 * Exemple :
 * AUTO_REVISION_INTERVALLES_KM={"vidange":5000,"chaine":3000,"pneus":10000,"freins":10000}
 */
export function parseAutoRevisionIntervalsFromEnv(): Record<string, number> {
  const raw = process.env.AUTO_REVISION_INTERVALLES_KM;
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (k === "revision_generale") {
        continue;
      }
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

/**
 * Fusion dashboard + e-mails pour les préconisations auto (Premium).
 * Activé par défaut en prod ; désactiver avec PREMIUM_AUTO_PRECONIZATION=false
 */
export function isPremiumAutoPreconizationEnabled(): boolean {
  const v = process.env.PREMIUM_AUTO_PRECONIZATION?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off" || v === "no") {
    return false;
  }
  return true;
}
