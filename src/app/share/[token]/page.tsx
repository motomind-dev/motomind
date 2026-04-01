import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatEntretienType } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

async function getShareData(token: string) {
  if (!token || token.length < 32) return null;
  const moto = await prisma.moto.findFirst({
    where: { shareToken: token, deletedAt: null },
    select: {
      id: true,
      marque: true,
      modele: true,
      annee: true,
      kilometrage: true,
    },
  });
  if (!moto) return null;
  const entretiens = await prisma.entretien.findMany({
    where: { motoId: moto.id, deletedAt: null, statut: "termine" },
    orderBy: [{ date: "desc" }, { kilometrage: "desc" }],
    select: {
      id: true,
      type: true,
      date: true,
      kilometrage: true,
      note: true,
      garage: true,
      invoiceUrl: true,
      invoiceType: true,
    },
  });
  return { moto, entretiens };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getShareData(token);
  if (!data) notFound();

  const { moto, entretiens } = data;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-orange-500 transition-colors"
          >
            ← MotoMind
          </Link>
        </header>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h1 className="text-2xl font-bold text-white">
            Carnet d&apos;entretien
          </h1>
          <div className="mt-4 space-y-1">
            <p className="text-lg font-medium text-white">
              {moto.marque} {moto.modele}
            </p>
            <p className="text-zinc-500 text-sm">{moto.annee}</p>
            <p className="text-moto-orange font-medium">
              {moto.kilometrage?.toLocaleString("fr-FR")} km
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Historique des entretiens
          </h2>
          {entretiens.length === 0 ? (
            <p className="text-zinc-500">Aucun entretien enregistré.</p>
          ) : (
            <div className="space-y-3">
              {entretiens.map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <p className="font-medium text-white">
                    {formatEntretienType(e.type)}
                  </p>
                  <p className="text-zinc-500 text-sm mt-1">
                    {new Date(e.date).toLocaleDateString("fr-FR")}
                  </p>
                  <p className="text-moto-orange text-sm">
                    {e.kilometrage.toLocaleString("fr-FR")} km
                  </p>
                  {e.garage && (
                    <p className="text-zinc-400 text-sm">Garage : {e.garage}</p>
                  )}
                  {e.note && (
                    <p className="text-zinc-400 text-sm mt-1">{e.note}</p>
                  )}
                  {e.invoiceUrl && (
                    <div className="mt-2">
                      {e.invoiceType === "image" ? (
                        <a
                          href={e.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-24 h-24 rounded border border-zinc-600 overflow-hidden"
                        >
                          <Image
                            src={e.invoiceUrl}
                            alt="Facture"
                            width={96}
                            height={96}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ) : (
                        <a
                          href={e.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-moto-orange hover:underline"
                        >
                          Voir la facture
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-zinc-600 text-sm">
          Document partagé via MotoMind
        </p>
      </div>
    </div>
  );
}
