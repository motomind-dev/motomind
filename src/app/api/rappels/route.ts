import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const rappels = await prisma.rappel.findMany({
    where: {
      entretien: {
        moto: { userId: session.user.id, deletedAt: null },
        deletedAt: null,
      },
    },
    include: { entretien: { include: { moto: true } } },
    orderBy: { dateEnvoi: "desc" },
  });

  return NextResponse.json(rappels);
}
