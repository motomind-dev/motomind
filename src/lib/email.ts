import { Resend } from "resend";
import { formatEntretienType } from "./utils";
import { getAppBaseUrl } from "./app-url";

/**
 * Point d’entrée unique pour les emails transactionnels (Resend).
 * Convention : garder le même rendu sombre que la landing et `globals.css` (`:root`).
 * Tout nouvel email vers un utilisateur doit utiliser `emailDocument()`, la palette `T`
 * et `emailButton()` pour les CTA — ne pas introduire d’autres fonds ou couleurs de marque.
 */

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

/**
 * Palette alignée sur src/app/globals.css :root et la landing (thème sombre).
 */
const T = {
  bg: "#0A0A0A",
  card: "#111111",
  border: "#262626",
  text: "#FAFAFA",
  textMuted: "#A3A3A3",
  textDim: "#737373",
  textFaint: "#525252",
  /** Accent texte (logo) — inchangé par rapport au site. */
  accent: "#FF6B35",
  /**
   * Fond des boutons CTA : Gmail / Mail Android tirent souvent #FF6B35 vers le rouge
   * quand seul le &lt;a&gt; a un background. #F97316 + td bgcolor stabilise l’aperçu.
   */
  accentCta: "#F97316",
  footer: "#888888",
} as const;

const EMAIL_HEAD = `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
</head>`;

/**
 * Outlook, Gmail et autres clients ignorent souvent le fond CSS sur body ;
 * les attributs HTML bgcolor + bordures explicites sur <table>/<td> stabilisent l’affichage.
 */
function emailLogoRow(): string {
  return `<tr>
    <td bgcolor="${T.card}" style="padding:28px 24px;text-align:center;border-bottom:1px solid ${T.border};background-color:${T.card};">
      <span style="font-size:24px;font-weight:bold;color:${T.text};">Moto</span><span style="font-size:24px;font-weight:bold;color:${T.accentCta};">Mind</span>
    </td>
  </tr>`;
}

function emailFooterRow(): string {
  return `<tr>
    <td bgcolor="${T.card}" style="padding:18px 24px;text-align:center;border-top:1px solid ${T.border};background-color:${T.card};">
      <div style="text-align:center;color:${T.footer};font-size:12px;line-height:1.6;opacity:0.9;">
        <p style="margin:4px 0;">MotoMind</p>
        <p style="margin:4px 0;">Suivi intelligent de l’entretien moto</p>
        <p style="margin:8px 0;">Si tu n’es pas à l’origine de cet email, ignore-le.</p>
        <p style="margin:4px 0;">© 2026 MotoMind</p>
      </div>
    </td>
  </tr>`;
}

/** Gabarit unique : fond #0A0A0A, carte #111111, bordures #262626 (comme la landing). */
function emailDocument(innerBodyHtml: string, maxWidthPx = 520): string {
  return `<!DOCTYPE html>
<html lang="fr">
${EMAIL_HEAD}
<body bgcolor="${T.bg}" style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:${T.bg};color:${T.text};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="${T.bg}" style="background-color:${T.bg};padding:24px;">
    <tr>
      <td align="center" bgcolor="${T.bg}" style="background-color:${T.bg};padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="${T.card}" style="width:100%;max-width:${maxWidthPx}px;background-color:${T.card};border-radius:12px;border:1px solid ${T.border};overflow:hidden;">
          ${emailLogoRow()}
          <tr>
            <td bgcolor="${T.card}" style="padding:32px 28px;color:${T.text};background-color:${T.card};">${innerBodyHtml}</td>
          </tr>
          ${emailFooterRow()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function emailButton(href: string, label: string): string {
  const c = T.accentCta;
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="${T.card}" style="background-color:${T.card};">
    <tr>
      <td align="center" bgcolor="${T.card}" style="background-color:${T.card};padding:8px 0;">
        <table cellpadding="0" cellspacing="0" border="0" role="presentation" align="center">
          <tr>
            <td align="center" bgcolor="${c}" style="background-color:${c};border-radius:12px;mso-padding-alt:14px 28px;">
              <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;line-height:1.25;color:#ffffff;text-decoration:none;border-radius:12px;background-color:${c};">
                ${label}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

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

export type PlannedEntretienForEmail = {
  type: string;
  nextDueDate: Date | null;
  nextDueMileage: number | null;
};

/**
 * Rappel Premium : entretien planifié par l’utilisateur (date / km renseignés dans MotoMind).
 */
export async function sendPlannedEntretienReminderEmail(
  userEmail: string,
  planned: PlannedEntretienForEmail,
  motorcycle: MotorcycleForEmail
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("Email disabled: RESEND_API_KEY missing");
    return { success: false, error: "RESEND_API_KEY non configuré" };
  }

  const typeLabel = formatEntretienType(planned.type);
  const motoLabel = `${motorcycle.marque} ${motorcycle.modele}`;
  const dateStr = planned.nextDueDate
    ? new Date(planned.nextDueDate).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  const kmStr =
    planned.nextDueMileage != null
      ? `${planned.nextDueMileage.toLocaleString("fr-FR")} km`
      : null;

  const detailLines: string[] = [];
  if (dateStr) {
    detailLines.push(
      `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${T.text};"><strong style="color:${T.text};">Date prévue :</strong> ${dateStr}</p>`
    );
  }
  if (kmStr) {
    detailLines.push(
      `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${T.text};"><strong style="color:${T.text};">Kilométrage cible :</strong> ${kmStr}</p>`
    );
  }

  const appUrl = getAppBaseUrl();
  const carnetUrl = `${appUrl}/dashboard/entretiens`;

  const inner = `
              <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:${T.text};">Rappel : <span style="color:${T.accentCta};">entretien planifié</span> 📅</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${T.textMuted};">
                Tu as toi-même planifié cet entretien dans MotoMind. L’échéance approche — pense à ne pas l’oublier.
              </p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${T.text};"><strong style="color:${T.text};">Moto :</strong> ${motoLabel}</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${T.text};"><strong style="color:${T.text};">Entretien :</strong> ${typeLabel}</p>
              ${detailLines.join("")}
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${T.textMuted};">Tu peux ajuster ou marquer l’entretien comme effectué depuis ton carnet.</p>
              ${emailButton(carnetUrl, "Ouvrir mon carnet")}
              <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${T.textDim};">Si le bouton ne fonctionne pas : <span style="color:${T.textMuted};word-break:break-all;">${carnetUrl}</span></p>`;

  const html = emailDocument(inner);

  const textLines = [
    "Rappel : entretien planifié — MotoMind",
    "",
    "Tu as planifié cet entretien dans l’app. L’échéance approche.",
    "",
    `Moto : ${motoLabel}`,
    `Entretien : ${typeLabel}`,
    ...(dateStr ? [`Date prévue : ${dateStr}`] : []),
    ...(kmStr ? [`Kilométrage cible : ${kmStr}`] : []),
    "",
    `Ouvre ton carnet : ${carnetUrl}`,
    "",
    EMAIL_FOOTER_TEXT,
  ];

  try {
    const { error } = await resend.emails.send({
      from: resendFromAddress(),
      to: userEmail,
      subject: "Rappel : ton entretien planifié approche — MotoMind",
      html,
      text: textLines.join("\n"),
      ...(resendReplyTo() ? { replyTo: resendReplyTo() } : {}),
    });

    if (error) {
      console.error("Resend error (planned entretien):", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.error("sendPlannedEntretienReminderEmail error:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erreur d'envoi",
    };
  }
}

/**
 * Premium : l’utilisateur n’a pas marqué l’entretien planifié — notification le lendemain de la date prévue.
 */
export async function sendPlannedEntretienOverdueEmail(
  userEmail: string,
  planned: PlannedEntretienForEmail,
  motorcycle: MotorcycleForEmail
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("Email disabled: RESEND_API_KEY missing");
    return { success: false, error: "RESEND_API_KEY non configuré" };
  }

  const typeLabel = formatEntretienType(planned.type);
  const motoLabel = `${motorcycle.marque} ${motorcycle.modele}`;
  const dateStr = planned.nextDueDate
    ? new Date(planned.nextDueDate).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  const kmStr =
    planned.nextDueMileage != null
      ? `${planned.nextDueMileage.toLocaleString("fr-FR")} km`
      : null;

  const detailLines: string[] = [];
  if (dateStr) {
    detailLines.push(
      `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${T.text};"><strong style="color:${T.text};">Date prévue :</strong> ${dateStr}</p>`
    );
  }
  if (kmStr) {
    detailLines.push(
      `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${T.text};"><strong style="color:${T.text};">Kilométrage cible :</strong> ${kmStr}</p>`
    );
  }

  const appUrl = getAppBaseUrl();
  const carnetUrl = `${appUrl}/dashboard/entretiens`;

  const inner = `
              <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:${T.text};">Entretien planifié <span style="color:${T.accentCta};">non effectué</span> ⏱️</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${T.textMuted};">
                Tu avais planifié cet entretien dans MotoMind. La date prévue est passée : pense à le réaliser ou à mettre à jour ton carnet si c’est déjà fait.
              </p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${T.text};"><strong style="color:${T.text};">Moto :</strong> ${motoLabel}</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${T.text};"><strong style="color:${T.text};">Entretien :</strong> ${typeLabel}</p>
              ${detailLines.join("")}
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${T.textMuted};">Marque l’entretien comme effectué ou replanifie depuis ton carnet.</p>
              ${emailButton(carnetUrl, "Ouvrir mon carnet")}
              <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${T.textDim};">Si le bouton ne fonctionne pas : <span style="color:${T.textMuted};word-break:break-all;">${carnetUrl}</span></p>`;

  const html = emailDocument(inner);

  const textLines = [
    "Retard : entretien planifié — MotoMind",
    "",
    "La date que tu avais prévue pour cet entretien est passée.",
    "",
    `Moto : ${motoLabel}`,
    `Entretien : ${typeLabel}`,
    ...(dateStr ? [`Date prévue : ${dateStr}`] : []),
    ...(kmStr ? [`Kilométrage cible : ${kmStr}`] : []),
    "",
    `Ouvre ton carnet : ${carnetUrl}`,
    "",
    EMAIL_FOOTER_TEXT,
  ];

  try {
    const { error } = await resend.emails.send({
      from: resendFromAddress(),
      to: userEmail,
      subject: "Retard : ton entretien planifié — MotoMind",
      html,
      text: textLines.join("\n"),
      ...(resendReplyTo() ? { replyTo: resendReplyTo() } : {}),
    });

    if (error) {
      console.error("Resend error (planned entretien retard):", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.error("sendPlannedEntretienOverdueEmail error:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erreur d'envoi",
    };
  }
}

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

  const inner = `
              <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:${T.text};">Bienvenue sur le carnet 🏍️</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${T.textMuted};">
                Merci de t&apos;être inscrit. Pour activer ton compte et commencer à suivre l&apos;entretien de ta moto, il nous suffit de confirmer que cette adresse email est bien la tienne.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:${T.textMuted};">
                Un clic, et tu pourras enregistrer tes motos, tes entretiens et recevoir tes rappels — tout au même endroit.
              </p>
              ${emailButton(verificationLink, "Confirmer mon adresse email")}
              <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${T.textDim};">
                Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br />
                <span style="color:${T.textMuted};word-break:break-all;">${verificationLink}</span>
              </p>
              <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${T.textFaint};">
                Tu n&apos;as pas créé de compte MotoMind ? Tu peux ignorer ce message en toute tranquillité.
              </p>`;

  const html = emailDocument(inner);

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

  const baseUrl = getAppBaseUrl();
  const loginUrl = `${baseUrl}/login`;
  const greeting = userName ? `Salut ${userName} 👋` : "Salut rider 👋";

  const inner = `
              <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:${T.text};">${greeting}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${T.textMuted};">
                Bienvenue dans la communauté ! Tu viens de faire le premier pas pour garder ta bécane au top.
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${T.textMuted};">
                Avec MotoMind, tu peux suivre tous tes entretiens, recevoir des rappels et ne plus jamais oublier une vidange ou une révision. Moins de stress, plus de contrôle, plus de kilomètres en sérénité.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${T.textMuted};">
                Ton compte est activé — viens compléter ton carnet d&apos;entretien !
              </p>
              ${emailButton(loginUrl, "Accéder à mon carnet")}`;

  const html = emailDocument(inner);

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
  const appUrl = getAppBaseUrl();
  const carnetUrl = `${appUrl}/dashboard/entretiens`;

  const inner = `
              <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:${T.text};">Rappel <span style="color:${T.accentCta};">entretien</span> 🏍️</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${T.textMuted};">
                Un entretien approche pour ta moto. Pense à planifier une intervention chez ton garagiste.
              </p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${T.text};"><strong style="color:${T.text};">Moto :</strong> ${motoLabel}</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${T.text};"><strong style="color:${T.text};">Entretien :</strong> ${typeLabel}</p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${T.text};"><strong style="color:${T.text};">Kilométrage prévu :</strong> ${maintenance.nextDueMileage.toLocaleString("fr-FR")} km</p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${T.textMuted};">Consulte le détail et mets à jour ton carnet depuis l’app.</p>
              ${emailButton(carnetUrl, "Ouvrir mon carnet")}
              <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${T.textDim};">Si le bouton ne fonctionne pas : <span style="color:${T.textMuted};word-break:break-all;">${carnetUrl}</span></p>`;

  const html = emailDocument(inner);

  const textPlain = [
    "Rappel entretien moto — MotoMind",
    "",
    `Moto : ${motoLabel}`,
    `Entretien : ${typeLabel}`,
    `Kilométrage prévu : ${maintenance.nextDueMileage.toLocaleString("fr-FR")} km`,
    "",
    `Ouvre ton carnet : ${carnetUrl}`,
    "",
    EMAIL_FOOTER_TEXT,
  ].join("\n");

  try {
    const { error } = await resend.emails.send({
      from: resendFromAddress(),
      to: userEmail,
      subject: "Rappel entretien moto — MotoMind",
      html,
      text: textPlain,
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
  const inner = `
        <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:${T.text};">Nouvelle connexion détectée</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${T.textMuted};">Une nouvelle connexion a été détectée sur ton compte.</p>
        <p style="margin:0 0 6px;font-size:14px;color:${T.text};"><strong>Date et heure :</strong> ${ctx.date}</p>
        <p style="margin:0 0 6px;font-size:14px;color:${T.text};"><strong>Appareil :</strong> ${deviceInfo}</p>
        <p style="margin:0 0 18px;font-size:14px;color:${T.text};"><strong>IP :</strong> ${ipInfo}</p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${T.textMuted};">Si c'est toi, tu peux ignorer cet email.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:${T.textMuted};">Sinon, modifie ton mot de passe rapidement.</p>`;

  const html = emailDocument(inner);
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

  const ipBlock = ctx.ipMasked
    ? `<p style="margin:0 0 18px;font-size:14px;color:${T.text};"><strong>Adresse IP :</strong> ${ctx.ipMasked}</p>`
    : "";

  const inner = `
        <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:${T.text};">Tentatives de connexion détectées</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${T.textMuted};">Plusieurs tentatives de connexion infructueuses ont été détectées sur ton compte.</p>
        <p style="margin:0 0 6px;font-size:14px;color:${T.text};"><strong>Date :</strong> ${ctx.date}</p>
        ${ipBlock}
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${T.textMuted};">Si c'est toi, tu peux ignorer cet email.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:${T.textMuted};">Si ce n'est pas toi, pense à modifier ton mot de passe.</p>`;

  const html = emailDocument(inner);
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

  const inner = `
        <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:${T.text};">Demandes de reset répétées</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${T.textMuted};">Plusieurs demandes de réinitialisation ont été faites pour ton compte.</p>
        <p style="margin:0 0 18px;font-size:14px;color:${T.text};"><strong>Date :</strong> ${ctx.date}</p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${T.textMuted};">Si c'est toi, vérifie ta boîte de réception et tes spams.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:${T.textMuted};">Si ce n'est pas toi, ignore ce message : ton mot de passe reste inchangé sans action.</p>`;

  const html = emailDocument(inner);
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

  const inner = `
        <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:${T.text};">Mot de passe modifié</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${T.textMuted};">Ton mot de passe MotoMind a été modifié avec succès.</p>
        <p style="margin:0 0 18px;font-size:14px;color:${T.text};"><strong>Date :</strong> ${ctx.date}</p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${T.textMuted};">Si c'est toi, tout est en ordre.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:${T.textMuted};">Si ce n'est pas toi, contacte-nous immédiatement.</p>`;

  const html = emailDocument(inner);
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

  const inner = `
              <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:${T.text};">Réinitialisation du mot de passe</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${T.textMuted};">
                Tu as demandé à réinitialiser le mot de passe de ton compte MotoMind.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:${T.textMuted};">
                Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe.
              </p>
              ${emailButton(resetLink, "Réinitialiser mon mot de passe")}
              <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${T.textDim};">
                Ce lien expire dans 1 heure.
              </p>
              <p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:${T.textDim};">
                Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br />
                <span style="color:${T.textMuted};word-break:break-all;">${resetLink}</span>
              </p>
              <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${T.textFaint};">
                Si tu n&apos;es pas à l&apos;origine de cette demande, ignore simplement ce message.
              </p>`;

  const html = emailDocument(inner);

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

  const safeMessage = data.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const inner = `
              <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:${T.text};">Nouveau signalement</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${T.text};"><strong>Type :</strong> ${data.type}</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${T.text};"><strong>Page :</strong> ${data.page}</p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${T.text};"><strong>Utilisateur :</strong> ${data.userEmail} <span style="color:${T.textMuted};">(ID: ${data.userId})</span></p>
              <p style="margin:0 0 8px;font-size:14px;color:${T.textMuted};">Message :</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${T.bg}" style="background-color:${T.bg};">
                <tr>
                  <td bgcolor="${T.bg}" style="padding:14px 16px;border-radius:12px;border:1px solid ${T.border};background-color:${T.bg};font-size:14px;line-height:1.55;color:${T.text};white-space:pre-wrap;">${safeMessage}</td>
                </tr>
              </table>`;

  const html = emailDocument(inner);

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
