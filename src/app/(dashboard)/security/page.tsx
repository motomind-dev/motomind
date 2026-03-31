"use client";

import { useEffect, useState } from "react";

type SecurityEvent = {
  id: string;
  type: string;
  severity: string;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  FAILED_LOGIN_ATTEMPT: "Tentative de connexion échouée",
  NEW_DEVICE_LOGIN: "Nouvelle connexion (appareil)",
  NEW_IP_LOGIN: "Nouvelle connexion (IP)",
  MULTIPLE_FAILED_LOGINS: "Plusieurs échecs de connexion",
  MULTIPLE_RESET_REQUESTS: "Demandes de reset répétées",
  PASSWORD_CHANGED: "Mot de passe modifié",
  LOGIN_AFTER_PASSWORD_RESET: "Connexion après reset",
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "text-zinc-400",
  MEDIUM: "text-orange-400",
  HIGH: "text-red-400",
};

function maskIp(ip: string | null): string {
  if (!ip || ip === "unknown") return "—";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.xxx.xxx`;
  return ip.slice(0, 8) + "…";
}

export default function SecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/security/events")
      .then((r) => r.json())
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Sécurité du compte</h1>
        <p className="text-zinc-500 mt-1">
          Dernières activités de sécurité sur votre compte
        </p>
      </div>

      {loading ? (
        <p className="text-zinc-500">Chargement...</p>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-500">Aucun événement de sécurité enregistré.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div
              key={e.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <p className="text-white font-medium">
                    {TYPE_LABELS[e.type] ?? e.type}
                  </p>
                  <p className="text-zinc-500 text-sm mt-0.5">
                    {new Date(e.createdAt).toLocaleString("fr-FR")}
                  </p>
                  {e.ipAddress && (
                    <p className="text-zinc-500 text-xs mt-1">
                      IP : {maskIp(e.ipAddress)}
                    </p>
                  )}
                </div>
                <span
                  className={`text-sm ${SEVERITY_COLORS[e.severity] ?? "text-zinc-500"}`}
                >
                  {e.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
