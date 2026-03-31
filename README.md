# MotoMind 🏍️

Carnet d'entretien intelligent pour motards. Suivez les entretiens de votre moto, recevez des rappels et anticipez les révisions.

## Technologies

- **Frontend** : Next.js 14, React, Tailwind CSS
- **Backend** : API Routes Next.js
- **Base de données** : PostgreSQL + Prisma
- **Authentification** : NextAuth (Credentials)
- **Emails** : Resend
- **Hébergement** : Vercel

## Installation

### 1. Cloner et installer les dépendances

```bash
cd ai-tracking
npm install
```

### 2. Configuration

```bash
cp .env.example .env
```

Remplissez `.env` (SQLite par défaut pour le dev) :

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3002"
NEXTAUTH_SECRET="votre-secret-genere-avec-openssl-rand-base64-32"
```

Générez un secret : `openssl rand -base64 32`

### 3. Créer la base de données (obligatoire pour l'inscription)

```bash
npx prisma generate
npx prisma db push
```

Sans cette étape, l'inscription et la connexion ne fonctionneront pas.

### 4. Lancer l'application

```bash
npm run dev
```

Ouvrez [http://localhost:3002](http://localhost:3002).

## Déploiement sur Vercel

1. Connectez votre dépôt GitHub à Vercel
2. Ajoutez les variables d'environnement dans les paramètres du projet
3. Configurez une base PostgreSQL (Vercel Postgres ou externe)
4. Le cron des rappels s'exécute quotidiennement à 8h (configuré dans `vercel.json`)

## Structure du projet

```
src/
├── app/
│   ├── (auth)/          # Login, Signup
│   ├── (dashboard)/     # Dashboard, Motos, Entretiens, Historique
│   ├── api/             # Routes API
│   └── providers.tsx    # SessionProvider
├── components/          # Layout, etc.
├── lib/                 # Prisma, Auth, Utils
└── types/               # Types TypeScript
```

## Fonctionnalités

- ✅ Création de compte / Connexion
- ✅ Gestion des motos (CRUD)
- ✅ Enregistrement des entretiens (vidange, chaîne, pneus, freins, révision)
- ✅ Dashboard avec état de la moto et prochain entretien
- ✅ Historique chronologique
- ✅ Rappels automatiques (500 km avant ou 30 jours avant)
- ✅ Emails via Resend

## Intervalles par défaut

| Type          | Intervalle |
|---------------|------------|
| Vidange       | 5 000 km   |
| Chaîne        | 3 000 km   |
| Pneus         | 10 000 km  |
| Freins        | 10 000 km  |
| Révision      | 10 000 km  |

Les indicateurs visuels :
- 🟢 **OK** : Tout va bien
- 🟠 **Bientôt** : Entretien dans les 500 km ou 30 jours
- 🔴 **Urgent** : Entretien en retard
