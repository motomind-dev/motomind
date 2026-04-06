"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const TYPES = [
  { value: "bug", label: "Bug" },
  { value: "suggestion", label: "Suggestion" },
  { value: "autre", label: "Autre" },
] as const;

export default function ReportProblemModal({ isOpen, onClose }: Props) {
  const [message, setMessage] = useState("");
  const [type, setType] = useState<string>("autre");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const page =
        typeof window !== "undefined" ? window.location.pathname : undefined;
      const res = await fetch("/api/report-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), type, page }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setMessage("");
        setType("autre");
        onClose();
      }, 1800);
    } catch {
      setError("Impossible d'envoyer le signalement");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md mt-6 sm:mt-0 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6 shadow-xl max-h-[calc(100vh-3rem)] sm:max-h-[85vh] overflow-y-auto mx-auto">
        <h2 id="report-title" className="text-lg font-medium text-white mb-4">
          Signaler un problème
        </h2>

        {success ? (
          <p className="text-zinc-300 py-4">
            Merci, ton signalement a été envoyé.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="report-message"
                className="block text-sm text-zinc-400 mb-1"
              >
                Message <span className="text-orange-500">*</span>
              </label>
              <textarea
                id="report-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
                minLength={10}
                maxLength={2000}
                placeholder="Décris le problème ou ta suggestion..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <p className="text-xs text-zinc-500 mt-1">
                {message.length} / 2000 caractères
              </p>
            </div>

            <div>
              <label
                htmlFor="report-type"
                className="block text-sm text-zinc-400 mb-1"
              >
                Type
              </label>
              <select
                id="report-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || message.trim().length < 10}
                className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
