import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Diagnostic prod (sans valeurs secrètes) : ouvre GET /api/health sur ton domaine.
 */
export async function GET() {
  const env = {
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasDirectUrl: !!process.env.DIRECT_URL,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasResendKey: !!process.env.RESEND_API_KEY,
  };

  let database: "ok" | "error" = "error";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "ok";
  } catch (e) {
    console.error("[health] prisma:", e);
  }

  const ok =
    database === "ok" &&
    env.hasDatabaseUrl &&
    env.hasDirectUrl &&
    env.hasNextAuthUrl &&
    env.hasNextAuthSecret;

  return NextResponse.json(
    {
      ok,
      database,
      env,
      hint: !ok
        ? "Corrige les variables manquantes sur Vercel puis Redeploy. NEXTAUTH_URL doit être https://motomind.fr (sans slash final)."
        : undefined,
    },
    { status: ok ? 200 : 503 }
  );
}
