"use client";

import { useMemo, useState } from "react";
import type React from "react";
import Link from "next/link";

type Plan = "FREE" | "PRO";

export type EntretienInvoice = {
  invoiceUrl?: string | null;
  invoiceType?: string | null;
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB (contrainte UI)

function formatFileTooLargeMessage(maxBytes: number, sizeBytes: number) {
  const maxMb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
  const sizeMb = Math.round((sizeBytes / (1024 * 1024)) * 10) / 10;
  return `Fichier trop volumineux (${sizeMb} Mo). Max autorisé : ${maxMb} Mo.`;
}

export default function EntretienInvoiceManager({
  plan,
  entretienId,
  invoiceUrl,
  invoiceType,
  onInvoiceChanged,
}: {
  plan: Plan;
  entretienId: string;
  invoiceUrl?: string | null;
  invoiceType?: string | null;
  onInvoiceChanged: (next: EntretienInvoice) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasInvoice = useMemo(() => !!invoiceUrl, [invoiceUrl]);
  const isImage = invoiceType === "image";

  async function uploadInvoice(file: File) {
    if (plan !== "PRO") return;
    setError(null);

    if (file.size > MAX_SIZE_BYTES) {
      setError(formatFileTooLargeMessage(MAX_SIZE_BYTES, file.size));
      return;
    }

    try {
      setBusy(true);

      const fd = new FormData();
      fd.append("file", file);

      const uploadRes = await fetch("/api/invoices/upload", {
        method: "POST",
        body: fd,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data?.error || "Erreur lors de l&apos;upload");
      }

      const { url, invoiceType: type } = (await uploadRes.json()) as {
        url: string;
        invoiceType: "image" | "pdf" | string;
      };

      const patchRes = await fetch(`/api/entretiens/${entretienId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceUrl: url,
          invoiceType: type,
        }),
      });

      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}));
        throw new Error(data?.error || "Erreur lors de la mise à jour");
      }

      onInvoiceChanged({ invoiceUrl: url, invoiceType: type });
    } catch (e) {
      console.error("[EntretienInvoiceManager] upload/patch failed:", e);
      setError("Impossible de gérer la facture pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteInvoice() {
    if (plan !== "PRO") return;
    setError(null);
    try {
      setBusy(true);
      const patchRes = await fetch(`/api/entretiens/${entretienId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceUrl: null, invoiceType: null }),
      });
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}));
        throw new Error(data?.error || "Erreur lors de la suppression");
      }
      onInvoiceChanged({ invoiceUrl: null, invoiceType: null });
    } catch (e) {
      console.error("[EntretienInvoiceManager] delete failed:", e);
      setError("Impossible de supprimer la facture.");
    } finally {
      setBusy(false);
    }
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    // Reset input to allow selecting the same file twice
    e.target.value = "";
    uploadInvoice(file);
  }

  if (plan !== "PRO") {
    return (
      <div className="mt-2">
        {hasInvoice ? (
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-3 flex flex-col gap-2">
            {isImage ? (
              <div className="w-14 h-14 rounded border border-zinc-600 bg-zinc-900/40 blur-[2px]" />
            ) : (
              <div className="w-14 h-14 rounded border border-zinc-700 bg-zinc-900/40 blur-[2px]" />
            )}
            <div className="text-xs text-zinc-400 leading-relaxed">
              Ajout et gestion des factures (image/PDF) disponibles en Premium.
            </div>
          </div>
        ) : (
          <div className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Ajout de facture (image/PDF) disponible en Premium.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-3">
      {error && (
        <div className="text-sm text-zinc-300 bg-zinc-800/50 border border-zinc-700 rounded-lg p-2">
          {error}
        </div>
      )}

      {hasInvoice && (
        <div className="flex items-start gap-3">
          {isImage ? (
            <div className="w-14 h-14 rounded border border-zinc-600 overflow-hidden bg-zinc-900/40 flex-shrink-0">
              <img
                src={invoiceUrl ?? ""}
                alt="Facture"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded border border-zinc-700 bg-zinc-900/40 flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-zinc-400">PDF</span>
            </div>
          )}

          {invoiceType === "pdf" ? (
            <div className="flex flex-col gap-1">
              <Link
                href={invoiceUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-300 hover:text-white hover:underline leading-6"
              >
                Voir la facture
              </Link>
              <button
                type="button"
                onClick={deleteInvoice}
                disabled={busy}
                className={`text-sm font-medium transition-colors ${
                  busy
                    ? "opacity-50 cursor-not-allowed"
                    : "text-red-400 hover:text-red-300"
                }`}
              >
                Supprimer
              </button>
            </div>
          ) : (
            <div className="text-xs text-zinc-400 leading-6">
              Facture image
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(!hasInvoice || invoiceType !== "pdf") && (
          <label
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              busy
                ? "opacity-50 pointer-events-none bg-zinc-800 text-zinc-400 border border-zinc-700"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
            }`}
          >
            {hasInvoice ? "Remplacer" : "Ajouter une facture"}
            <input
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              className="hidden"
              onChange={onFilePicked}
              disabled={busy}
            />
          </label>
        )}

        {hasInvoice && invoiceType !== "pdf" && (
          <button
            type="button"
            onClick={deleteInvoice}
            disabled={busy}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${
              busy
                ? "opacity-50 cursor-not-allowed border-zinc-700 bg-zinc-800 text-zinc-400"
                : "hover:bg-zinc-700 border-red-500/20 hover:border-red-500/30 text-red-300 bg-zinc-800"
            }`}
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

