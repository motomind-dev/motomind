import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { compare, hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onPasswordChanged } from "@/lib/security/detect-suspicious-activity";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string; confirmPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format invalide" }, { status: 400 });
  }

  const { currentPassword, newPassword, confirmPassword } = body;
  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json(
      { error: "Tous les champs sont requis" },
      { status: 400 }
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Le nouveau mot de passe doit contenir au moins 6 caractères" },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "Les mots de passe ne correspondent pas" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.password) {
    return NextResponse.json(
      { error: "Impossible de modifier le mot de passe" },
      { status: 400 }
    );
  }

  const isValid = await compare(currentPassword, user.password);
  if (!isValid) {
    return NextResponse.json(
      { error: "Mot de passe actuel incorrect" },
      { status: 400 }
    );
  }

  const hashedPassword = await hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  });

  onPasswordChanged(user.email, req, user.id).catch((err) =>
    console.error("[Security] onPasswordChanged:", err)
  );

  return NextResponse.json({ success: true });
}
