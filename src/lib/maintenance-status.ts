import { formatEntretienType } from "./utils";
import {
  getEffectiveIntervalKmForCategory,
  hasRevisionPreconizationKmSource,
  nextYamahaGridDueMileage,
  resolveIntervalleJoursForCategory,
} from "./auto-revision-intervals";
import { getRevisionIntervalRuleForMoto } from "./yamaha-revision-intervals";
import {
  computeMaintenanceDisplayStatus,
  type MaintenanceDisplayStatus,
} from "@/lib/services/maintenance-status";
import {
  MAINTENANCE_CATEGORIES,
  entretienMatchesCategory,
  getMaintenanceCategoryForType,
  isAutoPrecomputedMaintenanceCategory,
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
  /** Grille Yamaha (révision) : 6 000 ou 10 000 km — pour libellé « tous les X km », distinct du km compteur */
  constructorIntervalKm?: number | null;
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
  annee: number;
  cylindreeCm3: number | null;
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
      if (!isAutoPrecomputedMaintenanceCategory(type)) {
        continue;
      }

      const derniers = moto.entretiens
        .filter((e) => entretienMatchesCategory(e.type, type))
        .sort((a, b) => {
          if (b.kilometrage !== a.kilometrage) {
            return b.kilometrage - a.kilometrage;
          }
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
      const dernier = derniers[0];

      // Sans au moins un entretien terminé pour ce type, on n’invente pas d’échéance
      // (évite les 5 lignes « à venir » fantômes sur une moto neuve dans le carnet).
      if (!dernier) {
        continue;
      }

      const motoCtx = {
        marque: moto.marque,
        modele: moto.modele,
        annee: moto.annee,
        cylindreeCm3: moto.cylindreeCm3,
      };

      const intervalleKm = getEffectiveIntervalKmForCategory(
        type,
        motoCtx,
        dernier.intervalleKm
      );
      if (intervalleKm == null || intervalleKm <= 0) {
        continue;
      }

      const intervalleJours = resolveIntervalleJoursForCategory(
        type,
        dernier.intervalleJours,
        motoCtx
      );

      const nextDueMileage =
        type === "revision_generale" && hasRevisionPreconizationKmSource(motoCtx)
          ? nextYamahaGridDueMileage(dernier.kilometrage, intervalleKm)
          : dernier.kilometrage + intervalleKm;
      const nextDueDate =
        intervalleJours != null && intervalleJours > 0
          ? (() => {
              const d = new Date(dernier.date);
              d.setDate(d.getDate() + intervalleJours);
              return d;
            })()
          : null;

      const reminderMileageBefore = dernier.reminderMileageBefore ?? 500;
      const reminderDaysBefore = dernier.reminderDaysBefore ?? 15;

      const status = computeMaintenanceDisplayStatus({
        isCompleted: false,
        currentMileage: moto.kilometrage,
        nextDueMileage,
        nextDueDate,
        reminderMileageBefore,
        reminderDaysBefore,
      });

      const kmRemaining = nextDueMileage - moto.kilometrage;
      const daysRemaining =
        nextDueDate != null
          ? Math.ceil(
              (nextDueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
          : null;

      const constructorIntervalKm =
        type === "revision_generale"
          ? getRevisionIntervalRuleForMoto(motoCtx)?.intervalKm ?? null
          : null;

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
        daysRemaining:
          daysRemaining != null && daysRemaining > 0 ? daysRemaining : null,
        constructorIntervalKm,
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
    const typeCanonique =
      getMaintenanceCategoryForType(e.type) ?? e.type.trim();
    const nextDueDate = e.nextDueDate ? new Date(e.nextDueDate) : null;
    const nextDueMileage = e.nextDueMileage ?? null;
    const currentMileage = e.moto?.kilometrage ?? 0;
    const status = computeMaintenanceDisplayStatus({
      isCompleted: false,
      currentMileage,
      nextDueMileage,
      nextDueDate,
      reminderMileageBefore: e.reminderMileageBefore ?? 500,
      reminderDaysBefore: e.reminderDaysBefore ?? 15,
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
      type: typeCanonique,
      typeLabel: formatEntretienType(typeCanonique),
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

/**
 * Fusionne les items calculés (depuis entretiens terminés) et les entretiens planifiés.
 * Pour **révision générale** : si un item est déjà calculé depuis la dernière fiche terminée,
 * on ignore un entretien encore « A_VENIR » en base pour la même moto — sinon un vieux planifié
 * masque la prochaine échéance réelle (ex. après « Marquer comme effectué », la ligne ne passait pas à 20 000 km).
 * Pour les autres types : les planifiés priment encore sur le calcul pour un même (motoId, type).
 */
export function mergeMaintenanceItems(
  computed: MaintenanceStatusItem[],
  planned: MaintenanceStatusItem[]
): MaintenanceStatusItem[] {
  const computedRevisionMotoIds = new Set(
    computed
      .filter((c) => c.type === "revision_generale")
      .map((c) => c.motoId)
  );

  const plannedFiltered = planned.filter((p) => {
    if (p.type !== "revision_generale") {
      return true;
    }
    if (computedRevisionMotoIds.has(p.motoId)) {
      return false;
    }
    return true;
  });

  const plannedKeys = new Set(
    plannedFiltered.map((p) => `${p.motoId}-${p.type}`)
  );
  const fromComputed = computed.filter(
    (c) => !plannedKeys.has(`${c.motoId}-${c.type}`)
  );
  const merged = [...plannedFiltered, ...fromComputed];
  const statusOrder: Record<MaintenanceDisplayStatus, number> = {
    OVERDUE: 0,
    SOON: 1,
    UPCOMING: 2,
    COMPLETED: 3,
  };
  return merged.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
}
