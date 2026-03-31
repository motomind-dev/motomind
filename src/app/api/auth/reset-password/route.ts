import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { onPasswordChanged } from "@/lib/security/detect-suspicious-activity";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format invalide" }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Données invalides";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { token, newPassword } = parsed.data;

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    return NextResponse.json(
      { error: "Lien invalide ou déjà utilisé" },
      { status: 400 }
    );
  }

  if (new Date() > resetToken.expires) {
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });
    return NextResponse.json(
      { error: "Lien expiré" },
      { status: 400 }
    );
  }

  const hashedPassword = await hash(newPassword, 12);

  const userEmail = resetToken.email;

  await prisma.$transaction([
    prisma.user.update({
      where: { email: userEmail },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    }),
  ]);

  onPasswordChanged(userEmail, req).catch((err) =>
    console.error("[Security] onPasswordChanged:", err)
  );

  return NextResponse.json({
    message: "Mot de passe mis à jour avec succès",
  });
}
