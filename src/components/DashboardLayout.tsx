"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { preload } from "swr";
import { jsonFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/dashboard-swr";
import ReportProblemButton from "./ReportProblemButton";

function prefetchNavData(href: string) {
  try {
    if (href === "/dashboard") {
      preload(SWR_KEYS.home, jsonFetcher);
    } else if (href === "/motorcycles") {
      preload(SWR_KEYS.motosPlan, jsonFetcher);
    } else if (href === "/dashboard/entretiens" || href === "/history") {
      preload(SWR_KEYS.entretiensPlan, jsonFetcher);
    } else if (href === "/trash") {
      preload(SWR_KEYS.trash, jsonFetcher);
    }
  } catch {
    /* ignore */
  }
}

const navLinks = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/motorcycles", label: "Mes motos" },
  { href: "/dashboard/entretiens", label: "Entretiens" },
  { href: "/history", label: "Historique" },
  { href: "/trash", label: "Corbeille" },
  { href: "/profile", label: "Profil" },
];

function MenuIcon({ open }: { open: boolean }) {
  return (
    <div className="w-6 h-5 flex flex-col justify-between">
      <span
        className={`block h-0.5 w-full bg-current transition-transform ${
          open ? "translate-y-2 rotate-45" : ""
        }`}
      />
      <span className={`block h-0.5 w-full bg-current ${open ? "opacity-0" : ""}`} />
      <span
        className={`block h-0.5 w-full bg-current transition-transform ${
          open ? "-translate-y-2 -rotate-45" : ""
        }`}
      />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/";
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Sidebar - hidden on small screens, show from md */}
      <aside className="hidden md:flex w-64 h-full min-h-screen flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 p-6">
        <div className="space-y-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">
              Moto<span className="text-orange-500">Mind</span>
            </span>
          </Link>

          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch
                onMouseEnter={() => prefetchNavData(link.href)}
                onFocus={() => prefetchNavData(link.href)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-orange-500/20 text-orange-500"
                    : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto flex flex-col space-y-4 pt-6">
          <button
            onClick={handleLogout}
            className="px-4 py-3 text-left text-sm text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Déconnexion
          </button>
          <ReportProblemButton className="px-4 py-3 text-left text-sm text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" />
        </div>
      </aside>

      {/* Mobile: top bar + hamburger menu */}
      <div className="flex flex-1 flex-col md:hidden min-h-screen">
        <header className="border-b border-zinc-800 sticky top-0 z-50 bg-zinc-950/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 h-14">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">
                Moto<span className="text-orange-500">Mind</span>
              </span>
            </Link>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-white transition-colors -mr-2"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>

          {/* Overlay pour fermer le menu en cliquant à l'extérieur */}
          {menuOpen && (
            <div
              className="fixed inset-0 top-14 bg-black/40 z-40 md:hidden"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
          )}
          {/* Mobile menu drawer */}
          <div
            className={`absolute top-14 left-0 right-0 border-b border-zinc-800 bg-zinc-950 shadow-xl transition-all duration-200 overflow-hidden z-50 md:hidden ${
              menuOpen ? "max-h-[70vh] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
            }`}
          >
            <nav className="flex flex-col p-4 gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch
                  onMouseEnter={() => prefetchNavData(link.href)}
                  onFocus={() => prefetchNavData(link.href)}
                  onClick={() => setMenuOpen(false)}
                  className={`min-h-[44px] flex items-center px-4 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-orange-500/20 text-orange-500"
                      : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-zinc-800 mt-2 pt-2 space-y-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="min-h-[44px] w-full flex items-center px-4 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors text-left"
                >
                  Déconnexion
                </button>
                <ReportProblemButton
                  onOpen={() => setMenuOpen(false)}
                  className="min-h-[44px] w-full flex items-center px-4 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors text-left"
                />
              </div>
            </nav>
          </div>
        </header>
        <main className="flex-1 p-4">
          {children}
        </main>
      </div>

      {/* Desktop: main content */}
      <div className="hidden md:flex flex-1 flex-col min-w-0">
        <main className="flex-1 p-8 max-w-7xl w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
