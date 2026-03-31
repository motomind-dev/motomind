import { NextResponse } from "next/server";
import { purgeExpired } from "@/lib/services/soft-delete";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await purgeExpired();

  if (result.errors.length > 0) {
    console.error("[Purge] Erreurs:", result.errors);
  }

  return NextResponse.json({
    success: true,
    motosDeleted: result.motosDeleted,
    entretiensDeleted: result.entretiensDeleted,
    ...(result.errors.length > 0 && { errors: result.errors }),
  });
}
