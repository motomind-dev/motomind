// @ts-nocheck
/**
 * Migration script: SQLite (old schema) → PostgreSQL (new schema with enums).
 *
 * Prerequisites:
 * 1. Old SQLite DB at DATABASE_URL_SQLITE (e.g. file:./dev.db)
 * 2. New PostgreSQL DB at DATABASE_URL (postgresql://...)
 * 3. Run Prisma migrate on PostgreSQL with schema.postgres.prisma first
 *
 * Usage: npx ts-node scripts/migrate-sqlite-to-postgres.ts
 * Or: node --loader ts-node/esm scripts/migrate-sqlite-to-postgres.ts
 *
 * For simplicity this script uses raw SQLite + Prisma for PostgreSQL.
 * Alternative: use two Prisma schemas (multi-schema) or run two separate Node processes.
 */

import { PrismaClient as PrismaPostgres } from "@prisma/client";
import Database from "better-sqlite3";
import path from "path";

// Load SQLite from env or default path
const SQLITE_PATH =
  process.env.DATABASE_URL_SQLITE?.replace("file:", "") ||
  path.join(process.cwd(), "prisma", "dev.db");

const pgUrl = process.env.DATABASE_URL;
if (!pgUrl || !pgUrl.startsWith("postgresql")) {
  console.error("DATABASE_URL must be set and point to PostgreSQL.");
  process.exit(1);
}

const db = new Database(SQLITE_PATH);
const prisma = new PrismaPostgres();

const LEGACY_TYPE_TO_ENUM: Record<string, string> = {
  vidange: "OIL_CHANGE",
  chaine: "CHAIN",
  pneus: "TIRES",
  freins: "BRAKES",
  revision_generale: "GENERAL_SERVICE",
};

const LEGACY_STATUS_TO_ENUM: Record<string, string> = {
  A_VENIR: "UPCOMING",
  proche: "SOON",
  en_retard: "OVERDUE",
  termine: "COMPLETED",
};

const LEGACY_REMINDER_TO_ENUM: Record<string, string> = {
  distance: "DISTANCE",
  date: "DATE",
};

async function migrate() {
  console.log("Reading from SQLite:", SQLITE_PATH);
  console.log("Writing to PostgreSQL (from DATABASE_URL)");

  const users = db.prepare("SELECT * FROM User").all() as any[];
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        email: u.email,
        password: u.password,
        name: u.name,
        image: u.image,
        emailVerified: u.emailVerified ? new Date(u.emailVerified) : null,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      },
      update: {},
    });
  }
  console.log("Users:", users.length);

  const accounts = db.prepare("SELECT * FROM Account").all() as any[];
  for (const a of accounts) {
    await prisma.account.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        userId: a.userId,
        type: a.type,
        provider: a.provider,
        providerAccountId: a.providerAccountId,
        refresh_token: a.refresh_token ?? null,
        access_token: a.access_token ?? null,
        expires_at: a.expires_at ?? null,
        token_type: a.token_type ?? null,
        scope: a.scope ?? null,
        id_token: a.id_token ?? null,
        session_state: a.session_state ?? null,
      },
      update: {},
    });
  }
  console.log("Accounts:", accounts.length);

  const sessions = db.prepare("SELECT * FROM Session").all() as any[];
  for (const s of sessions) {
    await prisma.session.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        sessionToken: s.sessionToken,
        userId: s.userId,
        expires: new Date(s.expires),
      },
      update: {},
    });
  }
  console.log("Sessions:", sessions.length);

  const tokens = db.prepare("SELECT * FROM PasswordResetToken").all() as any[];
  for (const t of tokens) {
    await prisma.passwordResetToken.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        email: t.email,
        token: t.token,
        expires: new Date(t.expires),
        createdAt: new Date(t.createdAt),
      },
      update: {},
    });
  }
  console.log("PasswordResetTokens:", tokens.length);

  const motos = db.prepare("SELECT * FROM Moto").all() as any[];
  for (const m of motos) {
    await prisma.motorcycle.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        userId: m.userId,
        marque: m.marque,
        modele: m.modele,
        annee: m.annee,
        kilometrage: m.kilometrage ?? 0,
        photo: m.photo ?? null,
        dateAchat: m.dateAchat ? new Date(m.dateAchat) : null,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
      },
      update: {},
    });
  }
  console.log("Motorcycles:", motos.length);

  const entretiens = db.prepare("SELECT * FROM Entretien").all() as any[];
  for (const e of entretiens) {
    const typeEnum = LEGACY_TYPE_TO_ENUM[e.type] ?? "OIL_CHANGE";
    const statusEnum = LEGACY_STATUS_TO_ENUM[e.statut] ?? "UPCOMING";
    await prisma.maintenance.upsert({
      where: { id: e.id },
      create: {
        id: e.id,
        motorcycleId: e.motoId,
        type: typeEnum as any,
        date: new Date(e.date),
        kilometrage: e.kilometrage,
        note: e.note ?? null,
        cout: e.cout ?? null,
        statut: statusEnum as any,
        garage: e.garage ?? null,
        reminderSent: e.reminderSent ? true : false,
        nextDueMileage: e.nextDueMileage ?? null,
        nextDueDate: e.nextDueDate ? new Date(e.nextDueDate) : null,
        reminderMileageBefore: e.reminderMileageBefore ?? 500,
        reminderDaysBefore: e.reminderDaysBefore ?? 30,
        intervalleKm: e.intervalleKm ?? null,
        intervalleJours: e.intervalleJours ?? null,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
      },
      update: {},
    });
  }
  console.log("Maintenances:", entretiens.length);

  const rappels = db.prepare("SELECT * FROM Rappel").all() as any[];
  for (const r of rappels) {
    const reminderType = LEGACY_REMINDER_TO_ENUM[r.type] ?? "DISTANCE";
    await prisma.reminder.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        maintenanceId: r.entretienId,
        type: reminderType as any,
        dateEnvoi: new Date(r.dateEnvoi),
        envoye: r.envoye ? true : false,
        createdAt: new Date(r.createdAt),
      },
      update: {},
    });
  }
  console.log("Reminders:", rappels.length);

  db.close();
  await prisma.$disconnect();
  console.log("Migration done.");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
