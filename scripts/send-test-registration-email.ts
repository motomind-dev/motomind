/**
 * Envoie un email de type « inscription » (vérification) pour prévisualiser le template.
 * Le lien est factice (token de test) — pour un vrai flux, utilise /signup.
 *
 * Usage : npx dotenv-cli -e .env -- npx tsx scripts/send-test-registration-email.ts <email>
 */
import { sendVerificationEmail } from "../src/lib/email";

const email =
  process.argv[2]?.trim() || process.env.RESEND_TEST_TO?.trim() || "";
if (!email.includes("@")) {
  console.error(
    "Indique une adresse : argument ou variable RESEND_TEST_TO dans .env\n" +
      "Ex. : npx dotenv-cli -e .env -- npx tsx scripts/send-test-registration-email.ts ton@email.com"
  );
  process.exit(1);
}

const base = (process.env.NEXTAUTH_URL || "http://localhost:3002").replace(
  /\/$/,
  ""
);
const verificationLink = `${base}/verify-email?token=preview-test-token`;

async function main() {
  const result = await sendVerificationEmail(email, verificationLink);
  if (result.success) {
    console.log("Email envoyé à", email);
  } else {
    console.error("Échec :", result.error);
    process.exit(1);
  }
}

main();
