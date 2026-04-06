import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/get-session";

export default async function PremiumPage() {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <Link
          href="/motorcycles"
          className="text-sm text-zinc-500 hover:text-orange-500 mb-4 inline-block"
        >
          ← Retour
        </Link>
        <h1 className="text-2xl font-bold text-white">Passer en premium</h1>
        <p className="text-zinc-500 mt-1">Débloque toutes les fonctionnalités</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-400 mb-6">
          Avec le plan Premium, ajoute autant de motos que tu veux et profite de
          toutes les fonctionnalités sans limite.
        </p>
        <p className="text-moto-orange text-sm">
          Bientôt disponible. Reviens plus tard pour passer en premium.
        </p>
        <Link
          href="/motorcycles"
          className="mt-6 inline-block px-6 py-2 border border-zinc-600 hover:border-orange-500 text-zinc-300 hover:text-white font-medium rounded-lg transition-colors"
        >
          Retour aux motos
        </Link>
      </div>
    </div>
  );
}
