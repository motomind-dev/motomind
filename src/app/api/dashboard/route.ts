import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEtatMoto } from "@/lib/utils";
import { entretienMatchesCategory } from "@/lib/maintenance-entretien-category";
import {
  getEffectiveIntervalKmForCategory,
  getMergedIntervalKmForCategory,
  nextRevisionDueMileage,
} from "@/lib/auto-revision-intervals";

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

    // Préconisation km auto : révision générale uniquement (le reste = planifié par l’utilisateur).
    const types = ["revision_generale"] as const;

    for (const t of types) {
      const dernier = motoPrincipale.entretiens.find((e) =>
        entretienMatchesCategory(e.type, t)
      );
      const motoCtx = {
        marque: motoPrincipale.marque,
        modele: motoPrincipale.modele,
        annee: motoPrincipale.annee,
        cylindreeCm3: motoPrincipale.cylindreeCm3 ?? null,
      };
      let intervalle = getEffectiveIntervalKmForCategory(
        t,
        motoCtx,
        dernier?.intervalleKm
      );
      if (intervalle == null || intervalle <= 0) {
        intervalle = getMergedIntervalKmForCategory("revision_generale");
      }
      if (intervalle == null || intervalle <= 0) {
        continue;
      }
      const dernierKm = dernier?.kilometrage ?? 0;
      const kmProchain = nextRevisionDueMileage(
        dernierKm,
        intervalle,
        km
      );

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
