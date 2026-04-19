// Intervals (km) per maintenance type
export const INTERVALLES_KM: Record<string, number> = {
  vidange: 5000,
  chaine: 3000,
  pneus: 10000,
  freins: 10000,
  revision_generale: 10000,
};

// Seuil "proche" en km
export const SEUIL_PROCHE_KM = 500;

// Seuil "proche" en jours
export const SEUIL_PROCHE_JOURS = 15;

export type EtatMoto = "ok" | "bientot" | "en_retard";

export function getEtatMoto(
  prochainKm: number | null,
  prochainDate: Date | null,
  kilometrageActuel: number
): EtatMoto {
  if (!prochainKm && !prochainDate) return "ok";

  const kmRestants = prochainKm ? prochainKm - kilometrageActuel : Infinity;
  const joursRestants = prochainDate
    ? Math.ceil((prochainDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : Infinity;

  // En retard
  if (kmRestants < 0 || joursRestants < 0) return "en_retard";

  // Bientôt (500 km ou 15 jours)
  if (kmRestants <= SEUIL_PROCHE_KM || joursRestants <= SEUIL_PROCHE_JOURS)
    return "bientot";

  return "ok";
}

export function getStatutEntretien(
  dateProchaine: Date | null,
  kmProchain: number | null,
  kilometrageActuel: number
): string {
  const kmRestants = kmProchain ? kmProchain - kilometrageActuel : Infinity;
  const joursRestants = dateProchaine
    ? Math.ceil((dateProchaine.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : Infinity;

  if (kmRestants < 0 || joursRestants < 0) return "en_retard";
  if (kmRestants <= SEUIL_PROCHE_KM || joursRestants <= SEUIL_PROCHE_JOURS)
    return "proche";
  return "A_VENIR";
}

/** Statut pour les rappels : OK, SOON, OVERDUE */
export type ReminderStatus = "OK" | "SOON" | "OVERDUE";

export function getReminderStatus(
  nextDueKm: number | null,
  currentKm: number
): ReminderStatus {
  if (nextDueKm == null) return "OK";
  const kmRestants = nextDueKm - currentKm;
  if (kmRestants < 0) return "OVERDUE";
  if (kmRestants <= SEUIL_PROCHE_KM) return "SOON";
  return "OK";
}

/** Statut intelligent pour l'affichage des entretiens */
export type MaintenanceStatus = "OK" | "SOON" | "OVERDUE";

export function getMaintenanceStatus(
  currentMileage: number,
  nextDueMileage: number | null,
  nextDueDate: Date | null,
  reminderMileageBefore: number = 500,
  reminderDaysBefore: number = 15
): MaintenanceStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // OVERDUE : dépassé (km ou date)
  if (nextDueMileage != null && currentMileage >= nextDueMileage) return "OVERDUE";
  if (nextDueDate) {
    const dueDate = new Date(nextDueDate);
    dueDate.setHours(0, 0, 0, 0);
    if (today >= dueDate) return "OVERDUE";
  }

  // SOON : dans la fenêtre de rappel
  if (nextDueMileage != null && currentMileage >= nextDueMileage - reminderMileageBefore)
    return "SOON";
  if (nextDueDate) {
    const reminderDate = new Date(nextDueDate);
    reminderDate.setDate(reminderDate.getDate() - reminderDaysBefore);
    reminderDate.setHours(0, 0, 0, 0);
    if (today >= reminderDate) return "SOON";
  }

  return "OK";
}

export function formatEntretienType(type: string): string {
  const labels: Record<string, string> = {
    vidange: "Vidange moteur",
    chaine: "Chaîne",
    pneus: "Pneus",
    freins: "Freins",
    revision_generale: "Révision générale",
  };
  return labels[type] || type;
}

export function formatStatut(statut: string): string {
  const labels: Record<string, string> = {
    A_VENIR: "À venir",
    proche: "À venir",
    en_retard: "En retard",
    termine: "Terminé",
  };
  return labels[statut] || statut;
}

/** Indicateur de statut pour l'historique des entretiens */
export type StatutIndicateur = "ok" | "recent" | "important";

export function getStatutIndicateurEntretien(
  statut: string,
  date: Date | string,
  type: string
): { label: string; color: string } {
  const dateEntretien = new Date(date);
  const joursDepuis = Math.floor(
    (Date.now() - dateEntretien.getTime()) / (1000 * 60 * 60 * 24)
  );
  const typesCritiques = ["revision_generale", "freins"];

  // 🔴 Entretien important : en retard ou type critique
  if (statut === "en_retard" || typesCritiques.includes(type)) {
    return { label: "Entretien important", color: "text-red-400" };
  }
  // 🟠 Entretien récent : effectué dans les 30 derniers jours
  if (joursDepuis <= 30) {
    return { label: "Entretien récent", color: "text-orange-400" };
  }
  // 🟢 Entretien OK
  return { label: "Entretien OK", color: "text-emerald-400" };
}
