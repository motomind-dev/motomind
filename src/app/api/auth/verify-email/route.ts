import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token || typeof token !== "string" || token.length < 10) {
    return NextResponse.json(
      { error: "Token invalide ou manquant" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Lien de vérification invalide ou expiré" },
        { status: 404 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    sendWelcomeEmail(user.email, user.name).catch((err) =>
      console.error("[verify-email] Welcome email error:", err)
    );

    return NextResponse.json({
      success: true,
      message: "Email vérifié avec succès",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 }
    );
  }
}
