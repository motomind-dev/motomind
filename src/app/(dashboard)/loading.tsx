export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Chargement">
      <div className="h-8 w-48 rounded-lg bg-zinc-800" />
      <div className="h-4 w-72 max-w-full rounded bg-zinc-800/70" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-36 rounded-xl border border-zinc-800 bg-zinc-900/80" />
        <div className="h-36 rounded-xl border border-zinc-800 bg-zinc-900/80" />
      </div>
      <div className="h-64 rounded-xl border border-zinc-800 bg-zinc-900/60" />
    </div>
  );
}
