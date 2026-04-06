"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function loginErrorFeedback(code: string | null): {
  variant: "error" | "warn";
  text: string;
} | null {
  if (!code) return null;
  if (code === "EMAIL_NOT_VERIFIED") {
    return {
      variant: "warn",
      text: "Vérifie ton email avant de te connecter. Consulte ta boîte de réception et les courriers indésirables.",
    };
  }
  if (code === "CredentialsSignin") {
    return {
      variant: "error",
      text: "Email ou mot de passe incorrect.",
    };
  }
  if (code === "Configuration") {
    return {
      variant: "error",
      text: "Problème de configuration serveur (NEXTAUTH_SECRET ou base de données). Vérifie les variables sur Vercel.",
    };
  }
  return {
    variant: "error",
    text: "Une erreur est survenue. Réessaie.",
  };
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const resetSuccess = searchParams.get("reset") === "1";
  const registeredSuccess = searchParams.get("registered") === "1";
  const verifiedSuccess = searchParams.get("verified") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  /** Erreur renvoyée par signIn(..., { redirect: false }) — ex. EMAIL_NOT_VERIFIED */
  const [signInErrorCode, setSignInErrorCode] = useState<string | null>(null);

  const authErrorCode = error ?? signInErrorCode;
  const authFeedback = loginErrorFeedback(authErrorCode);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSignInErrorCode(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard`,
    });

    if (res?.error) {
      setSignInErrorCode(res.error);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-white">
            Moto<span className="text-moto-orange">Mind</span>
          </Link>
          <p className="text-dark-500 mt-2">Connexion à ton compte</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-dark-900 border border-dark-700 rounded-xl p-6 shadow-xl"
        >
          {resetSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm">
              Mot de passe mis à jour avec succès. Connecte-toi avec ton nouveau mot de passe.
            </div>
          )}
          {registeredSuccess && !resetSuccess && !verifiedSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm">
              Compte créé avec succès. Vérifie ton email puis connecte-toi.
            </div>
          )}
          {verifiedSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm">
              Email vérifié ! Tu peux te connecter.
            </div>
          )}
          {authFeedback && (
            <div
              className={
                authFeedback.variant === "warn"
                  ? "mb-4 p-3 rounded-lg bg-amber-500/15 text-amber-200 border border-amber-500/25 text-sm"
                  : "mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm"
              }
              role="alert"
            >
              {authFeedback.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-moto-orange focus:border-transparent"
                placeholder="email@exemple.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-moto-orange focus:border-transparent"
                placeholder="••••••••"
              />
              <p className="mt-2 text-right">
                <Link href="/reset-password-request" className="text-sm text-moto-orange hover:underline">
                  Mot de passe oublié ?
                </Link>
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 bg-moto-orange hover:bg-moto-orange-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <p className="mt-4 text-center text-dark-500 text-sm">
            Pas encore de compte ?{" "}
            <Link href="/signup" className="text-moto-orange hover:underline">
              Créer un compte
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark-950" />}>
      <LoginPageContent />
    </Suspense>
  );
}
