/**
 * Client-side PDF export for maintenance history.
 * Uses jspdf - requires npm install jspdf
 */

import { formatEntretienType } from "./utils";
import { getStatusLabel } from "@/lib/services/maintenance-status";

type EntretienForPdf = {
  type: string;
  statut?: string;
  date: string;
  kilometrage: number;
  note?: string | null;
  garage?: string | null;
  invoiceUrl?: string | null;
  invoiceType?: string | null;
  motoId?: string;
  moto?: { id: string; marque: string; modele: string; annee: number; kilometrage?: number };
};

export async function exportMaintenanceToPdf(
  entretiens: EntretienForPdf[]
): Promise<void> {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    doc.setFontSize(18);
    doc.text("Carnet d'entretien - MotoMind", margin, y);
    y += 12;

    const groupedByMoto = new Map<string, EntretienForPdf[]>();
    for (const e of entretiens) {
      const motoId = e.moto?.id || e.motoId || "default";
      if (!groupedByMoto.has(motoId)) groupedByMoto.set(motoId, []);
      groupedByMoto.get(motoId)!.push(e);
    }

    for (const [_motoId, list] of Array.from(groupedByMoto.entries())) {
      const first = list[0];
      const motoInfo = first?.moto;

      doc.setFontSize(14);
      if (motoInfo) {
        doc.text(`${motoInfo.marque} ${motoInfo.modele} (${motoInfo.annee})`, margin, y);
        y += 6;
        doc.setFontSize(10);
        const km = motoInfo.kilometrage ?? first?.kilometrage ?? 0;
        doc.text(`Kilométrage actuel : ${Number(km).toLocaleString("fr-FR")} km`, margin, y);
        y += 10;
      }

      doc.setFontSize(12);
      doc.text("Historique des entretiens", margin, y);
      y += 8;

      for (const e of list) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(formatEntretienType(e.type), margin, y);
        y += 5;

      if (e.statut) {
        doc.setFont("helvetica", "normal");
        doc.text(`Statut : ${getStatusLabel(e.statut)}`, margin, y);
        y += 5;
        doc.setFont("helvetica", "bold");
      }

        doc.setFont("helvetica", "normal");
        doc.text(
          `Date : ${new Date(e.date).toLocaleDateString("fr-FR")} - ${e.kilometrage.toLocaleString("fr-FR")} km`,
          margin,
          y
        );
        y += 5;
        if (e.garage) {
          doc.text(`Garage : ${e.garage}`, margin, y);
          y += 5;
        }
        if (e.note) {
          const lines = doc.splitTextToSize(e.note, pageWidth - 2 * margin);
          doc.text(lines, margin, y);
          y += lines.length * 5 + 2;
        }
        if (e.invoiceUrl) {
          if (e.invoiceType === "image") {
            try {
              const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
              const imgUrl = e.invoiceUrl.startsWith("http") ? e.invoiceUrl : `${baseUrl}${e.invoiceUrl}`;
              const img = await loadImageAsDataUrl(imgUrl);
              if (img) {
                const imgW = 40;
                const imgH = 30;
                if (y + imgH > 270) {
                  doc.addPage();
                  y = 20;
                }
                doc.addImage(img, "JPEG", margin, y, imgW, imgH);
                y += imgH + 3;
              } else {
                doc.text("Facture : voir document joint", margin, y);
                y += 5;
              }
            } catch {
              doc.text("Facture : voir document joint", margin, y);
              y += 5;
            }
          } else {
            doc.text("Facture disponible (non intégrée)", margin, y);
            y += 5;
          }
        }
        y += 4;
      }
      y += 8;
    }

    doc.save("carnet-entretien-motomind.pdf");
  } catch (err) {
    console.error("[export-pdf] Erreur:", err);
    throw err;
  }
}

function loadImageAsDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataUrl);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
