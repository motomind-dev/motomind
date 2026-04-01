"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function VerifyEmailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Lien de vérification invalide");
      return;
    }

    const verify = async () => {
      try {
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        const res = await fetch(`${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
          setStatus("success");
          setMessage("Ton email a été vérifié. Tu peux te connecter.");
          setTimeout(() => router.push("/login?verified=1"), 2000);
        } else {
          setStatus("error");
          setMessage(data.error || "Lien invalide ou expiré");
        }
      } catch {
        setStatus("error");
        setMessage("Impossible de vérifier l'email. Réessaye plus tard.");
      }
    };

    verify();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-white">
            Moto<span className="text-moto-orange">Mind</span>
          </Link>
          <p className="text-dark-500 mt-2">Vérification de ton email</p>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 shadow-xl text-center">
          {status === "loading" && (
            <p className="text-dark-400">Vérification en cours...</p>
          )}
          {status === "success" && (
            <div>
              <p className="text-emerald-400 font-medium mb-4">{message}</p>
              <p className="text-dark-500 text-sm">Redirection vers la connexion...</p>
              <Link
                href="/login"
                className="mt-4 inline-block text-moto-orange hover:underline"
              >
                Se connecter
              </Link>
            </div>
          )}
          {status === "error" && (
            <div>
              <p className="text-red-400 font-medium mb-4">{message}</p>
              <Link
                href="/login"
                className="inline-block px-4 py-2 bg-moto-orange hover:bg-moto-orange-dark text-white rounded-lg transition-colors"
              >
                Aller à la connexion
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark-950" />}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}
