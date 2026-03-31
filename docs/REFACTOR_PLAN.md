# Plan de refactoring MotoMind — PostgreSQL, Enums, Sécurité, Uniformisation

## A. Audit des changements à faire

### A.1 Base de données
- **Actuel** : SQLite, fichier `prisma/dev.db`, modèles `Moto`, `Entretien`, `Rappel` avec champs `type` et `statut` en String.
- **Cible** : PostgreSQL, enums Prisma pour les types métier, modèles renommés `Motorcycle`, `Maintenance`, `Reminder`.
- **Points d’attention** : migration des données (script dédié), pas de perte, mapping anciennes valeurs → enums.

### A.2 Modèles et champs à convertir en enum
| Modèle actuel | Champ   | Valeurs actuelles | Enum cible        |
|---------------|---------|-------------------|--------------------|
| Entretien     | type    | vidange, chaine, pneus, freins, revision_generale | MaintenanceType   |
| Entretien     | statut  | A_VENIR, proche, en_retard, termine | MaintenanceStatus |
| Rappel        | type    | distance, date    | ReminderType      |

### A.3 Routes et structure
- **API** : `/api/motos` → `/api/motorcycles`, `/api/entretiens` → `/api/maintenance`, `/api/rappels` → `/api/reminders`. Tous les `fetch()` côté client doivent être mis à jour.
- **Pages** : `/dashboard/entretiens` → `/maintenance` (déjà cohérent avec layout qui pointe vers "Entretiens"). Routes cibles : `/motorcycles`, `/motorcycles/new`, `/maintenance`, `/maintenance/new`, `/maintenance/[id]/edit`, `/history`.
- **Fichiers** : renommer dossiers et fichiers pour refléter `maintenance` au lieu de `entretiens`, garder `motorcycles` (déjà bon).

### A.4 Sécurité
- **Auth** : bcrypt déjà utilisé (register, reset). Renforcer validation (Zod) sur login, register, reset-password.
- **API** : toutes les routes vérifient déjà la session ; s’assurer que chaque ressource vérifie l’ownership (moto/maintenance de l’utilisateur).
- **Validation** : Zod sur toutes les entrées critiques (création/édition moto, maintenance, auth).
- **Rate limiting** : à ajouter sur login, reset-password-request, et endpoints sensibles.
- **Headers** : CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy dans `next.config.js` ou middleware.

### A.5 Logique métier
- Conserver `computeMaintenanceStatusItems`, `getMaintenanceStatus`, intervalles par type, rappels km/date.
- Centraliser dans `src/lib/constants/maintenance.ts`, `src/lib/services/maintenance-status.ts`, et mappers enum → libellé français dans un module dédié.

---

## B. Nouveau schéma Prisma (PostgreSQL)

Voir fichier `prisma/schema.postgres.prisma` (à renommer en `schema.prisma` après migration).

---

## C. Liste des enums ajoutées

- **MaintenanceType** : OIL_CHANGE, CHAIN, TIRES, BRAKES, GENERAL_SERVICE  
  (mapping : vidange→OIL_CHANGE, chaine→CHAIN, pneus→TIRES, freins→BRAKES, revision_generale→GENERAL_SERVICE)

- **MaintenanceStatus** : UPCOMING, SOON, OVERDUE, COMPLETED  
  (mapping : A_VENIR→UPCOMING, proche→SOON, en_retard→OVERDUE, termine→COMPLETED)

- **ReminderType** : DISTANCE, DATE  
  (mapping : distance→DISTANCE, date→DATE)

---

## D. Plan de migration des données SQLite → PostgreSQL

1. **Prérequis** : PostgreSQL installé, base créée, `DATABASE_URL` pointant vers PostgreSQL.
2. **Créer le schéma** : `npx prisma migrate dev --name init_postgres` (avec le nouveau schema.prisma).
3. **Script de migration des données** : exécuter un script Node qui :
   - se connecte à SQLite (Prisma avec `schema.prisma` temporaire ou script SQLite3),
   - lit User, Account, Session, VerificationToken, PasswordResetToken, Moto, Entretien, Rappel,
   - mappe les champs : `type` (entretien) → enum MaintenanceType, `statut` → MaintenanceStatus, `type` (rappel) → ReminderType,
   - insère dans PostgreSQL (Prisma client avec le nouveau schéma).  
   Fichier proposé : `scripts/migrate-sqlite-to-postgres.ts`.
4. **Vérifications** : compter les lignes par table avant/après, vérifier quelques enregistrements à la main.
5. **Bascule** : une fois validé, désactiver l’ancienne SQLite et ne plus utiliser l’ancien schéma.

---

## E. Fichiers à créer / modifier

### À créer
- `prisma/schema.postgres.prisma` → à remplacer `schema.prisma`
- `src/lib/constants/maintenance.ts`
- `src/lib/validators/auth.ts`
- `src/lib/validators/motorcycle.ts`
- `src/lib/validators/maintenance.ts`
- `src/lib/mappers/maintenance-labels.ts` (enum → libellé FR)
- `scripts/migrate-sqlite-to-postgres.ts`
- `src/lib/rate-limit.ts` (stub ou implémentation simple)
- `src/middleware-security.ts` (headers) ou intégration dans `middleware.ts`
- `next.config.js` : headers de sécurité si non gérés par middleware

### À modifier
- Toutes les routes API : `motos` → `motorcycles`, `entretiens` → `maintenance`, `rappels` → `reminders` ; utiliser les enums et les validators Zod.
- `src/lib/auth.ts` : pas de changement majeur, cookies sécurisés déjà gérés par NextAuth avec NEXTAUTH_SECRET.
- `src/lib/utils.ts` : utiliser les constantes et enums depuis `constants/maintenance.ts` et `mappers/maintenance-labels.ts`.
- `src/lib/maintenance-status.ts` : utiliser MaintenanceType / MaintenanceStatus (types TS issus de Prisma).
- `src/lib/reminders.ts` : utiliser Prisma Motorcycle/Maintenance/Reminder et enums.
- Pages et composants : remplacer les appels à `/api/motos` et `/api/entretiens` par `/api/motorcycles` et `/api/maintenance`, et les champs `marque`/`modele` par `brand`/`model` si vous renommez les colonnes (optionnel pour limiter la casse, on peut garder marque/modele en DB).

---

## F. Fichiers critiques refactorés

- **Auth** : `src/app/api/auth/register/route.ts`, `reset-password-request/route.ts`, `reset-password/route.ts` — Zod + rate limiting.
- **Motos** : `src/app/api/motos/route.ts` — validation Zod via `createMotorcycleBodySchema`.
- **Constants** : `src/lib/constants/maintenance.ts` — types, intervalles, mapping legacy ↔ enum.
- **Validators** : `src/lib/validators/auth.ts`, `motorcycle.ts`, `maintenance.ts`.
- **Mappers** : `src/lib/mappers/maintenance-labels.ts` — libellés français et couleurs.

## G. Routes API — session et ownership

Toutes les routes protégées vérifient déjà `getServerSession(authOptions)` et l’ownership (moto/entretien appartient à `session.user.id`). Aucun changement structurel nécessaire ; les validators Zod renforcent les entrées.

## H. Validators Zod

- `src/lib/validators/auth.ts` : register, login, resetPasswordRequest, resetPassword.
- `src/lib/validators/motorcycle.ts` : createMotorcycleBodySchema, updateMotorcycleBodySchema.
- `src/lib/validators/maintenance.ts` : createMaintenanceBodySchema, updateMaintenanceSchema, markCompleteBodySchema.

## I. Helpers enum → libellé UI (français)

- `src/lib/mappers/maintenance-labels.ts` : `getMaintenanceTypeLabel`, `getMaintenanceStatusLabel`, `getDisplayStatusColor`, `getDisplayStatusLabel`.
- Les constantes dans `src/lib/constants/maintenance.ts` permettent de mapper legacy ↔ enum pour la migration.

## J. Structure de dossiers proposée (après uniformisation)

```
src/
  app/
    (auth)/         login, signup, reset-password, reset-password-request
    (dashboard)/    layout avec nav
      dashboard/    page tableau de bord
      motorcycles/  liste + new (+ [id]/edit si besoin)
      maintenance/  liste + new (+ [id]/edit)  ← renommer depuis dashboard/entretiens
      history/     historique
    api/
      auth/         register, [...nextauth], reset-password, reset-password-request
      motorcycles/  GET, POST + [id] GET, PATCH, DELETE
      maintenance/  GET, POST, complete + [id] PATCH, DELETE
      reminders/    GET, check
      cron/         rappels (ou reminders)
  lib/
    constants/      maintenance.ts
    validators/     auth.ts, motorcycle.ts, maintenance.ts
    mappers/        maintenance-labels.ts
    rate-limit.ts
    auth.ts
    prisma.ts
    utils.ts
    maintenance-status.ts
    reminders.ts
    email.ts
  components/
  types/
```

## K. Variables d’environnement

- **DATABASE_URL** : `postgresql://USER:PASSWORD@HOST:5432/moto_saas?schema=public` (après migration).
- **DATABASE_URL_SQLITE** : optionnel, pour le script de migration (ex. `file:./prisma/dev.db`).
- **NEXTAUTH_URL**, **NEXTAUTH_SECRET** : obligatoires.
- **RESEND_API_KEY**, **RESEND_FROM_EMAIL** : pour les emails.
- **CRON_SECRET** : pour sécuriser `/api/cron/rappels`.

## L. Commandes à exécuter

1. **Rester en SQLite (actuel)**  
   - `npm install`  
   - `npx prisma generate`  
   - `npx prisma db push` (si besoin)  
   - `npm run dev`

2. **Migrer vers PostgreSQL**  
   - Créer la base PostgreSQL et définir `DATABASE_URL`.  
   - Remplacer `prisma/schema.prisma` par le contenu de `prisma/schema.postgres.prisma`.  
   - `npx prisma migrate dev --name init_postgres`  
   - Installer `better-sqlite3` et `@types/better-sqlite3` si vous utilisez le script de migration.  
   - Définir `DATABASE_URL_SQLITE` vers le fichier SQLite, garder `DATABASE_URL` vers PostgreSQL.  
   - `npx ts-node scripts/migrate-sqlite-to-postgres.ts` (ou équivalent avec tsx).  
   - Vérifier les données, puis supprimer l’ancienne SQLite.

3. **Après migration**  
   - Mettre à jour le code pour utiliser les modèles `Motorcycle`, `Maintenance`, `Reminder` et les enums (voir section E).

## M. Checklist de test manuel (rien ne doit casser)

- [ ] Connexion / déconnexion
- [ ] Inscription (validation email, mot de passe)
- [ ] Reset password (demande + lien + nouveau mot de passe)
- [ ] Liste et ajout de motos
- [ ] Édition et suppression d’une moto
- [ ] Liste et ajout d’entretiens
- [ ] Marquer un entretien comme effectué (dashboard)
- [ ] Historique (entretiens terminés)
- [ ] Dashboard : prochains entretiens, état des maintenances, entretiens récents
- [ ] Rate limiting : plus de 5 inscriptions depuis la même IP en 1 min → 429
- [ ] Accès à une ressource d’un autre utilisateur → 404 (ne pas exposer de fuite)

---

## Règles de sécurité de migration

- Ne pas supprimer de fonctionnalités.
- Pour tout renommage de route ou de modèle : mettre à jour tous les imports et appels (fetch, liens, redirects).
- Pour toute enum : mettre à jour filtres, formulaires, seeds, conditions UI et mapping anciennes valeurs.
- Garder le projet buildable après chaque étape.
- En cas de doute, ajouter un TODO explicite et choisir l’option la plus sûre (ex. garder anciennes routes en redirect temporaire).
