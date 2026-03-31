import { Resend } from "resend";
import { formatEntretienType } from "./utils";

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

function resendFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "MotoMind <onboarding@resend.dev>";
}

/** Adresse de réponse (améliore la délivrabilité si boîte réelle, ex. contact@motomind.fr) */
function resendReplyTo(): string | undefined {
  const v = process.env.RESEND_REPLY_TO?.trim();
  return v || undefined;
}

const EMAIL_FOOTER_HTML = `
<div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #2a2a2a; text-align: center; color: #888888; font-size: 12px; line-height: 1.6; opacity: 0.9;">
  <p style="margin: 4px 0;">MotoMind</p>
  <p style="margin: 4px 0;">Suivi intelligent de l’entretien moto</p>
  <p style="margin: 8px 0;">Si tu n’es pas à l’origine de cet email, ignore-le.</p>
  <p style="margin: 4px 0;">© 2026 MotoMind</p>
</div>
`;

const EMAIL_FOOTER_TEXT = [
  "",
  "MotoMind",
  "Suivi intelligent de l’entretien moto",
  "Si tu n’es pas à l’origine de cet email, ignore-le.",
  "© 2026 MotoMind",
].join("\n");

export type MaintenanceForEmail = {
  type: string;
  nextDueMileage: number;
};

export type MotorcycleForEmail = {
  marque: string;
  modele: string;
};

/**
 * Envoie un email de vérification d'inscription.
 */
export async function sendVerificationEmail(
  userEmail: string,
  verificationLink: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("Email disabled: RESEND_API_KEY missing");
    return { success: false, error: "RESEND_API_KEY non configuré" };
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 24px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #171717; border-radius: 12px; border: 1px solid #262626; overflow: hidden;">
          <tr>
            <td style="padding: 28px 24px; text-align: center; border-bottom: 1px solid #262626;">
              <span style="font-size: 24px; font-weight: bold; color: #fafafa;">Moto</span><span style="font-size: 24px; font-weight: bold; color: #FF6B35;">Mind</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px;">
              <p style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #fafafa;">Bienvenue sur le carnet 🏍️</p>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.65; color: #a3a3a3;">
                Merci de t&apos;être inscrit. Pour activer ton compte et commencer à suivre l&apos;entretien de ta moto, il nous suffit de confirmer que cette adresse email est bien la tienne.
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.65; color: #a3a3a3;">
                Un clic, et tu pourras enregistrer tes motos, tes entretiens et recevoir tes rappels — tout au même endroit.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${verificationLink}" style="display: inline-block; padding: 14px 28px; background-color: #FF6B35; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">Confirmer mon adresse email</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #737373;">
                Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br />
                <span style="color: #a3a3a3; word-break: break-all;">${verificationLink}</span>
              </p>
              <p style="margin: 16px 0 0; font-size: 13px; line-height: 1.5; color: #525252;">
                Tu n&apos;as pas créé de compte MotoMind ? Tu peux ignorer ce message en toute tranquillité.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 24px; text-align: center; border-top: 1px solid #262626;">
              <div style="text-align: center; color: #888888; font-size: 12px; line-height: 1.6; opacity: 0.9;">
                <p style="margin: 4px 0;">MotoMind</p>
                <p style="margin: 4px 0;">Suivi intelligent de l’entretien moto</p>
                <p style="margin: 8px 0;">Si tu n’es pas à l’origine de cet email, ignore-le.</p>
                <p style="margin: 4px 0;">© 2026 MotoMind</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = [
    "Bienvenue sur MotoMind 🏍️",
    "",
    "Merci de t'être inscrit. Pour activer ton compte, confirme ton adresse en ouvrant ce lien :",
    verificationLink,
    "",
    "Tu pourras ensuite enregistrer tes motos, tes entretiens et recevoir tes rappels.",
    "",
    "Tu n'as pas créé de compte ? Ignore ce message.",
    EMAIL_FOOTER_TEXT,
  ].join("\n");

  try {
    const { error } = await resend.emails.send({
      from: resendFromAddress(),
      to: userEmail,
      subject: "Active ton compte MotoMind — confirme ton email",
      html,
      text,
      ...(resendReplyTo() ? { replyTo: resendReplyTo() } : {}),
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.error("sendVerificationEmail error:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erreur d'envoi",
    };
  }
}

/**
 * Envoie un email de bienvenue après inscription.
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName?: string | null
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("Email disabled: RESEND_API_KEY missing");
    return { success: false, error: "RESEND_API_KEY non configuré" };
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3002";
  const loginUrl = `${baseUrl}/login`;
  const greeting = userName ? `Salut ${userName} 👋` : "Salut rider 👋";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 24px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #171717; border-radius: 12px; border: 1px solid #262626; overflow: hidden;">
          <tr>
            <td style="padding: 32px 24px; text-align: center; border-bottom: 1px solid #262626;">
              <span style="font-size: 24px; font-weight: bold; color: #fafafa;">Moto</span><span style="font-size: 24px; font-weight: bold; color: #FF6B35;">Mind</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 16px; font-size: 18px; color: #fafafa;">${greeting}</p>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #a3a3a3;">
                Bienvenue dans la communauté ! Tu viens de faire le premier pas pour garder ta bécane au top.
              </p>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #a3a3a3;">
                Avec MotoMind, tu peux suivre tous tes entretiens, recevoir des rappels et ne plus jamais oublier une vidange ou une révision. Moins de stress, plus de contrôle, plus de kilomètres en sérénité.
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #a3a3a3;">
                Ton compte est activé — viens compléter ton carnet d&apos;entretien !
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display: inline-block; padding: 14px 32px; background-color: #FF6B35; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">Accéder à mon carnet</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px; text-align: center; border-top: 1px solid #262626;">
              <div style="text-align: center; color: #888888; font-size: 12px; line-height: 1.6; opacity: 0.9;">
                <p style="margin: 4px 0;">MotoMind</p>
                <p style="margin: 4px 0;">Suivi intelligent de l’entretien moto</p>
                <p style="margin: 8px 0;">Si tu n’es pas à l’origine de cet email, ignore-le.</p>
                <p style="margin: 4px 0;">© 2026 MotoMind</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textPlain = `${greeting}\n\nBienvenue sur MotoMind. Connecte-toi pour compléter ton carnet : ${loginUrl}\n${EMAIL_FOOTER_TEXT}`;

  try {
    const { error } = await resend.emails.send({
      from: resendFromAddress(),
      to: userEmail,
      subject: "Bienvenue sur MotoMind 🏍️",
      html,
      text: textPlain,
      ...(resendReplyTo() ? { replyTo: resendReplyTo() } : {}),
    });

    if (error) {
      console.error("Resend welcome email error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.error("sendWelcomeEmail error:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erreur d'envoi",
    };
  }
}

/**
 * Envoie un email de rappel d'entretien moto.
 */
export async function sendMaintenanceReminderEmail(
  userEmail: string,
  maintenance: MaintenanceForEmail,
  motorcycle: MotorcycleForEmail
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("Email disabled: RESEND_API_KEY missing");
    return { success: false, error: "RESEND_API_KEY non configuré" };
  }

  const typeLabel = formatEntretienType(maintenance.type);
  const motoLabel = `${motorcycle.marque} ${motorcycle.modele}`;

  const html = `
    <p>Bonjour,</p>
    <p>Un entretien est bientôt à prévoir pour votre moto.</p>
    <p><strong>Moto :</strong> ${motoLabel}</p>
    <p><strong>Entretien :</strong> ${typeLabel}</p>
    <p><strong>Kilométrage prévu :</strong> ${maintenance.nextDueMileage.toLocaleString("fr-FR")} km</p>
    <p>Votre entretien approche, pensez à prendre rendez-vous chez votre garagiste.</p>
    ${EMAIL_FOOTER_HTML}
  `;

  try {
    const { error } = await resend.emails.send({
      from: resendFromAddress(),
      to: userEmail,
      subject: "Rappel entretien moto",
      html,
      ...(resendReplyTo() ? { replyTo: resendReplyTo() } : {}),
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.error("sendMaintenanceReminderEmail error:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erreur d'envoi",
    };
  }
}

export type SecurityAlertContext = {
  date: string;
  userAgent?: string;
  ipMasked?: string;
};

/**
 * Envoie un email d'alerte sécurité : nouvelle connexion détectée.
 */
export async function sendNewLoginAlertEmail(
  userEmail: string,
  ctx: SecurityAlertContext
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("Email disabled: RESEND_API_KEY missing");
    return { success: false, error: "RESEND_API_KEY non configuré" };
  }

  const deviceInfo = ctx.userAgent || "Non disponible";
  const ipInfo = ctx.ipMasked || "Non disponible";
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:24px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#171717;border-radius:12px;border:1px solid #262626;overflow:hidden;">
      <tr><td style="padding:28px 24px;text-align:center;border-bottom:1px solid #262626;"><span style="font-size:24px;font-weight:bold;color:#fafafa;">Moto</span><span style="font-size:24px;font-weight:bold;color:#FF6B35;">Mind</span></td></tr>
      <tr><td style="padding:32px 28px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#fafafa;">Nouvelle connexion détectée</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#a3a3a3;">Une nouvelle connexion a été détectée sur ton compte.</p>
        <p style="margin:0 0 6px;font-size:14px;color:#d4d4d4;"><strong>Date et heure :</strong> ${ctx.date}</p>
        <p style="margin:0 0 6px;font-size:14px;color:#d4d4d4;"><strong>Appareil :</strong> ${deviceInfo}</p>
        <p style="margin:0 0 18px;font-size:14px;color:#d4d4d4;"><strong>IP :</strong> ${ipInfo}</p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#a3a3a3;">Si c'est toi, tu peux ignorer cet email.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#a3a3a3;">Sinon, modifie ton mot de passe rapidement.</p>
      </td></tr>
      <tr><td style="padding:18px 24px;text-align:center;border-top:1px solid #262626;">
        <div style="text-align: center; color: #888888; font-size: 12px; line-height: 1.6; opacity: 0.9;">
          <p style="margin: 4px 0;">MotoMind</p>
          <p style="margin: 4px 0;">Suivi intelligent de l’entretien moto</p>
          <p style="margin: 8px 0;">Si tu n’es pas à l’origine de cet email, ignore-le.</p>
          <p style="margin: 4px 0;">© 2026 MotoMind</p>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const text = [
    "Nouvelle connexion détectée — MotoMind",
    `Date et heure : ${ctx.date}`,
    `Appareil : ${deviceInfo}`,
    `IP : ${ipInfo}`,
    "",
    "Si ce n'est pas toi, modifie ton mot de passe rapidement.",
    EMAIL_FOOTER_TEXT,
  ].join("\n");

  try {
    const { error } = await resend.emails.send({
      from: resendFromAddress(),
      to: userEmail,
      subject: "Nouvelle connexion détectée sur votre compte MotoMind",
      html,
      text,
      ...(resendReplyTo() ? { replyTo: resendReplyTo() } : {}),
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

/**
 * Envoie un email d'alerte : plusieurs tentatives de connexion.
 */
export async function sendFailedLoginsAlertEmail(
  userEmail: string,
  ctx: SecurityAlertContext
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("Email disabled: RESEND_API_KEY missing");
    return { success: false, error: "RESEND_API_KEY non configuré" };
  }

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:24px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#171717;border-radius:12px;border:1px solid #262626;overflow:hidden;">
      <tr><td style="padding:28px 24px;text-align:center;border-bottom:1px solid #262626;"><span style="font-size:24px;font-weight:bold;color:#fafafa;">Moto</span><span style="font-size:24px;font-weight:bold;color:#FF6B35;">Mind</span></td></tr>
      <tr><td style="padding:32px 28px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#fafafa;">Tentatives de connexion détectées</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#a3a3a3;">Plusieurs tentatives de connexion infructueuses ont été détectées sur ton compte.</p>
        <p style="margin:0 0 6px;font-size:14px;color:#d4d4d4;"><strong>Date :</strong> ${ctx.date}</p>
        ${ctx.ipMasked ? `<p style="margin:0 0 18px;font-size:14px;color:#d4d4d4;"><strong>Adresse IP :</strong> ${ctx.ipMasked}</p>` : ""}
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#a3a3a3;">Si c'est toi, tu peux ignorer cet email.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#a3a3a3;">Si ce n'est pas toi, pense à modifier ton mot de passe.</p>
      </td></tr>
      <tr><td style="padding:18px 24px;text-align:center;border-top:1px solid #262626;">
        <div style="text-align: center; color: #888888; font-size: 12px; line-height: 1.6; opacity: 0.9;">
          <p style="margin: 4px 0;">MotoMind</p>
          <p style="margin: 4px 0;">Suivi intelligent de l’entretien moto</p>
          <p style="margin: 8px 0;">Si tu n’es pas à l’origine de cet email, ignore-le.</p>
          <p style="margin: 4px 0;">© 2026 MotoMind</p>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const text = [
    "Tentatives de connexion détectées — MotoMind",
    `Date : ${ctx.date}`,
    ctx.ipMasked ? `IP : ${ctx.ipMasked}` : "",
    "",
    "Si ce n'est pas toi, modifie ton mot de passe.",
    EMAIL_FOOTER_TEXT,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { error } = await resend.emails.send({
      from: resendFromAddress(),
      to: userEmail,
      subject: "Activité inhabituelle sur votre compte MotoMind",
      html,
      text,
      ...(resendReplyTo() ? { replyTo: resendReplyTo() } : {}),
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

/**
 * Envoie un email d'alerte : demandes de reset password répétées.
 */
export async function sendMultipleResetRequestsAlertEmail(
  userEmail: string,
  ctx: SecurityAlertContext
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("Email disabled: RESEND_API_KEY missing");
    return { success: false, error: "RESEND_API_KEY non configuré" };
  }

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:24px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#171717;border-radius:12px;border:1px solid #262626;overflow:hidden;">
      <tr><td style="padding:28px 24px;text-align:center;border-bottom:1px solid #262626;"><span style="font-size:24px;font-weight:bold;color:#fafafa;">Moto</span><span style="font-size:24px;font-weight:bold;color:#FF6B35;">Mind</span></td></tr>
      <tr><td style="padding:32px 28px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#fafafa;">Demandes de reset répétées</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#a3a3a3;">Plusieurs demandes de réinitialisation ont été faites pour ton compte.</p>
        <p style="margin:0 0 18px;font-size:14px;color:#d4d4d4;"><strong>Date :</strong> ${ctx.date}</p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#a3a3a3;">Si c'est toi, vérifie ta boîte de réception et tes spams.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#a3a3a3;">Si ce n'est pas toi, ignore ce message : ton mot de passe reste inchangé sans action.</p>
      </td></tr>
      <tr><td style="padding:18px 24px;text-align:center;border-top:1px solid #262626;">
        <div style="text-align: center; color: #888888; font-size: 12px; line-height: 1.6; opacity: 0.9;">
          <p style="margin: 4px 0;">MotoMind</p>
          <p style="margin: 4px 0;">Suivi intelligent de l’entretien moto</p>
          <p style="margin: 8px 0;">Si tu n’es pas à l’origine de cet email, ignore-le.</p>
          <p style="margin: 4px 0;">© 2026 MotoMind</p>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const text = [
    "Demandes de reset répétées — MotoMind",
    `Date : ${ctx.date}`,
    "",
    "Si ce n'est pas toi, ignore ce message : ton mot de passe ne change pas sans action.",
    EMAIL_FOOTER_TEXT,
  ].join("\n");

  try {
    const { error } = await resend.emails.send({
      from: resendFromAddress(),
      to: userEmail,
      subject: "Demandes de réinitialisation de mot de passe - MotoMind",
      html,
      text,
      ...(resendReplyTo() ? { replyTo: resendReplyTo() } : {}),
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

/**
 * Envoie un email de confirmation : mot de passe modifié.
 */
export async function sendPasswordChangedConfirmEmail(
  userEmail: string,
  ctx: SecurityAlertContext
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("Email disabled: RESEND_API_KEY missing");
    return { success: false, error: "RESEND_API_KEY non configuré" };
  }

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:24px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#171717;border-radius:12px;border:1px solid #262626;overflow:hidden;">
      <tr><td style="padding:28px 24px;text-align:center;border-bottom:1px solid #262626;"><span style="font-size:24px;font-weight:bold;color:#fafafa;">Moto</span><span style="font-size:24px;font-weight:bold;color:#FF6B35;">Mind</span></td></tr>
      <tr><td style="padding:32px 28px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#fafafa;">Mot de passe modifié</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#a3a3a3;">Ton mot de passe MotoMind a été modifié avec succès.</p>
        <p style="margin:0 0 18px;font-size:14px;color:#d4d4d4;"><strong>Date :</strong> ${ctx.date}</p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#a3a3a3;">Si c'est toi, tout est en ordre.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#a3a3a3;">Si ce n'est pas toi, contacte-nous immédiatement.</p>
      </td></tr>
      <tr><td style="padding:18px 24px;text-align:center;border-top:1px solid #262626;">
        <div style="text-align: center; color: #888888; font-size: 12px; line-height: 1.6; opacity: 0.9;">
          <p style="margin: 4px 0;">MotoMind</p>
          <p style="margin: 4px 0;">Suivi intelligent de l’entretien moto</p>
          <p style="margin: 8px 0;">Si tu n’es pas à l’origine de cet email, ignore-le.</p>
          <p style="margin: 4px 0;">© 2026 MotoMind</p>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const text = [
    "Mot de passe modifié — MotoMind",
    `Date : ${ctx.date}`,
    "",
    "Si ce n'est pas toi, contacte-nous immédiatement.",
    EMAIL_FOOTER_TEXT,
  ].join("\n");

  try {
    const { error } = await resend.emails.send({
      from: resendFromAddress(),
      to: userEmail,
      subject: "Votre mot de passe a été modifié - MotoMind",
      html,
      text,
      ...(resendReplyTo() ? { replyTo: resendReplyTo() } : {}),
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

/**
 * Envoie un email de réinitialisation de mot de passe.
 */
export async function sendPasswordResetEmail(
  userEmail: string,
  resetLink: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("Email disabled: RESEND_API_KEY missing");
    return { success: false, error: "RESEND_API_KEY non configuré" };
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 24px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #171717; border-radius: 12px; border: 1px solid #262626; overflow: hidden;">
          <tr>
            <td style="padding: 28px 24px; text-align: center; border-bottom: 1px solid #262626;">
              <span style="font-size: 24px; font-weight: bold; color: #fafafa;">Moto</span><span style="font-size: 24px; font-weight: bold; color: #FF6B35;">Mind</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px;">
              <p style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #fafafa;">Réinitialisation du mot de passe</p>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.65; color: #a3a3a3;">
                Tu as demandé à réinitialiser le mot de passe de ton compte MotoMind.
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.65; color: #a3a3a3;">
                Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; padding: 14px 28px; background-color: #FF6B35; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">Réinitialiser mon mot de passe</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #737373;">
                Ce lien expire dans 1 heure.
              </p>
              <p style="margin: 12px 0 0; font-size: 13px; line-height: 1.5; color: #737373;">
                Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br />
                <span style="color: #a3a3a3; word-break: break-all;">${resetLink}</span>
              </p>
              <p style="margin: 16px 0 0; font-size: 13px; line-height: 1.5; color: #525252;">
                Si tu n&apos;es pas à l&apos;origine de cette demande, ignore simplement ce message.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 24px; text-align: center; border-top: 1px solid #262626;">
              <div style="text-align: center; color: #888888; font-size: 12px; line-height: 1.6; opacity: 0.9;">
                <p style="margin: 4px 0;">MotoMind</p>
                <p style="margin: 4px 0;">Suivi intelligent de l’entretien moto</p>
                <p style="margin: 8px 0;">Si tu n’es pas à l’origine de cet email, ignore-le.</p>
                <p style="margin: 4px 0;">© 2026 MotoMind</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = [
    "Réinitialisation du mot de passe — MotoMind",
    "",
    "Tu as demandé à réinitialiser le mot de passe de ton compte.",
    "Utilise ce lien (valide 1 heure) :",
    resetLink,
    "",
    "Si tu n'es pas à l'origine de cette demande, ignore ce message.",
    EMAIL_FOOTER_TEXT,
  ].join("\n");

  try {
    const { error } = await resend.emails.send({
      from: resendFromAddress(),
      to: userEmail,
      subject: "Réinitialisation de ton mot de passe — MotoMind",
      html,
      text,
      ...(resendReplyTo() ? { replyTo: resendReplyTo() } : {}),
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.error("sendPasswordResetEmail error:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erreur d'envoi",
    };
  }
}

export type ProblemReportEmailData = {
  message: string;
  type: string;
  page: string;
  userEmail: string;
  userId: string;
};

/**
 * Envoie un email à l'admin pour un signalement de problème.
 * Utilise ADMIN_EMAIL si configuré, sinon ne fait rien.
 */
export async function sendProblemReportEmail(
  data: ProblemReportEmailData
): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!resend || !adminEmail) {
    if (!resend) console.log("Email disabled: RESEND_API_KEY missing");
    return false;
  }

  const html = `
    <p>Nouveau signalement de problème MotoMind</p>
    <p><strong>Type :</strong> ${data.type}</p>
    <p><strong>Page :</strong> ${data.page}</p>
    <p><strong>Utilisateur :</strong> ${data.userEmail} (ID: ${data.userId})</p>
    <p><strong>Message :</strong></p>
    <p>${data.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
    ${EMAIL_FOOTER_HTML}
  `;

  try {
    const { error } = await resend.emails.send({
      from: resendFromAddress(),
      to: adminEmail,
      subject: `[MotoMind] Signalement : ${data.type}`,
      html,
      ...(resendReplyTo() ? { replyTo: resendReplyTo() } : {}),
    });
    return !error;
  } catch {
    return false;
  }
}
