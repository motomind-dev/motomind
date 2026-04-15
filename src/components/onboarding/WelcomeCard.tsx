import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

type Props = {
  userName?: string | null;
};

const STEPS = [
  { label: "Ajoute ta première moto", href: "/motorcycles/add" },
  { label: "Enregistre ton premier entretien", href: "/dashboard/entretiens" },
  { label: "Consulte ton tableau de bord", href: "/dashboard" },
] as const;

export default function WelcomeCard({ userName }: Props) {
  const displayName = userName?.trim();
  const title = displayName
    ? `Bienvenue à bord, ${displayName} !`
    : "Bienvenue à bord !";

  return (
    <Card className="border-orange-500/30 bg-gradient-to-br from-zinc-900 via-zinc-900 to-orange-500/5">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-6">
            <span className="text-3xl" aria-hidden>
              🏍️
            </span>
            <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
          </div>

          <p className="mt-4 text-zinc-300">
            Ton carnet d&apos;entretien moto est prêt. Ici, tu peux suivre tes
            entretiens, anticiper les prochaines révisions et garder ta moto en
            parfaite condition pour la route.
          </p>

          <div className="mt-4">
            <p className="text-sm font-medium text-zinc-400">
              Pour bien commencer :
            </p>
            <ul className="mt-4 space-y-4">
              {STEPS.map((step) => (
                <li key={step.href} className="flex items-center gap-6 text-zinc-300">
                  <span
                    className="text-orange-500"
                    aria-hidden
                  >
                    ✔️
                  </span>
                  <Link
                    href={step.href}
                    className="hover:text-orange-400 hover:underline transition-colors"
                  >
                    {step.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-sm text-zinc-500">
            Une fois configuré, ton carnet t&apos;aidera à ne plus jamais oublier
            une révision.
          </p>
          <p className="mt-2 text-sm text-zinc-500 italic">
            Bonne route et profite de chaque kilomètre.
          </p>
        </div>

        <div className="flex flex-col gap-6 sm:shrink-0 sm:w-48">
          <Button href="/motorcycles/add" size="lg">
            Ajouter ma première moto
          </Button>
          <Button href="/dashboard/entretiens" variant="secondary" size="md">
            Planifier mon premier entretien
          </Button>
        </div>
      </div>
    </Card>
  );
}
