/**
 * Intervalles km des grilles « forfait révision » constructeur.
 * Yamaha : règles de la grille existante.
 * BMW Motorrad : intervalle révision 10 000 km (millésimes 1990 à 2026).
 */

export type RevisionIntervalRule = {
  intervalKm: number;
};

const INTERVAL_125 = 6000;
const INTERVAL_STANDARD = 10000;
const BMW_INTERVAL_STANDARD = 10000;

/** Paires [regex sur modèle normalisé, intervalle km] — ordre = première correspondance gagne. */
const YAMAHA_MODEL_RULES: Array<{ test: RegExp; intervalKm: number }> = [
  // 125 cm³
  { test: /\b(ybr|ys125|wr125|mt-?125|xsr125|r125)\b/i, intervalKm: INTERVAL_125 },
  // 320–800 cm³
  { test: /\b(mt-?03|r3|sr400|xj6|fz8)\b/i, intervalKm: INTERVAL_STANDARD },
  // 690–1000 cm³
  {
    test: /\b(mt-?07|xsr700|tracer\s*700|t[ée]n[ée]r[ée]\s*700|r7)\b/i,
    intervalKm: INTERVAL_STANDARD,
  },
  {
    test: /\b(mt-?09|xsr900|tracer\s*9|niken)\b/i,
    intervalKm: INTERVAL_STANDARD,
  },
  { test: /\b(mt-?10|r1|vmax|xvs950|scr950)\b/i, intervalKm: INTERVAL_STANDARD },
  // 1200–1700 cm³
  { test: /\b(xtz1200|xjr1300|fjr1300)\b/i, intervalKm: INTERVAL_STANDARD },
];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Intervalle km selon la cylindrée — réservé aux Yamaha (grilles constructeur). */
function intervalFromDisplacement(cc: number): RevisionIntervalRule {
  if (cc > 0 && cc <= 125) return { intervalKm: INTERVAL_125 };
  if (cc > 125 && cc <= 800) return { intervalKm: INTERVAL_STANDARD };
  if (cc > 800 && cc <= 1700) return { intervalKm: INTERVAL_STANDARD };
  if (cc > 1700) return { intervalKm: INTERVAL_STANDARD };
  return { intervalKm: INTERVAL_STANDARD };
}

/**
 * Règle km « révision générale » uniquement à partir des grilles Yamaha chargées dans l’app.
 * Retourne null si aucune donnée constructeur applicable (pas de valeur par défaut arbitraire).
 */
export function getRevisionIntervalRuleForMoto(input: {
  marque: string;
  modele: string;
  annee: number;
  cylindreeCm3: number | null | undefined;
}): RevisionIntervalRule | null {
  const m = normalize(input.marque);
  const model = normalize(input.modele);
  const isYamaha = m.includes("yamaha");
  const isBmw = m.includes("bmw");

  if (isBmw && input.annee >= 1990 && input.annee <= 2026) {
    return { intervalKm: BMW_INTERVAL_STANDARD };
  }

  if (isYamaha && input.cylindreeCm3 != null && input.cylindreeCm3 > 0) {
    return intervalFromDisplacement(input.cylindreeCm3);
  }

  if (isYamaha) {
    const combined = `${model} ${input.annee}`;
    for (const rule of YAMAHA_MODEL_RULES) {
      if (rule.test.test(combined) || rule.test.test(model)) {
        return { intervalKm: rule.intervalKm };
      }
    }
  }

  return null;
}
