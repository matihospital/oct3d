/**
 * Escala uniforme de una pieza 3D.
 * - Medidas lineales × s
 * - Masa y tiempo de impresión ≈ × s³ (volumen), aproximación de cotización
 */
export function scaleFactorFromPercent(scalePercent: number): number {
  const s = scalePercent / 100;
  return Number.isFinite(s) && s > 0 ? s : 1;
}

export function scaleLinear(valueCm: number, scale: number): number {
  return Math.max(0, valueCm) * scale;
}

export function scaleVolumeMetric(value: number, scale: number): number {
  return Math.max(0, value) * scale ** 3;
}

export function formatScaleLabel(scalePercent: number): string {
  const rounded = Math.round(scalePercent * 10) / 10;
  return `${rounded}%`;
}

export type BoundingBoxCm = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export function scaleBoundingBox(
  box: BoundingBoxCm,
  scale: number,
): BoundingBoxCm {
  return {
    lengthCm: scaleLinear(box.lengthCm, scale),
    widthCm: scaleLinear(box.widthCm, scale),
    heightCm: scaleLinear(box.heightCm, scale),
  };
}

export function formatBoundingBoxCm(box: BoundingBoxCm): string {
  const fmt = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${fmt(box.lengthCm)} × ${fmt(box.widthCm)} × ${fmt(box.heightCm)} cm`;
}
