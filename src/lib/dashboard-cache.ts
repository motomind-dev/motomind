"use client";

import { mutate as globalMutate } from "swr";
import { SWR_KEYS } from "@/lib/dashboard-swr";

/**
 * Revalide les jeux de données liés aux opérations CRUD motos/entretiens.
 * Appelée après création, modification, suppression et marquage "effectué".
 */
export async function revalidateDashboardCrudData() {
  await Promise.all([
    globalMutate(SWR_KEYS.home),
    globalMutate(SWR_KEYS.motosPlan),
    globalMutate(SWR_KEYS.entretiensPlan),
  ]);
}
