import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { softDeleteEntretien } from "@/lib/services/soft-delete";
import { whereEntretienActive } from "@/lib/prisma-filters";
import { hasPremiumAccess } from "@/lib/plan-access";

async function checkEntretienOwnership(id: string, userId: string) {
  const entretien = await prisma.entretien.findFirst({
    where: { id, ...whereEntretienActive(userId) },
    include: { moto: true },
  });
  return entretien;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const entretien = await checkEntretienOwnership(id, session.user.id);
  if (!entretien) {
    return NextResponse.json({ error: "Entretien non trouvé" }, { status: 404 });
  }

  const body = await req.json();
  const {
    type,
    date,
    kilometrage,
    note,
    cout,
    statut,
    garage,
    invoiceUrl,
    invoiceType,
    nextDueDate: bodyNextDueDate,
    nextDueMileage: bodyNextDueMileage,
    reminderDaysBefore: bodyReminderDaysBefore,
    reminderMileageBefore: bodyReminderMileageBefore,
  } = body;

  if (invoiceUrl !== undefined || invoiceType !== undefined) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });
    if (!user || !hasPremiumAccess(user.plan)) {
      return NextResponse.json(
        { error: "Fonctionnalité réservée aux abonnés Premium" },
        { status: 403 }
      );
    }
  }

  const scheduling: Record<string, unknown> = {};
  let touchesScheduling = false;
  if (bodyNextDueDate !== undefined) {
    touchesScheduling = true;
    scheduling.nextDueDate =
      bodyNextDueDate === null || bodyNextDueDate === ""
        ? null
        : new Date(bodyNextDueDate);
  }
  if (bodyNextDueMileage !== undefined) {
    touchesScheduling = true;
    scheduling.nextDueMileage =
      bodyNextDueMileage === null || bodyNextDueMileage === ""
        ? null
        : parseInt(String(bodyNextDueMileage), 10);
  }
  if (bodyReminderDaysBefore !== undefined) {
    touchesScheduling = true;
    scheduling.reminderDaysBefore = parseInt(String(bodyReminderDaysBefore), 10);
  }
  if (bodyReminderMileageBefore !== undefined) {
    touchesScheduling = true;
    scheduling.reminderMileageBefore = parseInt(String(bodyReminderMileageBefore), 10);
  }

  const updated = await prisma.entretien.update({
    where: { id },
    data: {
      ...(type && { type }),
      ...(date && { date: new Date(date) }),
      ...(kilometrage !== undefined && { kilometrage: parseInt(kilometrage, 10) }),
      ...(note !== undefined && { note }),
      ...(cout !== undefined && { cout: parseFloat(cout) }),
      ...(statut && { statut }),
      ...(garage !== undefined && { garage }),
      ...(invoiceUrl !== undefined && { invoiceUrl: invoiceUrl || null }),
      ...(invoiceType !== undefined && { invoiceType: invoiceType || null }),
      ...scheduling,
      ...(touchesScheduling &&
        entretien.statut !== "termine" && {
          reminderSent: false,
          plannedLateReminderSent: false,
        }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const entretien = await checkEntretienOwnership(id, session.user.id);
  if (!entretien) {
    return NextResponse.json({ error: "Entretien non trouvé" }, { status: 404 });
  }

  const result = await softDeleteEntretien(id, session.user.id);
  if (!result) {
    return NextResponse.json({ error: "Suppression impossible" }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
