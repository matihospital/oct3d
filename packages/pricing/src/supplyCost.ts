/** Costo por gramo a partir del precio de la unidad de compra */
export function costPerGram(
  unitCost: number,
  gramsPerUnit: number | null | undefined,
): number | null {
  if (gramsPerUnit == null || gramsPerUnit <= 0 || !Number.isFinite(unitCost)) {
    return null;
  }
  return unitCost / gramsPerUnit;
}

/** Costo de N gramos usando el precio de compra (ej. $/kg) */
export function costForGrams(
  unitCost: number,
  gramsPerUnit: number,
  grams: number,
): number {
  if (gramsPerUnit <= 0) return 0;
  return (unitCost / gramsPerUnit) * Math.max(0, grams);
}
