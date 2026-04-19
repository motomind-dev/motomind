/**
 * Kilométrage à retenir à la clôture d’un entretien (compteur moto + km saisis + échéance km prévue).
 */
export function kilometrageAtCompletion(
  motoKm: number,
  entretien: { kilometrage: number; nextDueMileage: number | null }
): number {
  const due =
    entretien.nextDueMileage != null && entretien.nextDueMileage > 0
      ? entretien.nextDueMileage
      : 0;
  return Math.max(motoKm, entretien.kilometrage, due);
}
