type MotoInput = {
  marque: string;
  modele: string;
  annee: number;
};

type KawasakiRule = {
  /** true si le libellé modèle correspond */
  matchModel: (modelNorm: string) => boolean;
  intervalKm: number;
  /** Année modèle min (incluse) */
  minYear: number;
  /** Année modèle max (incluse). Absent = pas de plafond */
  maxYear?: number;
};

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function yearInRule(annee: number, rule: KawasakiRule): boolean {
  if (annee < rule.minYear) return false;
  if (rule.maxYear != null && annee > rule.maxYear) return false;
  return true;
}

/**
 * Grille km révision Kawasaki (modèles / millésimes fournis).
 * 1re révision 1 000 km : gérée globalement par `FIRST_UNIVERSAL_REVISION_KM` + `nextRevisionDueMileage`.
 */
const KAWASAKI_RULES: KawasakiRule[] = [
  // --- 12 000 km : règles spécifiques en premier (H2 / Z900 / W800 récent…) ---
  {
    matchModel: (md) =>
      /\bninja\s*h2\s*sx\b/i.test(md) ||
      /\bh2\s*sx\b/i.test(md) ||
      /\bninja\s*h2\s*se\b/i.test(md),
    intervalKm: 12_000,
    minYear: 2018,
  },
  {
    matchModel: (md) => /\bz\s*h2\b/i.test(md) || /\bzh2\b/i.test(md),
    intervalKm: 12_000,
    minYear: 2020,
  },
  {
    matchModel: (md) =>
      /\bninja\s*h2\b/i.test(md) &&
      !/\bh2\s*sx\b/i.test(md) &&
      !/\bninja\s*h2\s*sx\b/i.test(md),
    intervalKm: 12_000,
    minYear: 2015,
  },
  {
    matchModel: (md) =>
      /\bninja\s*zx-?10r\b/i.test(md) || /\bzx-?10r\b/i.test(md),
    intervalKm: 12_000,
    minYear: 2016,
  },
  {
    matchModel: (md) =>
      /\b1000\s*sx\b/i.test(md) ||
      /\b1000sx\b/i.test(md) ||
      /\bninja\s*1000\s*sx\b/i.test(md),
    intervalKm: 12_000,
    minYear: 2014,
  },
  {
    matchModel: (md) => /\bz900\s*rs\b/i.test(md) || /\bz900rs\b/i.test(md),
    intervalKm: 12_000,
    minYear: 2017,
  },
  {
    matchModel: (md) =>
      /\bz900\b/i.test(md) &&
      !/\bz900\s*rs\b/i.test(md) &&
      !/\bz900rs\b/i.test(md),
    intervalKm: 12_000,
    minYear: 2017,
  },
  {
    matchModel: (md) => /\bw800\b/i.test(md),
    intervalKm: 12_000,
    minYear: 2019,
  },
  {
    matchModel: (md) => /\bvulcan\s*s\b/i.test(md),
    intervalKm: 12_000,
    minYear: 2015,
  },
  {
    matchModel: (md) => /\bninja\s*650\b/i.test(md),
    intervalKm: 12_000,
    minYear: 2017,
  },
  {
    matchModel: (md) => /\bz650\b/i.test(md),
    intervalKm: 12_000,
    minYear: 2017,
  },
  {
    matchModel: (md) => /\bversys\s*-?\s*1000\b/i.test(md),
    intervalKm: 12_000,
    minYear: 2015,
  },
  {
    matchModel: (md) => /\bversys\s*-?\s*650\b/i.test(md),
    intervalKm: 12_000,
    minYear: 2015,
  },
  {
    matchModel: (md) =>
      /\bz125\b/i.test(md) ||
      /\bninja\s*-?\s*125\b/i.test(md) ||
      /\b125\s*ninja\b/i.test(md),
    intervalKm: 12_000,
    minYear: 2019,
  },

  // --- 6 000 km (plages années) ---
  {
    matchModel: (md) => /\bw800\b/i.test(md),
    intervalKm: 6000,
    minYear: 2011,
    maxYear: 2016,
  },
  {
    matchModel: (md) => /\bninja\s*-?\s*300\b/i.test(md),
    intervalKm: 6000,
    minYear: 2013,
    maxYear: 2017,
  },
  {
    matchModel: (md) => /\ber-?6n\b/i.test(md) || /\ber-?6f\b/i.test(md),
    intervalKm: 6000,
    minYear: 2012,
    maxYear: 2016,
  },
  {
    matchModel: (md) => /\bz750\b/i.test(md),
    intervalKm: 6000,
    minYear: 2007,
    maxYear: 2012,
  },
  {
    matchModel: (md) => /\bz800\s*e\b/i.test(md) || /\bz800e\b/i.test(md),
    intervalKm: 6000,
    minYear: 2013,
    maxYear: 2016,
  },
  {
    matchModel: (md) =>
      /\b1400\s*gtr\b/i.test(md) ||
      /\bgtr\s*1400\b/i.test(md) ||
      /\b1400gtr\b/i.test(md),
    intervalKm: 6000,
    minYear: 2015,
    maxYear: 2016,
  },
];

export function getKawasakiRevisionIntervalRuleForMoto(
  input: MotoInput
): { intervalKm: number } | null {
  const marque = normalize(input.marque);
  if (!marque.includes("kawasaki")) return null;

  const modelNorm = normalize(input.modele);
  const annee = input.annee;

  for (const rule of KAWASAKI_RULES) {
    if (!rule.matchModel(modelNorm)) continue;
    if (!yearInRule(annee, rule)) continue;
    return { intervalKm: rule.intervalKm };
  }

  return null;
}
