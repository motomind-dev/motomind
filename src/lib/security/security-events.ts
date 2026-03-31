import { prisma } from "@/lib/prisma";

export type SecurityEventType =
  | "FAILED_LOGIN_ATTEMPT"
  | "NEW_DEVICE_LOGIN"
  | "NEW_IP_LOGIN"
  | "MULTIPLE_FAILED_LOGINS"
  | "MULTIPLE_RESET_REQUESTS"
  | "PASSWORD_CHANGED"
  | "LOGIN_AFTER_PASSWORD_RESET";

export type SecuritySeverity = "LOW" | "MEDIUM" | "HIGH";

const RECENT_DEVICE_DAYS = 90;
const FAILED_LOGIN_WINDOW_MINUTES = 15;
const FAILED_LOGIN_THRESHOLD = 5;
const RESET_REQUEST_WINDOW_MINUTES = 60;
const RESET_REQUEST_THRESHOLD = 3;
const ALERT_COOLDOWN_MINUTES = 60;

export type CreateEventInput = {
  userId?: string;
  email?: string;
  type: SecurityEventType;
  severity?: SecuritySeverity;
  ip?: string;
  userAgent?: string;
  fingerprint?: string;
  metadata?: Record<string, unknown>;
};

export async function createSecurityEvent(input: CreateEventInput) {
  const metadataStr = input.metadata
    ? JSON.stringify(input.metadata)
    : null;

  return prisma.securityEvent.create({
    data: {
      userId: input.userId ?? null,
      email: input.email ?? null,
      type: input.type as string,
      severity: (input.severity ?? "MEDIUM") as string,
      ipAddress: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      fingerprint: input.fingerprint ?? null,
      metadata: metadataStr,
    },
  });
}

/** Vérifie si l'appareil est connu pour cet utilisateur */
export async function isDeviceKnown(
  userId: string,
  fingerprint: string
): Promise<boolean> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECENT_DEVICE_DAYS);

  const known = await prisma.knownDevice.findUnique({
    where: { userId_fingerprint: { userId, fingerprint } },
  });
  return !!known;
}

/** Vérifie si l'IP est connue pour cet utilisateur (via KnownDevice) */
export async function isIpKnownForUser(
  userId: string,
  ip: string
): Promise<boolean> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECENT_DEVICE_DAYS);

  const known = await prisma.knownDevice.findFirst({
    where: { userId, ipAddress: ip, lastSeenAt: { gte: cutoff } },
  });
  return !!known;
}

/** Enregistre ou met à jour l'appareil connu */
export async function registerKnownDevice(
  userId: string,
  fingerprint: string,
  userAgent?: string,
  ip?: string
) {
  await prisma.knownDevice.upsert({
    where: { userId_fingerprint: { userId, fingerprint } },
    create: {
      userId,
      fingerprint,
      userAgent: userAgent ?? null,
      ipAddress: ip ?? null,
      lastSeenAt: new Date(),
    },
    update: {
      userAgent: userAgent ?? undefined,
      ipAddress: ip ?? undefined,
      lastSeenAt: new Date(),
    },
  });
}

/** Compte les tentatives de login échouées récentes */
export async function countFailedLoginAttempts(
  email: string,
  windowMinutes: number = FAILED_LOGIN_WINDOW_MINUTES
): Promise<number> {
  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - windowMinutes);

  return prisma.securityEvent.count({
    where: {
      email,
      type: "FAILED_LOGIN_ATTEMPT",
      createdAt: { gte: cutoff },
    },
  });
}

/** Enregistre une tentative de login échouée */
export async function recordFailedLoginAttempt(
  email: string,
  ctx: { ip?: string; userAgent?: string }
) {
  return createSecurityEvent({
    email,
    type: "FAILED_LOGIN_ATTEMPT",
    severity: "LOW",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
}

/** Récupère le dernier événement MULTIPLE_FAILED_LOGINS pour marquer comme notifié */
export async function getLatestFailedLoginEvent(email: string) {
  return prisma.securityEvent.findFirst({
    where: { email, type: "MULTIPLE_FAILED_LOGINS" },
    orderBy: { createdAt: "desc" },
  });
}

/** Compte les demandes de reset récentes pour un email */
export async function countRecentResetRequests(email: string): Promise<number> {
  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - RESET_REQUEST_WINDOW_MINUTES);

  return prisma.securityEvent.count({
    where: {
      email,
      type: "MULTIPLE_RESET_REQUESTS",
      createdAt: { gte: cutoff },
    },
  });
}

/** Vérifie si on peut envoyer une alerte (anti-spam) */
export async function canSendAlert(
  userId: string | null,
  email: string | null,
  eventType: SecurityEventType
): Promise<boolean> {
  if (!userId && !email) return false;

  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - ALERT_COOLDOWN_MINUTES);

  const where: { type: string; createdAt: { gte: Date }; notifiedAt: { not: null } } = {
    type: eventType,
    createdAt: { gte: cutoff },
    notifiedAt: { not: null },
  };

  if (userId) {
    const count = await prisma.securityEvent.count({
      where: { ...where, userId },
    });
    return count === 0;
  }
  if (email) {
    const count = await prisma.securityEvent.count({
      where: { ...where, email },
    });
    return count === 0;
  }
  return true;
}

/** Marque un événement comme notifié */
export async function markEventNotified(eventId: string) {
  await prisma.securityEvent.update({
    where: { id: eventId },
    data: { notifiedAt: new Date() },
  });
}

/** Récupère les derniers événements pour un utilisateur (par userId ou email). Exclut FAILED_LOGIN_ATTEMPT (trop nombreux). */
export async function getRecentSecurityEvents(
  userId: string,
  limit = 20,
  userEmail?: string
) {
  const baseWhere = userEmail
    ? { OR: [{ userId }, { email: userEmail }] }
    : { userId };
  const where = {
    ...baseWhere,
    type: { not: "FAILED_LOGIN_ATTEMPT" },
  };
  return prisma.securityEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export { FAILED_LOGIN_THRESHOLD, RESET_REQUEST_THRESHOLD };
