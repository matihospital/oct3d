import { marginFromTotals } from "@oct3d/pricing";

export type LineInput = {
  quantity: number;
  unitPrice: number;
  unitCost: number;
};

export function computeDocumentTotals(lines: LineInput[]) {
  const totalPrice = lines.reduce(
    (sum, line) => sum + Math.max(1, Math.floor(line.quantity)) * line.unitPrice,
    0,
  );
  const totalCost = lines.reduce(
    (sum, line) => sum + Math.max(1, Math.floor(line.quantity)) * line.unitCost,
    0,
  );
  const { marginAmount, marginPercent } = marginFromTotals(totalPrice, totalCost);
  return { totalPrice, totalCost, marginAmount, marginPercent };
}
