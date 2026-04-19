"use client";

import { mutate as globalMutate } from "swr";
import { SWR_KEYS } from "@/lib/dashboard-swr";

/**
 * Revalide les jeux de données liés aux opérations CRUD motos/entretiens.
 * Pour le tableau de bord : fetch sans cache puis injection dans SWR (évite un GET encore servi depuis le cache HTTP).
 */
export async function revalidateDashboardCrudData() {
  try {
    const res = await fetch(SWR_KEYS.home, { cache: "no-store" });
    if (res.ok) {
      const homeData = await res.json();
      await globalMutate(SWR_KEYS.home, homeData, { revalidate: false });
    } else {
      await globalMutate(SWR_KEYS.home, undefined, { revalidate: true });
    }
  } catch {
    await globalMutate(SWR_KEYS.home, undefined, { revalidate: true });
  }

  await Promise.all([
    globalMutate(SWR_KEYS.motosPlan, undefined, { revalidate: true }),
    globalMutate(SWR_KEYS.entretiensPlan, undefined, { revalidate: true }),
  ]);
}
