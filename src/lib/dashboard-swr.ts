/** Clés SWR partagées (navigation dashboard + préchargement au survol). */
export const SWR_KEYS = {
  home: "/api/dashboard/home",
  motosPlan: "/api/motos?withAccount=1",
  entretiensPlan: "/api/entretiens?withAccount=1",
  trash: "/api/trash",
} as const;
