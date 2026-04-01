/**
 * Extraction sécurisée des données de contexte de la requête.
 */

export type RequestContext = {
  ip: string;
  userAgent: string;
  fingerprint: string;
};

type RequestLike = {
  headers:
    | { get?: (name: string) => string | null }
    | Record<string, string | string[] | undefined>;
};

function getHeader(req: Request | RequestLike, name: string): string | null {
  const h = req.headers;
  if (!h) return null;
  const key = name.toLowerCase();
  if (typeof (h as Headers).get === "function") {
    return (h as Headers).get(name);
  }
  const rec = h as Record<string, string | string[] | undefined>;
  const val = rec[key] ?? rec[name];
  if (typeof val === "string") return val;
  if (Array.isArray(val) && val.length > 0) return val[0];
  return null;
}

/** Récupère l'IP depuis les headers (compatible proxy) */
export function getClientIp(req: Request | RequestLike): string {
  const forwarded = getHeader(req, "x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = getHeader(req, "x-real-ip");
  if (real) return real;
  return "unknown";
}

/** Récupère le User-Agent */
export function getUserAgent(req: Request | RequestLike): string {
  return getHeader(req, "user-agent") ?? "";
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16).slice(0, 16);
}

/**
 * Génère un fingerprint simple à partir de user-agent + IP.
 * Évite les dépendances lourdes, suffisant pour détecter les changements.
 */
export function getSimpleFingerprint(req: Request | RequestLike): string {
  const ua = getUserAgent(req);
  const ip = getClientIp(req);
  return simpleHash(`${ua}|${ip}`);
}

/** Extrait le contexte complet depuis une Request */
export function extractRequestContext(req: Request | RequestLike): RequestContext {
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);
  const fingerprint = getSimpleFingerprint(req);
  return { ip, userAgent, fingerprint };
}

/** Masque partiellement une IP pour affichage (ex: 192.168.1.xxx) */
export function maskIp(ip: string): string {
  if (!ip || ip === "unknown") return "—";
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  }
  const lastColon = ip.lastIndexOf(":");
  if (lastColon > 0) {
    return ip.slice(0, lastColon + 1) + "xxx";
  }
  return ip.slice(0, Math.min(8, ip.length)) + "…";
}
