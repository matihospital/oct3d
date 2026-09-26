import { prisma, type Prisma } from "@oct3d/db";
import type { LineColorUsage } from "@/lib/line-colors";

export type OrderMaterialDraft = {
  supplyId: string;
  /** Gramos (insumos con masa). */
  grams?: number;
  /** Cantidad en unidad de compra (insumos sin masa). */
  quantity?: number;
};

type NormalizedMaterial = {
  supplyId: string;
  grams: number;
  quantity: number;
};

export function normalizeMaterialDrafts(
  materials: OrderMaterialDraft[] | undefined,
): NormalizedMaterial[] {
  if (!materials?.length) return [];
  const bySupply = new Map<string, { grams: number; quantity: number }>();
  for (const m of materials) {
    const supplyId = m.supplyId?.trim();
    if (!supplyId) continue;
    const grams = Number(m.grams);
    const quantity = Number(m.quantity);
    const g = Number.isFinite(grams) && grams > 0 ? grams : 0;
    const q = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
    if (g <= 0 && q <= 0) continue;
    const prev = bySupply.get(supplyId) ?? { grams: 0, quantity: 0 };
    bySupply.set(supplyId, {
      grams: prev.grams + g,
      quantity: prev.quantity + q,
    });
  }
  return [...bySupply.entries()].map(([supplyId, v]) => ({
    supplyId,
    grams: v.grams,
    quantity: v.quantity,
  }));
}

export function materialCreateData(materials: OrderMaterialDraft[]) {
  const cleaned = normalizeMaterialDrafts(materials);
  if (!cleaned.length) return undefined;
  return {
    create: cleaned.map((m) => ({
      supplyId: m.supplyId,
      grams: m.grams,
      quantity: m.quantity,
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

function materialStockDelta(mat: {
  grams: number;
  quantity: number;
  supply: { unit: { gramsPerUnit: number | null } };
}): number | null {
  const gpu = mat.supply.unit.gramsPerUnit;
  if (gpu != null && gpu > 0) {
    if (!(mat.grams > 0)) return null;
    return -(mat.grams / gpu);
  }
  if (!(mat.quantity > 0)) return null;
  return -mat.quantity;
}

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
    const deltaQty = materialStockDelta(mat);
    if (deltaQty == null) continue;

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
    let qty = 0;
    if (gpu != null && gpu > 0) {
      if (row.grams > 0) qty = row.grams / gpu;
    } else if (row.quantity > 0) {
      qty = row.quantity;
    } else {
      continue;
    }
    map.set(row.supplyId, (map.get(row.supplyId) ?? 0) + qty);
  }
  return map;
}
