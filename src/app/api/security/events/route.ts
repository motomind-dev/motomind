import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRecentSecurityEvents } from "@/lib/security/security-events";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userEmail = session.user.email ?? undefined;
  const events = await getRecentSecurityEvents(
    session.user.id,
    20,
    userEmail
  );
  return NextResponse.json(events);
}
