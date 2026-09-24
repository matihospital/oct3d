import { prisma, type Prisma } from "@oct3d/db";
import type { LineColorUsage } from "@/lib/line-colors";

export type OrderMaterialDraft = {
  supplyId: string;
  grams: number;
};

export function normalizeMaterialDrafts(
  materials: OrderMaterialDraft[] | undefined,
): OrderMaterialDraft[] {
  if (!materials?.length) return [];
  const bySupply = new Map<string, number>();
  for (const m of materials) {
    const supplyId = m.supplyId?.trim();
    const grams = Number(m.grams);
    if (!supplyId || !Number.isFinite(grams) || grams <= 0) continue;
    bySupply.set(supplyId, (bySupply.get(supplyId) ?? 0) + grams);
  }
  return [...bySupply.entries()].map(([supplyId, grams]) => ({ supplyId, grams }));
}

export function materialCreateData(materials: OrderMaterialDraft[]) {
  const cleaned = normalizeMaterialDrafts(materials);
  if (!cleaned.length) return undefined;
  return {
    create: cleaned.map((m) => ({
      supplyId: m.supplyId,
      grams: m.grams,
      deducted: false,
    })),
  };
}

/** Agrega gramos por colorId desde las líneas del documento. */
export function aggregateGramsByColor(
  lines: Array<{ colors?: LineColorUsage[] }>,
): Map<string, number> {
  const byColor = new Map<string, number>();
  for (const line of lines) {
    for (const c of line.colors ?? []) {
      const grams = Number(c.grams);
      if (!c.colorId || !Number.isFinite(grams) || grams <= 0) continue;
      byColor.set(c.colorId, (byColor.get(c.colorId) ?? 0) + grams);
    }
  }
  return byColor;
}

/**
 * Resuelve insumos a partir de colores+gramos de las líneas.
 * Si hay varios insumos del mismo color, usa el de mayor stock.
 */
export async function materialsFromLineColors(
  lines: Array<{ colors?: LineColorUsage[] }>,
): Promise<OrderMaterialDraft[]> {
  const byColor = aggregateGramsByColor(lines);
  if (byColor.size === 0) return [];

  const colorIds = [...byColor.keys()];
  const supplies = await prisma.supply.findMany({
    where: {
      colorId: { in: colorIds },
      unit: { gramsPerUnit: { not: null } },
    },
    include: { unit: true },
  });

  const byColorSupplies = new Map<string, typeof supplies>();
  for (const s of supplies) {
    if (!s.colorId) continue;
    const list = byColorSupplies.get(s.colorId) ?? [];
    list.push(s);
    byColorSupplies.set(s.colorId, list);
  }

  const drafts: OrderMaterialDraft[] = [];
  for (const [colorId, grams] of byColor) {
    const candidates = byColorSupplies.get(colorId) ?? [];
    if (candidates.length === 0) continue;
    const supply = [...candidates].sort((a, b) => b.stockQty - a.stockQty)[0];
    drafts.push({ supplyId: supply.id, grams });
  }
  return drafts;
}

/** Une materiales explícitos + derivados de colores (suma por supply). */
export function mergeMaterialDrafts(
  ...groups: Array<OrderMaterialDraft[] | undefined>
): OrderMaterialDraft[] {
  return normalizeMaterialDrafts(groups.flatMap((g) => g ?? []));
}

type Tx = Prisma.TransactionClient;

/** Descuenta stock de materiales no descontados del pedido. Idempotente. */
export async function deductOrderMaterials(
  orderId: string,
  tx: Tx = prisma,
): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      materials: {
        where: { deducted: false },
        include: { supply: { include: { unit: true } } },
      },
    },
  });
  if (!order || order.materials.length === 0) return;

  const label = order.clientName?.trim() || orderId.slice(-6);
  const notes = `Pedido ${label}`;

  for (const mat of order.materials) {
    const gpu = mat.supply.unit.gramsPerUnit;
    if (gpu == null || gpu <= 0) {
      // Insumo sin masa: saltar sin marcar deducted para que se corrija a mano
      continue;
    }

    const deltaQty = -(mat.grams / gpu);
    const nextStock = Math.max(0, mat.supply.stockQty + deltaQty);

    await tx.stockAdjustment.create({
      data: {
        supplyId: mat.supplyId,
        deltaQty,
        reason: "Pedido",
        notes,
      },
    });
    await tx.supply.update({
      where: { id: mat.supplyId },
      data: { stockQty: nextStock },
    });
    await tx.orderMaterial.update({
      where: { id: mat.id },
      data: { deducted: true },
    });
  }
}

/** Comprometido en unidad de compra por supplyId (pedidos sin entregar, no descontados). */
export async function getCommittedStockBySupply(): Promise<Map<string, number>> {
  const rows = await prisma.orderMaterial.findMany({
    where: {
      deducted: false,
      order: { deliveryStatus: "pending" },
    },
    include: {
      supply: { include: { unit: true } },
    },
  });

  const map = new Map<string, number>();
  for (const row of rows) {
    const gpu = row.supply.unit.gramsPerUnit;
    if (gpu == null || gpu <= 0) continue;
    const qty = row.grams / gpu;
    map.set(row.supplyId, (map.get(row.supplyId) ?? 0) + qty);
  }
  return map;
}
