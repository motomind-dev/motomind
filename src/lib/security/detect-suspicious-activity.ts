import { extractRequestContext, maskIp } from "./request-context";
import {
  createSecurityEvent,
  isDeviceKnown,
  isIpKnownForUser,
  registerKnownDevice,
  recordFailedLoginAttempt,
  countFailedLoginAttempts,
  getLatestFailedLoginEvent,
  markEventNotified,
  canSendAlert,
  countRecentResetRequests,
  FAILED_LOGIN_THRESHOLD,
  RESET_REQUEST_THRESHOLD,
} from "./security-events";
import { prisma } from "@/lib/prisma";
import {
  sendNewLoginAlertEmail,
  sendFailedLoginsAlertEmail,
  sendMultipleResetRequestsAlertEmail,
  sendPasswordChangedConfirmEmail,
} from "@/lib/email";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

type RequestLike = { headers: { get?: (name: string) => string | null } };

/** Appelé après un login réussi : détecte nouvel appareil/IP et envoie alerte si besoin */
export async function onLoginSuccess(
  userId: string,
  userEmail: string,
  req: RequestLike
) {
  const ctx = extractRequestContext(req);

  const [deviceKnown, ipKnown] = await Promise.all([
    isDeviceKnown(userId, ctx.fingerprint),
    isIpKnownForUser(userId, ctx.ip),
  ]);

  if (!deviceKnown) {
    const event = await createSecurityEvent({
      userId,
      email: userEmail,
      type: "NEW_DEVICE_LOGIN",
      severity: "MEDIUM",
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      fingerprint: ctx.fingerprint,
    });

    const allowed = await canSendAlert(userId, userEmail, "NEW_DEVICE_LOGIN");
    if (allowed) {
      const result = await sendNewLoginAlertEmail(userEmail, {
        date: dateFormat.format(new Date()),
        userAgent: ctx.userAgent || undefined,
        ipMasked: maskIp(ctx.ip),
      });
      if (result.success && event) {
        await markEventNotified(event.id);
      }
    }

    await registerKnownDevice(userId, ctx.fingerprint, ctx.userAgent, ctx.ip);
    return;
  }

  if (!ipKnown) {
    const event = await createSecurityEvent({
      userId,
      email: userEmail,
      type: "NEW_IP_LOGIN",
      severity: "LOW",
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      fingerprint: ctx.fingerprint,
    });

    const allowed = await canSendAlert(userId, userEmail, "NEW_IP_LOGIN");
    if (allowed) {
      const result = await sendNewLoginAlertEmail(userEmail, {
        date: dateFormat.format(new Date()),
        userAgent: ctx.userAgent || undefined,
        ipMasked: maskIp(ctx.ip),
      });
      if (result.success && event) {
        await markEventNotified(event.id);
      }
    }

    await registerKnownDevice(userId, ctx.fingerprint, ctx.userAgent, ctx.ip);
    return;
  }

  await registerKnownDevice(userId, ctx.fingerprint, ctx.userAgent, ctx.ip);
}

/** Appelé après un login échoué : enregistre la tentative et alerte si seuil dépassé */
export async function onLoginFailed(email: string, req: RequestLike) {
  const ctx = extractRequestContext(req);

  await recordFailedLoginAttempt(email, { ip: ctx.ip, userAgent: ctx.userAgent });

  const count = await countFailedLoginAttempts(email);
  if (count < FAILED_LOGIN_THRESHOLD) return;

  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) return;

  const event = await createSecurityEvent({
    userId: user.id,
    email,
    type: "MULTIPLE_FAILED_LOGINS",
    severity: "HIGH",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  const allowed = await canSendAlert(user.id, email, "MULTIPLE_FAILED_LOGINS");
  if (!allowed) return;

  const result = await sendFailedLoginsAlertEmail(email, {
    date: dateFormat.format(new Date()),
    ipMasked: maskIp(ctx.ip),
  });
  if (result.success && event) {
    await markEventNotified(event.id);
  }
}

/** Appelé avant/envoi d'une demande de reset : détecte les demandes répétées */
export async function onResetPasswordRequest(
  email: string,
  req: RequestLike
): Promise<{ shouldAlert: boolean }> {
  const ctx = extractRequestContext(req);

  await createSecurityEvent({
    email,
    type: "MULTIPLE_RESET_REQUESTS",
    severity: "MEDIUM",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  const count = await countRecentResetRequests(email);
  if (count < RESET_REQUEST_THRESHOLD) return { shouldAlert: false };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { shouldAlert: false };

  const allowed = await canSendAlert(user.id, email, "MULTIPLE_RESET_REQUESTS");
  if (!allowed) return { shouldAlert: false };

  const result = await sendMultipleResetRequestsAlertEmail(email, {
    date: dateFormat.format(new Date()),
  });
  if (result.success) {
    const ev = await prisma.securityEvent.findFirst({
      where: { email, type: "MULTIPLE_RESET_REQUESTS" },
      orderBy: { createdAt: "desc" },
    });
    if (ev) await markEventNotified(ev.id);
  }
  return { shouldAlert: true };
}

/** Appelé après un changement de mot de passe (reset ou profil) */
export async function onPasswordChanged(
  userEmail: string,
  req?: RequestLike,
  userId?: string
) {
  const ctx = req ? extractRequestContext(req) : { ip: "unknown", userAgent: "", fingerprint: "" };

  await createSecurityEvent({
    userId,
    email: userEmail,
    type: "PASSWORD_CHANGED",
    severity: "MEDIUM",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  const result = await sendPasswordChangedConfirmEmail(userEmail, {
    date: dateFormat.format(new Date()),
    ipMasked: maskIp(ctx.ip),
  });
  return result;
}
