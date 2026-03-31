import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { resetPasswordRequestSchema } from "@/lib/validators/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { onResetPasswordRequest } from "@/lib/security/detect-suspicious-activity";
import crypto from "crypto";

const TOKEN_EXPIRY_HOURS = 1;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const { allowed } = checkRateLimit("reset-password", ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format invalide" }, { status: 400 });
  }

  const parsed = resetPasswordRequestSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Données invalides";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const email = parsed.data.email;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Email introuvable" },
      { status: 404 }
    );
  }

  await onResetPasswordRequest(email, req).catch((err) =>
    console.error("[Security] onResetPasswordRequest:", err)
  );

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date();
  expires.setHours(expires.getHours() + TOKEN_EXPIRY_HOURS);

  await prisma.passwordResetToken.deleteMany({
    where: { email },
  });

  await prisma.passwordResetToken.create({
    data: { email, token, expires },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3002";
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  const result = await sendPasswordResetEmail(email, resetLink);

  if (!result.success) {
    await prisma.passwordResetToken.deleteMany({
      where: { email, token },
    });
    return NextResponse.json(
      { error: "Impossible d'envoyer l'email. Réessayez plus tard." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Si cet email existe, un lien de réinitialisation a été envoyé.",
  });
}
