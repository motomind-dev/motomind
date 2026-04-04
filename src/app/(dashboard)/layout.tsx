"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * Layout client : évite getServerSession sur chaque navigation (coûteux en serverless).
 * La protection réelle reste le middleware NextAuth + JWT.
 */
export default function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen bg-zinc-950">
        <div className="hidden md:block w-64 shrink-0 border-r border-zinc-800 bg-zinc-950" />
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full animate-pulse space-y-6">
          <div className="h-8 w-48 bg-zinc-800 rounded-lg" />
          <div className="h-4 w-64 bg-zinc-800/70 rounded" />
          <div className="h-64 rounded-xl border border-zinc-800 bg-zinc-900/60" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
        Redirection…
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
