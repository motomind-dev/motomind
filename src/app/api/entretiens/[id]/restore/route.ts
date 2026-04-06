import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { restoreEntretien } from "@/lib/services/soft-delete";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const result = await restoreEntretien(id, session.user.id);

  if (!result) {
    return NextResponse.json({ error: "Entretien non trouvé" }, { status: 404 });
  }
  if ("error" in result) {
    if (result.error === "expired") {
      return NextResponse.json(
        { error: "La période de restauration (30 jours) est dépassée" },
        { status: 400 }
      );
    }
    if (result.error === "moto_deleted") {
      return NextResponse.json(
        { error: "Restaure d'abord la moto associée" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Restauration impossible" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
