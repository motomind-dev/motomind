/**
 * Export PDF du carnet d'entretien (client, jsPDF).
 * Charte : couleurs MotoMind (tailwind theme.moto.orange).
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

/** Charte MotoMind — orange + thème sombre (aligné sur tailwind dark-900 / app) */
const ORANGE: [number, number, number] = [255, 107, 53];
const BG: [number, number, number] = [17, 17, 17]; // #111111
const BODY: [number, number, number] = [245, 245, 245]; // texte principal sur fond noir
const MUTED: [number, number, number] = [163, 163, 163]; // second plan lisible sur noir
const LINE: [number, number, number] = [55, 55, 55]; // séparateurs sur fond sombre
const WHITE: [number, number, number] = [255, 255, 255];

const MARGIN = 18;
const HEADER_H = 26;
const FOOTER_RESERVE = 22;
const THIN_BAR = 2.5;

type DocCtx = {
  doc: import("jspdf").jsPDF;
  pageWidth: number;
  pageHeight: number;
  contentBottom: number;
  y: number;
};

function contentBottom(pageHeight: number) {
  return pageHeight - FOOTER_RESERVE;
}

function paintDarkBackground(
  doc: import("jspdf").jsPDF,
  pageWidth: number,
  pageHeight: number
) {
  doc.setFillColor(...BG);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
}

function newPage(ctx: DocCtx) {
  ctx.doc.addPage();
  paintDarkBackground(ctx.doc, ctx.pageWidth, ctx.pageHeight);
  ctx.doc.setFillColor(...ORANGE);
  ctx.doc.rect(0, 0, ctx.pageWidth, THIN_BAR, "F");
  ctx.y = MARGIN + THIN_BAR + 2;
}

function ensureSpace(ctx: DocCtx, neededMm: number) {
  if (ctx.y + neededMm <= ctx.contentBottom) return;
  newPage(ctx);
}

function drawPage1Header(
  doc: import("jspdf").jsPDF,
  pageWidth: number,
  exportDateLabel: string
) {
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, pageWidth, HEADER_H, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Carnet d'entretien", MARGIN, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`MotoMind · ${exportDateLabel}`, MARGIN, 21);
  doc.setTextColor(...BODY);
}

function drawFooters(doc: import("jspdf").jsPDF, pageWidth: number, pageHeight: number) {
  const total = doc.getNumberOfPages();
  const footerY = pageHeight - 14;

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.35);
    doc.line(MARGIN, footerY - 4, pageWidth - MARGIN, footerY - 4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...ORANGE);
    doc.text("MotoMind", MARGIN, footerY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.setFontSize(8);
    doc.text("Le carnet numérique de ta moto · motomind.fr", MARGIN, footerY + 4.5);

    const pageLabel = `Page ${i} / ${total}`;
    doc.setTextColor(...MUTED);
    doc.text(pageLabel, pageWidth - MARGIN, footerY, { align: "right" });
  }
}

function formatKmForPdf(value: number): string {
  // `fr-FR` utilise parfois des espaces insécables (U+00A0 / U+202F) mal rendues en PDF.
  // On les remplace par des espaces simples pour un rendu stable.
  return Number(value).toLocaleString("fr-FR").replace(/[\u00A0\u202F]/g, " ");
}

export async function exportMaintenanceToPdf(
  entretiens: EntretienForPdf[]
): Promise<void> {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottom = contentBottom(pageHeight);

    paintDarkBackground(doc, pageWidth, pageHeight);

    const exportDateLabel = new Date().toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    drawPage1Header(doc, pageWidth, exportDateLabel);

    let y = HEADER_H + 8;

    const ctx: DocCtx = {
      doc,
      pageWidth,
      pageHeight,
      contentBottom: bottom,
      get y() {
        return y;
      },
      set y(v: number) {
        y = v;
      },
    };

    const groupedByMoto = new Map<string, EntretienForPdf[]>();
    for (const e of entretiens) {
      const motoId = e.moto?.id || e.motoId || "default";
      if (!groupedByMoto.has(motoId)) groupedByMoto.set(motoId, []);
      groupedByMoto.get(motoId)!.push(e);
    }

    for (const [_motoId, list] of Array.from(groupedByMoto.entries())) {
      const first = list[0];
      const motoInfo = first?.moto;

      ensureSpace(ctx, 28);

      if (motoInfo) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(...ORANGE);
        doc.text(`${motoInfo.marque} ${motoInfo.modele} (${motoInfo.annee})`, MARGIN, y);
        y += 7;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BODY);
        const km = motoInfo.kilometrage ?? first?.kilometrage ?? 0;
        doc.text(`Kilométrage actuel : ${formatKmForPdf(Number(km))} km`, MARGIN, y);
        y += 9;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BODY);
      doc.text("Historique des entretiens", MARGIN, y);
      y += 6;
      doc.setDrawColor(...ORANGE);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, y, MARGIN + 52, y);
      y += 7;

      for (const e of list) {
        const blockEstimate =
          28 +
          (e.note ? doc.splitTextToSize(e.note, pageWidth - 2 * MARGIN).length * 5 : 0) +
          (e.invoiceUrl && e.invoiceType === "image" ? 35 : 0);
        ensureSpace(ctx, blockEstimate);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BODY);
        doc.text(formatEntretienType(e.type), MARGIN, y);
        y += 5;

        if (e.statut) {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...MUTED);
          doc.text(`Statut : ${getStatusLabel(e.statut)}`, MARGIN, y);
          y += 5;
        }

        doc.setTextColor(...BODY);
        doc.text(
          `${new Date(e.date).toLocaleDateString("fr-FR")} · ${formatKmForPdf(e.kilometrage)} km`,
          MARGIN,
          y
        );
        y += 5;

        if (e.garage) {
          doc.setTextColor(...MUTED);
          doc.text(`Garage : ${e.garage}`, MARGIN, y);
          y += 5;
          doc.setTextColor(...BODY);
        }

        if (e.note) {
          doc.setTextColor(...BODY);
          const lines = doc.splitTextToSize(e.note, pageWidth - 2 * MARGIN);
          doc.text(lines, MARGIN, y);
          y += lines.length * 5 + 2;
        }

        if (e.invoiceUrl) {
          if (e.invoiceType === "image") {
            try {
              const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
              const imgUrl = e.invoiceUrl.startsWith("http") ? e.invoiceUrl : `${baseUrl}${e.invoiceUrl}`;
              const img = await loadImageAsDataUrl(imgUrl);
              if (img) {
                const imgW = 42;
                const imgH = 32;
                ensureSpace(ctx, imgH + 4);
                doc.addImage(img, "JPEG", MARGIN, y, imgW, imgH);
                y += imgH + 3;
              } else {
                doc.setTextColor(...MUTED);
                doc.text("Facture : voir document dans l’application", MARGIN, y);
                y += 5;
                doc.setTextColor(...BODY);
              }
            } catch {
              doc.setTextColor(...MUTED);
              doc.text("Facture : voir document dans l’application", MARGIN, y);
              y += 5;
              doc.setTextColor(...BODY);
            }
          } else {
            doc.setTextColor(...MUTED);
            doc.text("Facture PDF disponible dans l’application", MARGIN, y);
            y += 5;
            doc.setTextColor(...BODY);
          }
        }

        y += 3;
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.2);
        doc.line(MARGIN, y, pageWidth - MARGIN, y);
        y += 6;
      }

      y += 4;
    }

    drawFooters(doc, pageWidth, pageHeight);
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
