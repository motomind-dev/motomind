# Soft Delete — MotoMind

## Stratégie

- **Moto** : soft delete avec `deletedAt` et `purgeAt` (now + 30 jours). Tous les entretiens liés sont également soft-deleted.
- **Entretien** : soft delete indépendant. Si la moto parente est supprimée, l’entretien ne peut pas être restauré tant que la moto ne l’est pas.
- **Rappel** : pas de soft delete. Les rappels sont ignorés si l’entretien ou la moto est soft-deleted (via les filtres de requête).

## Schéma Prisma

Colonnes ajoutées sur `Moto` et `Entretien` :
- `deletedAt DateTime?`
- `purgeAt DateTime?`

## Plan de migration

Les colonnes sont **nullable** ; les lignes existantes ont `deletedAt = null` et `purgeAt = null`, donc aucune migration de données n’est requise. Un simple `npx prisma db push` suffit.

## Fichiers créés / modifiés

| Fichier | Action |
|---------|--------|
| `prisma/schema.prisma` | Ajout de `deletedAt`, `purgeAt` sur Moto et Entretien |
| `src/lib/services/soft-delete.ts` | Service soft delete / restore / purge |
| `src/lib/services/trash.ts` | Liste des éléments de la corbeille |
| `src/lib/prisma-filters.ts` | Filtres centralisés (`whereMotoActive`, `whereEntretienActive`) |
| `src/app/api/motos/[id]/route.ts` | DELETE → soft delete |
| `src/app/api/motos/[id]/restore/route.ts` | POST pour restauration |
| `src/app/api/entretiens/[id]/route.ts` | DELETE → soft delete |
| `src/app/api/entretiens/[id]/restore/route.ts` | POST pour restauration |
| `src/app/api/historique/[id]/route.ts` | DELETE → soft delete |
| `src/app/api/trash/route.ts` | GET liste corbeille |
| `src/app/api/cron/purge/route.ts` | Cron purge définitive |
| `src/app/(dashboard)/trash/page.tsx` | Page corbeille |
| Requêtes existantes | Ajout de filtres `deletedAt: null` |

## Commandes Prisma

```bash
npx prisma db push
npx prisma generate
```

## Cron purge

- **Route** : `GET /api/cron/purge`
- **Auth** : `Authorization: Bearer ${CRON_SECRET}`
- **Planification** : quotidien à 4h (config dans `vercel.json`)

## Checklist de tests manuels

- [ ] Supprimer une moto → disparaît des listes, visible dans la corbeille
- [ ] Supprimer un entretien → disparaît des listes et du dashboard, visible dans la corbeille
- [ ] Restaurer une moto → réapparaît dans Mes motos, entretiens restaurés
- [ ] Restaurer un entretien (moto active) → réapparaît
- [ ] Tentative de restauration d’un entretien dont la moto est supprimée → message d’erreur
- [ ] Dashboard : motos et entretiens supprimés ne s’affichent pas
- [ ] Historique : entretiens supprimés exclus
- [ ] Prochains entretiens : calculs sans les éléments supprimés
- [ ] Rappels : pas d’emails pour entretiens/motos supprimés
- [ ] Création d’entretien : sélection de moto limitée aux motos actives
