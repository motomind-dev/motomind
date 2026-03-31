import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEtatMoto, INTERVALLES_KM } from "@/lib/utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const motos = await prisma.moto.findMany({
    where: { userId: session.user.id, deletedAt: null },
    include: {
      entretiens: {
        where: { statut: { in: ["termine"] }, deletedAt: null },
        orderBy: [{ kilometrage: "desc" }, { date: "desc" }],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const motoPrincipale = motos[0];

  let etatMoto: "ok" | "bientot" | "en_retard" = "ok";
  let prochainEntretien: {
    type: string;
    distanceRestante: number | null;
    dateRestante: Date | null;
    typeEntretien: string;
  } | null = null;

  if (motoPrincipale) {
    const km = motoPrincipale.kilometrage;
    let prochainKm: number | null = null;
    let prochainDate: Date | null = null;
    let typeProchain = "";

    // Pour chaque type d'entretien, trouver le dernier et calculer le prochain
    const types = ["vidange", "chaine", "pneus", "freins", "revision_generale"] as const;

    for (const t of types) {
      const dernier = motoPrincipale.entretiens.find((e) => e.type === t);
      const intervalle = INTERVALLES_KM[t];
      const kmProchain = dernier ? dernier.kilometrage + intervalle : km + intervalle;

      if (kmProchain > km && (!prochainKm || kmProchain < prochainKm)) {
        prochainKm = kmProchain;
        prochainDate = null; // Simplifié : on se base sur le km
        typeProchain = t;
      }
    }

    etatMoto = getEtatMoto(prochainKm, prochainDate, km);

    if (prochainKm) {
      prochainEntretien = {
        type: typeProchain,
        typeEntretien: typeProchain,
        distanceRestante: prochainKm - km,
        dateRestante: prochainDate,
      };
    }
  }

  return NextResponse.json({
    motoPrincipale: motoPrincipale
      ? {
          id: motoPrincipale.id,
          marque: motoPrincipale.marque,
          modele: motoPrincipale.modele,
          annee: motoPrincipale.annee,
          kilometrage: motoPrincipale.kilometrage,
          photo: motoPrincipale.photo,
        }
      : null,
    etatMoto,
    prochainEntretien,
    motos,
  });
}
