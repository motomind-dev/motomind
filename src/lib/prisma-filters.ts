/**
 * Filtres centralisés pour exclure les données soft-deleted des requêtes standard.
 */

export const activeOnly = {
  deletedAt: null,
};

export const whereMotoActive = (userId: string) => ({
  userId,
  deletedAt: null,
});

export const whereEntretienActive = (userId: string) => ({
  moto: { userId, deletedAt: null },
  deletedAt: null,
});
