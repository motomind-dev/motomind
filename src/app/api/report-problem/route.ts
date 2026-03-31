import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportProblemSchema } from "@/lib/validators/report-problem";
import { sendProblemReportEmail } from "@/lib/email";

export async function POST(req: Request) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Méthode non autorisée" }, { status: 405 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Format de données invalide" },
      { status: 400 }
    );
  }

  const parsed = reportProblemSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Données invalides";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { message, type, page } = parsed.data;
  const session = await getServerSession(authOptions);

  let userId: string | null = null;
  let email: string | null = null;

  if (session?.user?.id) {
    userId = session.user.id;
    email = session.user.email ?? null;
  } else if (parsed.data.email) {
    email = parsed.data.email;
  }

  try {
    const report = await prisma.problemReport.create({
      data: {
        userId,
        email,
        message,
        type: type ?? null,
        page: page ?? null,
      },
    });

    const sent = await sendProblemReportEmail({
      message,
      type: type ?? "autre",
      page: page ?? "—",
      userEmail: email ?? "Non renseigné",
      userId: userId ?? "—",
    }).catch(() => false);

    return NextResponse.json({
      success: true,
      id: report.id,
      ...(sent && { emailSent: true }),
    });
  } catch {
    return NextResponse.json(
      { error: "Impossible d'enregistrer le signalement" },
      { status: 500 }
    );
  }
}
