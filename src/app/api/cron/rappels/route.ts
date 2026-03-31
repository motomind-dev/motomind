import { NextResponse } from "next/server";
import { checkAllMaintenanceReminders } from "@/lib/reminders";

// Vercel Cron: GET /api/cron/rappels (avec CRON_SECRET)
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sent, errors } = await checkAllMaintenanceReminders();

  return NextResponse.json({
    success: true,
    emailsSent: sent,
    ...(errors.length > 0 && { errors }),
  });
}
