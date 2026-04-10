import { NextResponse } from "next/server";
import { isPremiumUnlockAllEnabled } from "@/lib/plan-access";

export const runtime = "nodejs";

/**
 * Vérifie ce que le runtime lit pour PREMIUM_UNLOCK_ALL (pas la valeur brute).
 * GET avec Authorization: Bearer <CRON_SECRET> — même garde que les routes cron.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    premiumUnlockAllEnabled: isPremiumUnlockAllEnabled(),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
  });
}
