"use server";

import { prisma } from "@oct3d/db";
import { revalidatePath } from "next/cache";

function revalidateInventory() {
  revalidatePath("/ops/inventory");
  revalidatePath("/ops/catalog");
  revalidatePath("/ops");
}

export async function registerPurchase(formData: FormData) {
  const supplyId = String(formData.get("supplyId") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const unitCost = Number(formData.get("unitCost"));
  const supplier = String(formData.get("supplier") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const purchasedAtRaw = String(formData.get("purchasedAt") ?? "").trim();
  const updateUnitCost = formData.get("updateUnitCost") === "on";

  if (!supplyId || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Cantidad inválida");
  }
  if (!Number.isFinite(unitCost) || unitCost < 0) {
    throw new Error("Costo inválido");
  }

  const supply = await prisma.supply.findUnique({ where: { id: supplyId } });
  if (!supply) throw new Error("Insumo no encontrado");

  const purchasedAt = purchasedAtRaw
    ? new Date(purchasedAtRaw)
    : new Date();
  if (Number.isNaN(purchasedAt.getTime())) {
    throw new Error("Fecha inválida");
  }

  const totalCost = quantity * unitCost;

  await prisma.$transaction(async (tx) => {
    await tx.supplyPurchase.create({
      data: {
        supplyId,
        quantity,
        unitCost,
        totalCost,
        supplier,
        notes,
        purchasedAt,
      },
    });
    await tx.supply.update({
      where: { id: supplyId },
      data: {
        stockQty: supply.stockQty + quantity,
        ...(updateUnitCost ? { unitCost } : {}),
      },
    });
  });

  revalidateInventory();
}

export async function registerStockAdjustment(formData: FormData) {
  const supplyId = String(formData.get("supplyId") ?? "").trim();
  const deltaQty = Number(formData.get("deltaQty"));
  const reason = String(formData.get("reason") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!supplyId || !Number.isFinite(deltaQty) || deltaQty === 0) {
    throw new Error("Cantidad de ajuste inválida");
  }
  if (!reason) throw new Error("Indicá el motivo del ajuste");

  const supply = await prisma.supply.findUnique({ where: { id: supplyId } });
  if (!supply) throw new Error("Insumo no encontrado");

  const nextStock = supply.stockQty + deltaQty;
  if (nextStock < -0.0001) {
    throw new Error("El stock no puede quedar negativo");
  }

  await prisma.$transaction(async (tx) => {
    await tx.stockAdjustment.create({
      data: { supplyId, deltaQty, reason, notes },
    });
    await tx.supply.update({
      where: { id: supplyId },
      data: { stockQty: Math.max(0, nextStock) },
    });
  });

  revalidateInventory();
}

export async function setSupplyStock(formData: FormData) {
  const supplyId = String(formData.get("supplyId") ?? "").trim();
  const stockQty = Number(formData.get("stockQty"));
  const reason = String(formData.get("reason") ?? "").trim() || "Conteo físico";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!supplyId || !Number.isFinite(stockQty) || stockQty < 0) {
    throw new Error("Stock inválido");
  }

  const supply = await prisma.supply.findUnique({ where: { id: supplyId } });
  if (!supply) throw new Error("Insumo no encontrado");

  const deltaQty = stockQty - supply.stockQty;
  if (Math.abs(deltaQty) < 0.0001) return;

  await prisma.$transaction(async (tx) => {
    await tx.stockAdjustment.create({
      data: {
        supplyId,
        deltaQty,
        reason,
        notes,
      },
    });
    await tx.supply.update({
      where: { id: supplyId },
      data: { stockQty },
    });
  });

  revalidateInventory();
}
