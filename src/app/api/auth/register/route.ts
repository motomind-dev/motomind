import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import { getAppBaseUrl } from "@/lib/app-url";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const { allowed } = checkRateLimit("register", ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Format de données invalide" }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      const message = firstError?.message ?? "Données invalides";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 });
    }

    const hashedPassword = await hash(password, 12);
    const verificationToken = randomUUID();

    const baseUrl = getAppBaseUrl();
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name ?? null,
        emailVerified: false,
        verificationToken,
      },
    });

    const sendResult = await sendVerificationEmail(email, verificationLink);

    if (!sendResult.success) {
      await prisma.user.delete({ where: { id: user.id } }).catch((err) =>
        console.error("[register] rollback user after email failure:", err)
      );
      console.error("[register] Verification email failed:", sendResult.error);
      return NextResponse.json(
        {
          error:
            "Impossible d'envoyer l'email de vérification pour le moment. Réessaie dans quelques instants ou vérifie tes courriers indésirables si tu as déjà reçu un lien.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ message: "Compte créé avec succès" });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError?.code === "P2002") {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 });
    }
    if (prismaError?.code === "P1001" || prismaError?.code === "P1002") {
      return NextResponse.json(
        { error: "Impossible de se connecter à la base de données. Vérifiez que la base est initialisée (npx prisma db push)." },
        { status: 503 }
      );
    }
    if (error instanceof Error) {
      console.error("Register error:", error.message, (error as { code?: string }).code);
    } else {
      console.error("Register error:", error);
    }
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la création du compte. Réessayez." },
      { status: 500 }
    );
  }
}
