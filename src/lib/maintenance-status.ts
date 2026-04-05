import { INTERVALLES_KM, formatEntretienType } from "./utils";
import {
  computeMaintenanceDisplayStatus,
  type MaintenanceDisplayStatus,
} from "@/lib/services/maintenance-status";
import {
  MAINTENANCE_CATEGORIES,
  entretienMatchesCategory,
} from "./maintenance-entretien-category";

export type MaintenanceStatusItem = {
  motoId: string;
  motoName: string;
  type: string;
  typeLabel: string;
  status: MaintenanceDisplayStatus;
  nextDueMileage: number | null;
  nextDueDate: Date | null;
  currentMileage: number;
  kmRemaining: number | null;
  daysRemaining: number | null;
  /** ID de l'entretien planifié (quand disponible) pour PUT complete */
  entretienId?: string;
};

/** Filtre pour n'afficher que les entretiens à prévoir (SOON et OVERDUE) ou tous selon besoin */
export function filterUpcomingItems(
  items: MaintenanceStatusItem[],
  includeOk = false
): MaintenanceStatusItem[] {
  if (includeOk) return items;
  return items.filter((i) => i.status === "SOON" || i.status === "OVERDUE");
}

type MotoWithEntretiens = {
  id: string;
  marque: string;
  modele: string;
  kilometrage: number;
  entretiens: {
    type: string;
    kilometrage: number;
    date: Date;
    intervalleKm: number | null;
    intervalleJours: number | null;
    reminderMileageBefore: number;
    reminderDaysBefore: number;
  }[];
};

export function computeMaintenanceStatusItems(
  motos: MotoWithEntretiens[]
): MaintenanceStatusItem[] {
  const items: MaintenanceStatusItem[] = [];

  for (const moto of motos) {
    const motoName = `${moto.marque} ${moto.modele}`;

    for (const type of MAINTENANCE_CATEGORIES) {
      const derniers = moto.entretiens
        .filter((e) => entretienMatchesCategory(e.type, type))
        .sort((a, b) => b.kilometrage - a.kilometrage);
      const dernier = derniers[0];

      // Sans au moins un entretien terminé pour ce type, on n’invente pas d’échéance
      // (évite les 5 lignes « à venir » fantômes sur une moto neuve dans le carnet).
      if (!dernier) {
        continue;
      }

      const intervalleKm =
        dernier.intervalleKm ?? INTERVALLES_KM[type] ?? 5000;
      const intervalleJours = dernier.intervalleJours ?? 365;

      const nextDueMileage = dernier.kilometrage + intervalleKm;
      const nextDueDate = (() => {
        const d = new Date(dernier.date);
        d.setDate(d.getDate() + intervalleJours);
        return d;
      })();

      const reminderMileageBefore = dernier.reminderMileageBefore ?? 500;
      const reminderDaysBefore = dernier.reminderDaysBefore ?? 30;

      const status = computeMaintenanceDisplayStatus({
        isCompleted: false,
        currentMileage: moto.kilometrage,
        nextDueMileage,
        nextDueDate,
        reminderMileageBefore,
        reminderDaysBefore,
      });

      const kmRemaining = nextDueMileage - moto.kilometrage;
      const daysRemaining = Math.ceil(
        (nextDueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      items.push({
        motoId: moto.id,
        motoName,
        type,
        typeLabel: formatEntretienType(type),
        status,
        nextDueMileage,
        nextDueDate,
        currentMileage: moto.kilometrage,
        kmRemaining: kmRemaining > 0 ? Math.round(kmRemaining) : null,
        daysRemaining: daysRemaining > 0 ? daysRemaining : null,
      });
    }
  }

  const statusOrder: Record<MaintenanceDisplayStatus, number> = {
    OVERDUE: 0,
    SOON: 1,
    UPCOMING: 2,
    COMPLETED: 3,
  };
  return items.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
}

/** Entretien planifié (statut A_VENIR) avec nextDueDate / nextDueMileage */
export type PlannedEntretien = {
  id: string;
  motoId: string;
  type: string;
  nextDueDate: Date | null;
  nextDueMileage: number | null;
  reminderMileageBefore: number;
  reminderDaysBefore: number;
  moto: { marque: string; modele: string; kilometrage: number };
};

/** Convertit les entretiens planifiés (UPCOMING) en MaintenanceStatusItem pour le dashboard */
export function plannedEntretiensToStatusItems(
  planned: PlannedEntretien[]
): MaintenanceStatusItem[] {
  const items: MaintenanceStatusItem[] = [];
  for (const e of planned) {
    const nextDueDate = e.nextDueDate ? new Date(e.nextDueDate) : null;
    const nextDueMileage = e.nextDueMileage ?? null;
    const currentMileage = e.moto?.kilometrage ?? 0;
    const status = computeMaintenanceDisplayStatus({
      isCompleted: false,
      currentMileage,
      nextDueMileage,
      nextDueDate,
      reminderMileageBefore: e.reminderMileageBefore ?? 500,
      reminderDaysBefore: e.reminderDaysBefore ?? 30,
    });
    const kmRemaining =
      nextDueMileage != null && nextDueMileage > currentMileage
        ? Math.round(nextDueMileage - currentMileage)
        : null;
    const daysRemaining =
      nextDueDate != null
        ? Math.ceil(
            (new Date(nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        : null;
    items.push({
      motoId: e.motoId,
      motoName: e.moto ? `${e.moto.marque} ${e.moto.modele}` : "Moto",
      type: e.type,
      typeLabel: formatEntretienType(e.type),
      status,
      nextDueMileage,
      nextDueDate,
      currentMileage,
      kmRemaining: kmRemaining != null && kmRemaining > 0 ? kmRemaining : null,
      daysRemaining: daysRemaining != null && daysRemaining > 0 ? daysRemaining : null,
      entretienId: e.id,
    });
  }
  const statusOrder: Record<MaintenanceDisplayStatus, number> = {
    OVERDUE: 0,
    SOON: 1,
    UPCOMING: 2,
    COMPLETED: 3,
  };
  return items.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
}

/** Fusionne les items calculés (depuis entretiens terminés) et les entretiens planifiés (UPCOMING). Les planifiés priment pour un même (motoId, type). */
export function mergeMaintenanceItems(
  computed: MaintenanceStatusItem[],
  planned: MaintenanceStatusItem[]
): MaintenanceStatusItem[] {
  const plannedKeys = new Set(planned.map((p) => `${p.motoId}-${p.type}`));
  const fromComputed = computed.filter(
    (c) => !plannedKeys.has(`${c.motoId}-${c.type}`)
  );
  const merged = [...planned, ...fromComputed];
  const statusOrder: Record<MaintenanceDisplayStatus, number> = {
    OVERDUE: 0,
    SOON: 1,
    UPCOMING: 2,
    COMPLETED: 3,
  };
  return merged.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
}
