import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="border-b border-dark-700 sticky top-0 z-50 bg-dark-950/95 backdrop-blur">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:pl-12 lg:pr-12 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl lg:text-2xl font-bold text-white">
            Moto<span className="text-moto-orange">Mind</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            <Link
              href="/tarifs"
              className="px-4 py-2.5 text-dark-400 hover:text-white text-sm sm:text-base font-medium transition-colors rounded-lg hover:bg-dark-800"
            >
              Tarifs
            </Link>
            <Link
              href="/login"
              className="px-4 py-2.5 text-dark-400 hover:text-white text-sm sm:text-base font-medium transition-colors rounded-lg hover:bg-dark-800"
            >
              Se connecter
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 bg-moto-orange hover:bg-moto-orange-dark text-white text-sm sm:text-base font-medium transition-colors rounded-lg"
            >
              Créer un compte
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center leading-tight mb-6">
            Gère l&apos;entretien de ta moto sans jamais rien oublier
          </h1>
          <p className="text-dark-400 text-lg lg:text-xl text-center mb-10 max-w-2xl mx-auto">
            Ton carnet d&apos;entretien intelligent pour anticiper, planifier et suivre
            tous tes entretiens simplement
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-center sm:gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto min-h-[48px] flex items-center justify-center px-8 py-4 bg-moto-orange hover:bg-moto-orange-dark text-white font-semibold rounded-xl transition-colors text-base"
            >
              Commencer gratuitement
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto min-h-[48px] flex items-center justify-center px-8 py-4 border border-dark-600 hover:border-moto-orange text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-base"
            >
              Se connecter
            </Link>
          </div>
        </section>

        {/* Proof Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="rounded-xl border border-dark-700 bg-dark-900/50 p-8 sm:p-10">
            <h2 className="text-xl lg:text-2xl font-bold text-white text-center mb-4">
              Prouve l&apos;entretien de ta moto, noir sur blanc.
            </h2>
            <p className="text-dark-400 text-center mb-10 max-w-2xl mx-auto">
              Ajoute tes factures, garde une trace fiable de chaque intervention
              et montre un historique clair, vérifiable et crédible.
            </p>

            <div className="grid gap-6 md:grid-cols-2 items-start">
              {/* Mock */}
              <div className="rounded-xl border border-dark-700 bg-dark-900/30 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white font-medium">
                      Vidange — 24 500 km
                    </p>
                    <p className="text-dark-500 text-sm mt-1">Intervention : 12/02/2026</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-blue-400 bg-blue-500/10">
                    Terminé
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded border border-dark-600 bg-dark-800/60 overflow-hidden flex items-center justify-center">
                    <span className="text-2xl">🧾</span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Facture</p>
                    <p className="text-dark-500 text-xs mt-0.5">PDF (non intégrée)</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-dark-700 bg-dark-900/20 p-3 text-center">
                    <p className="text-dark-500 text-xs">Export PDF</p>
                    <p className="text-white text-sm font-medium mt-1">Inclut</p>
                  </div>
                  <div className="rounded-lg border border-dark-700 bg-dark-900/20 p-3 text-center">
                    <p className="text-dark-500 text-xs">Partage</p>
                    <p className="text-white text-sm font-medium mt-1">Avec preuves</p>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-3">
                <div className="rounded-xl border border-dark-700 bg-dark-900/30 p-4">
                  <p className="text-white font-medium">Rassure à la revente</p>
                  <p className="text-dark-500 text-sm mt-1">
                    Un historique avec factures inspire confiance immédiatement.
                  </p>
                </div>
                <div className="rounded-xl border border-dark-700 bg-dark-900/30 p-4">
                  <p className="text-white font-medium">Ne perds plus tes preuves</p>
                  <p className="text-dark-500 text-sm mt-1">
                    Toutes tes factures centralisées au même endroit.
                  </p>
                </div>
                <div className="rounded-xl border border-dark-700 bg-dark-900/30 p-4">
                  <p className="text-white font-medium">Partage en 1 clic</p>
                  <p className="text-dark-500 text-sm mt-1">
                    Envoie ton carnet complet avec preuves facilement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problems */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <h2 className="text-xl lg:text-2xl font-semibold text-white text-center mb-8 lg:mb-12">
            Tu connais ces galères ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            {[
              { icon: "⏰", text: "Tu oublies des entretiens", desc: "Vidange, chaîne, révision..." },
              { icon: "📋", text: "Aucun suivi clair", desc: "Infos dans ta tête ou sur des post-it" },
              { icon: "🗂️", text: "Informations dispersées", desc: "Carnet papier, notes, souvenirs" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex gap-4 p-4 lg:p-5 rounded-xl border border-dark-700 bg-dark-900/50"
              >
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-white font-medium">{item.text}</p>
                  <p className="text-dark-500 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Solution */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <h2 className="text-xl lg:text-2xl font-semibold text-white text-center mb-8 lg:mb-12">
            MotoMind te simplifie la vie
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            {[
              { icon: "✓", color: "text-emerald-400", text: "Planification simple", desc: "Ajoute ta moto, enregistre les entretiens en quelques clics" },
              { icon: "✓", color: "text-amber-400", text: "Rappels intelligents", desc: "Tu reçois une alerte avant chaque échéance" },
              { icon: "✓", color: "text-red-400", text: "Historique clair", desc: "Tout est centralisé, accessible en un coup d'œil" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex gap-4 p-4 lg:p-5 rounded-xl border border-dark-700 bg-dark-900/50"
              >
                <span className={`text-xl lg:text-2xl font-bold flex-shrink-0 ${item.color}`}>{item.icon}</span>
                <div>
                  <p className="text-white font-medium">{item.text}</p>
                  <p className="text-dark-500 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Positioning */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="rounded-xl border border-dark-700 bg-dark-900/50 p-8 lg:p-12 text-center">
            <p className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white mb-2">
              Plus qu&apos;un simple carnet.
            </p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-semibold text-moto-orange">
              Un assistant intelligent pour ta moto.
            </p>
          </div>
        </section>

        {/* Premium Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <h2 className="text-xl lg:text-2xl lg:text-3xl font-bold text-white text-center mb-4">
            Passe en Premium et rends ton carnet officiel
          </h2>
          <p className="text-dark-400 text-center mb-10 max-w-xl mx-auto">
            Avec MotoMind Premium, ton suivi devient une vraie preuve d&apos;entretien grâce à l&apos;ajout de
            factures, à l&apos;export PDF et au partage complet de ton historique.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[
              { icon: "🏍️", text: "Plusieurs motos" },
              { icon: "🔔", text: "Rappels intelligents" },
              { icon: "🧾", text: "Factures (image/PDF)" },
              { icon: "📄", text: "Export PDF (historique complet)" },
              { icon: "🔗", text: "Partage du carnet" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dark-700 bg-dark-900/50 text-center"
              >
                <span className="text-2xl">{item.icon}</span>
                <p className="text-white font-medium text-sm leading-5">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {[
              { text: "Un historique vérifiable", sub: "Factures + export PDF pour prouver chaque intervention" },
              { text: "Ne perds plus tes preuves", sub: "Toutes tes factures centralisées au même endroit" },
              { text: "Partage en 1 clic", sub: "Un carnet prêt à envoyer, complet et crédible" },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl border border-dark-700 bg-dark-900/30">
                <p className="text-white font-medium mb-1">{item.text}</p>
                <p className="text-dark-500 text-sm">{item.sub}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link
              href="/signup"
              className="inline-flex min-h-[48px] items-center justify-center px-10 py-4 bg-moto-orange hover:bg-moto-orange-dark text-white font-semibold rounded-xl transition-colors text-base"
            >
              Passer en Premium
            </Link>
          </div>
        </section>

        {/* Preview placeholders */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <h2 className="text-xl lg:text-2xl font-semibold text-white text-center mb-8 lg:mb-12">
            Aperçu
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            {[
              { label: "Tableau de bord", placeholder: "Dashboard" },
              { label: "Prochains entretiens", placeholder: "Rappels" },
              { label: "Historique", placeholder: "Historique" },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-dark-600 bg-dark-800/80 aspect-video flex items-center justify-center min-h-[160px]"
              >
                <span className="text-dark-300 text-base font-medium">{item.placeholder}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <h2 className="text-xl lg:text-2xl font-semibold text-white text-center mb-8 lg:mb-12">
            Comment ça marche
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            {[
              { step: "1", text: "Ajoute ta moto", desc: "Marque, modèle, kilométrage" },
              { step: "2", text: "Planifie ou enregistre un entretien", desc: "Vidange, chaîne, révision..." },
              { step: "3", text: "Suis et anticipe automatiquement", desc: "Rappels avant chaque échéance" },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-4 items-start p-4 lg:p-5 rounded-xl border border-dark-700 bg-dark-900/50"
              >
                <span className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-moto-orange/20 text-moto-orange font-bold flex items-center justify-center flex-shrink-0 text-lg">
                  {item.step}
                </span>
                <div>
                  <p className="text-white font-medium">{item.text}</p>
                  <p className="text-dark-500 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final message */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="rounded-xl border border-dark-700 bg-dark-900/50 p-10 sm:p-14 lg:p-20 text-center">
            <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 text-white leading-relaxed">
              <p className="text-lg sm:text-xl lg:text-2xl font-medium">
                Une moto, ce n&apos;est pas qu&apos;un véhicule.
              </p>
              <p className="text-base sm:text-lg lg:text-xl text-dark-400">
                C&apos;est des trajets, des souvenirs, des sensations.
              </p>
              <div className="space-y-3 sm:space-y-4 py-2">
                <p className="text-lg sm:text-xl lg:text-2xl font-semibold">
                  Moto<span className="text-moto-orange">Mind</span> est là pour que tu n&apos;oublies rien.
                </p>
                <p className="text-base sm:text-lg text-dark-400">
                  Pour que ta moto reste fiable.
                  <br />
                  Et pour que tu roules l&apos;esprit tranquille.
                </p>
              </div>
              <p className="text-base sm:text-lg lg:text-xl font-medium italic text-gray-300">
                Aujourd&apos;hui, demain, et sur chaque kilomètre.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-700 py-8 lg:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link href="/" className="text-lg font-bold text-white">
            Moto<span className="text-moto-orange">Mind</span>
          </Link>
          <p className="text-dark-500 text-sm mt-2">
            Carnet d&apos;entretien intelligent pour motards
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
            <Link href="/tarifs" className="text-dark-500 hover:text-white text-sm">
              Tarifs
            </Link>
            <Link href="/login" className="text-dark-500 hover:text-white text-sm">
              Connexion
            </Link>
            <Link href="/signup" className="text-dark-500 hover:text-white text-sm">
              Créer un compte
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
