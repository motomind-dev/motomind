import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMotorcycleBodySchema } from "@/lib/validators/motorcycle";
import { whereMotoActive } from "@/lib/prisma-filters";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = session.user.id;
  const withAccount = new URL(req.url).searchParams.get("withAccount") === "1";

  if (!withAccount) {
    const motos = await prisma.moto.findMany({
      where: whereMotoActive(userId),
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(motos);
  }

  const [motos, user] = await Promise.all([
    prisma.moto.findMany({
      where: whereMotoActive(userId),
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        _count: {
          select: { motos: { where: { deletedAt: null } } },
        },
      },
    }),
  ]);

  const plan = user?.plan === "PRO" ? "PRO" : "FREE";
  const motoCount = user?._count.motos ?? 0;
  const canAddMoto = plan === "PRO" || motoCount < 1;

  return NextResponse.json({ motos, plan, canAddMoto });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format invalide" }, { status: 400 });
  }

  const parsed = createMotorcycleBodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Données invalides";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  if (user.plan === "FREE") {
    const count = await prisma.moto.count({
      where: { userId: session.user.id, deletedAt: null },
    });
    if (count >= 1) {
      return NextResponse.json(
        {
          error: "Version gratuite limitée à 1 moto. Passe en premium pour en ajouter plusieurs.",
          code: "FREE_LIMIT_REACHED",
        },
        { status: 403 }
      );
    }
  }

  const { marque, modele, annee, kilometrage, photo, dateAchat } = parsed.data;

  const moto = await prisma.moto.create({
    data: {
      userId: session.user.id,
      marque,
      modele,
      annee,
      kilometrage: kilometrage ?? 0,
      photo: photo || null,
      dateAchat: dateAchat ?? null,
    },
  });

  return NextResponse.json(moto);
}
