"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResetPasswordRequestPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/auth/reset-password-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Impossible de contacter le serveur. Vérifie ta connexion.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-white">
            Moto<span className="text-moto-orange">Mind</span>
          </Link>
          <p className="text-dark-500 mt-2">Mot de passe oublié</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-dark-900 border border-dark-700 rounded-xl p-6 shadow-xl"
        >
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm">
              Si cet email est associé à un compte, tu recevras un lien de réinitialisation.
              Vérifie ta boîte de réception.
            </div>
          )}

          {!success && (
            <>
              <p className="text-gray-300 text-sm mb-4">
                Saisis ton adresse e-mail pour recevoir un lien de réinitialisation.
              </p>
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
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-3 bg-moto-orange hover:bg-moto-orange-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Envoi en cours..." : "Envoyer le lien"}
              </button>
            </>
          )}

          <p className="mt-4 text-center text-dark-500 text-sm">
            <Link href="/login" className="text-moto-orange hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
