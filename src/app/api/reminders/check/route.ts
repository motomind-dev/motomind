import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkMaintenanceReminders } from "@/lib/reminders";

/**
 * Vérifie les rappels d'entretien pour l'utilisateur connecté et envoie les emails si nécessaire.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { sent, errors } = await checkMaintenanceReminders(session.user.id);

  return NextResponse.json({
    success: true,
    emailsSent: sent,
    ...(errors.length > 0 && { errors }),
  });
}

export async function POST() {
  return GET();
}
