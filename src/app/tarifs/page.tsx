import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const comparisonRows: { feature: string; free: boolean; premium: boolean }[] = [
  { feature: "1 moto", free: true, premium: true },
  { feature: "Multi-motos", free: false, premium: true },
  { feature: "Suivi entretien", free: true, premium: true },
  { feature: "Rappels", free: true, premium: true },
  { feature: "Factures", free: false, premium: true },
  { feature: "Export PDF", free: false, premium: true },
  { feature: "Partage carnet", free: false, premium: true },
];

function CellIcon({ ok }: { ok: boolean }) {
  return (
    <span className="text-base" aria-hidden>
      {ok ? "✔️" : "❌"}
    </span>
  );
}

export default async function TarifsPage() {
  const session = await getServerSession(authOptions);
  const freeCtaHref = session ? "/dashboard" : "/signup";
  const premiumCtaHref = session ? "/premium" : "/signup";

  return (
    <div className="min-h-screen bg-dark-950">
      <header className="sticky top-0 z-50 border-b border-dark-700 bg-dark-950/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:pl-12 lg:pr-12">
          <Link href="/" className="text-xl font-bold text-white lg:text-2xl">
            Moto<span className="text-moto-orange">Mind</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            <Link
              href="/tarifs"
              aria-current="page"
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-white sm:text-base"
            >
              Tarifs
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-dark-400 transition-colors hover:bg-dark-800 hover:text-white sm:text-base"
            >
              Se connecter
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-moto-orange px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-moto-orange-dark sm:text-base"
            >
              Créer un compte
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <h1 className="mb-6 text-center text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            Choisis comment tu veux suivre et prouver l&apos;entretien de ta moto
          </h1>
          <p className="mx-auto max-w-2xl text-center text-lg text-dark-400 lg:text-xl">
            MotoMind t&apos;aide à entretenir ta moto, à ne rien oublier et à prouver que tout a été fait.
          </p>
        </section>

        {/* Pricing cards */}
        <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 lg:items-stretch">
            {/* Free */}
            <div className="flex flex-col rounded-xl border border-dark-700 bg-dark-900/30 p-6 sm:p-8 transition-colors hover:border-dark-600">
              <h2 className="text-lg font-semibold text-white sm:text-xl">Version gratuite</h2>
              <p className="mt-4 text-4xl font-bold tracking-tight text-white">0€</p>
              <p className="mt-3 text-sm text-dark-400 sm:text-base">
                Tout le nécessaire pour suivre l&apos;entretien de ta moto
              </p>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-dark-300 sm:text-base">
                <li className="flex gap-2">
                  <span className="text-emerald-400/90">✓</span>
                  <span>1 moto</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400/90">✓</span>
                  <span>Suivi des entretiens</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400/90">✓</span>
                  <span>Rappels d&apos;entretien</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400/90">✓</span>
                  <span>Historique simple</span>
                </li>
              </ul>
              <div className="mt-8">
                <Link
                  href={freeCtaHref}
                  className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-dark-600 px-6 py-3.5 text-center text-base font-medium text-gray-200 transition-colors hover:border-dark-500 hover:bg-dark-800/60 hover:text-white"
                >
                  Commencer gratuitement
                </Link>
              </div>
            </div>

            {/* Premium */}
            <div className="relative flex flex-col rounded-xl border border-moto-orange/35 bg-gradient-to-b from-dark-900/80 to-dark-900/40 p-6 shadow-lg shadow-moto-orange/5 sm:p-8 transition-transform duration-200 hover:border-moto-orange/50 lg:hover:scale-[1.01]">
              <span className="absolute right-4 top-4 inline-flex items-center rounded-full bg-moto-orange/15 px-2.5 py-1 text-xs font-semibold text-moto-orange">
                Le plus choisi
              </span>
              <h2 className="pr-24 text-lg font-semibold text-white sm:text-xl">Version Premium</h2>
              <p className="mt-4 text-4xl font-bold tracking-tight text-white">3,99€</p>
              <p className="text-sm text-dark-400">par mois</p>
              <p className="mt-3 text-sm font-medium text-dark-300 sm:text-base">
                29,99€ / an <span className="text-dark-500 font-normal">(2 mois offerts)</span>
              </p>
              <p className="mt-4 text-sm text-dark-300 sm:text-base">
                Transforme ton suivi en preuve réelle
              </p>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-white sm:text-base">
                <li className="flex gap-2">
                  <span className="text-moto-orange">✓</span>
                  <span>Plusieurs motos</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-moto-orange">✓</span>
                  <span>Rappels intelligents</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-moto-orange">✓</span>
                  <span>Ajout de factures (image / PDF)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-moto-orange">✓</span>
                  <span>Export PDF du carnet</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-moto-orange">✓</span>
                  <span>Partage du carnet d&apos;entretien</span>
                </li>
              </ul>
              <div className="mt-8">
                <Link
                  href={premiumCtaHref}
                  className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-moto-orange px-6 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-moto-orange-dark"
                >
                  Passer en Premium
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <h2 className="mb-8 text-center text-xl font-bold text-white lg:text-2xl">
            Comparer les offres
          </h2>
          <div className="overflow-x-auto rounded-xl border border-dark-700 bg-dark-900/30">
            <table className="w-full min-w-[320px] border-collapse text-left text-sm sm:text-base">
              <thead>
                <tr className="border-b border-dark-700">
                  <th scope="col" className="px-4 py-4 font-semibold text-white sm:px-6">
                    Fonctionnalité
                  </th>
                  <th scope="col" className="px-4 py-4 text-center font-semibold text-dark-300 sm:px-6">
                    Gratuit
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-4 text-center font-semibold text-moto-orange sm:px-6"
                  >
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-dark-800/80 last:border-b-0 transition-colors hover:bg-dark-900/40"
                  >
                    <th scope="row" className="px-4 py-3.5 font-normal text-gray-200 sm:px-6 sm:py-4">
                      {row.feature}
                    </th>
                    <td className="px-4 py-3.5 text-center sm:px-6 sm:py-4">
                      <CellIcon ok={row.free} />
                    </td>
                    <td className="px-4 py-3.5 text-center sm:px-6 sm:py-4">
                      <CellIcon ok={row.premium} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Trust */}
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="rounded-xl border border-dark-700 bg-dark-900/40 p-8 sm:p-10">
            <p className="text-center text-base leading-relaxed text-dark-300 sm:text-lg">
              Un carnet avec factures inspire confiance et peut faire la différence lors de la revente.
            </p>
            <ul className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-10 sm:gap-y-3">
              {["Sans engagement", "Résiliation à tout moment", "Données sécurisées"].map((item) => (
                <li
                  key={item}
                  className="flex items-center justify-center gap-2 text-sm text-dark-400 sm:justify-start"
                >
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-moto-orange/80" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <div className="rounded-xl border border-dark-700 bg-dark-900/50 p-10 text-center sm:p-14">
            <p className="text-xl font-semibold text-white sm:text-2xl">
              Passe en Premium et rends ton carnet officiel
            </p>
            <Link
              href={premiumCtaHref}
              className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-moto-orange px-10 py-4 text-base font-semibold text-white transition-colors hover:bg-moto-orange-dark"
            >
              Passer en Premium
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-dark-700 py-8 lg:py-12">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-bold text-white">
            Moto<span className="text-moto-orange">Mind</span>
          </Link>
          <p className="mt-2 text-sm text-dark-500">Carnet d&apos;entretien intelligent pour motards</p>
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
            <Link href="/tarifs" className="text-sm text-white">
              Tarifs
            </Link>
            <Link href="/login" className="text-sm text-dark-500 transition-colors hover:text-white">
              Connexion
            </Link>
            <Link href="/signup" className="text-sm text-dark-500 transition-colors hover:text-white">
              Créer un compte
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
