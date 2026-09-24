"use server";

import {
  prisma,
  type DeliveryStatus,
  type OrderStatus,
} from "@oct3d/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { paymentStatusFromPaid } from "@/lib/order-status";
import { syncCatalogArticlesFromLines } from "@/lib/catalog-articles";
import {
  deductOrderMaterials,
  materialCreateData,
  materialsFromLineColors,
  mergeMaterialDrafts,
  type OrderMaterialDraft,
} from "@/lib/order-stock";
import { computeDocumentTotals } from "@/lib/totals";
import type { QuoteLineDraft } from "../quotes/actions";

function parseOptionalDate(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function revalidateOrderPaths(id?: string) {
  revalidatePath("/ops/orders");
  revalidatePath("/ops");
  revalidatePath("/ops/inventory");
  if (id) revalidatePath(`/ops/orders/${id}`);
}

function normalizeLineColors(line: QuoteLineDraft) {
  if (line.colors?.length) {
    const map = new Map<string, number>();
    for (const c of line.colors) {
      if (!c.colorId) continue;
      const grams = Number(c.grams);
      map.set(c.colorId, Number.isFinite(grams) && grams > 0 ? grams : 0);
    }
    return [...map.entries()].map(([colorId, grams]) => ({ colorId, grams }));
  }
  return [...new Set((line.colorIds ?? []).filter(Boolean))].map((colorId) => ({
    colorId,
    grams: 0,
  }));
}

async function resolveOrderMaterials(
  lines: QuoteLineDraft[],
  explicit?: OrderMaterialDraft[],
) {
  const fromColors = await materialsFromLineColors(lines);
  return mergeMaterialDrafts(fromColors, explicit);
}

export async function createOrder(input: {
  clientName?: string;
  notes?: string;
  deliveryDate?: string | null;
  lines: QuoteLineDraft[];
  materials?: OrderMaterialDraft[];
}) {
  if (!input.lines.length) throw new Error("Agregá al menos una línea");
  const totals = computeDocumentTotals(input.lines);
  const resolved = await resolveOrderMaterials(input.lines, input.materials);
  const materials = materialCreateData(resolved);
  const order = await prisma.order.create({
    data: {
      clientName: input.clientName?.trim() || null,
      notes: input.notes?.trim() || null,
      deliveryDate: parseOptionalDate(input.deliveryDate),
      ...totals,
      lines: {
        create: input.lines.map((line) => orderLineCreateData(line)),
      },
      ...(materials ? { materials } : {}),
    },
  });
  await syncCatalogArticlesFromLines(input.lines);
  revalidateOrderPaths(order.id);
  revalidatePath("/catalogo");
  revalidatePath("/ops/showcase");
  redirect(`/ops/orders/${order.id}`);
}

function orderLineCreateData(line: QuoteLineDraft) {
  const colors = normalizeLineColors(line);
  return {
    productId: line.productId || null,
    description: line.description.trim(),
    quantity: Math.max(1, Math.floor(line.quantity)),
    unitPrice: line.unitPrice,
    unitCost: line.unitCost,
    link: line.link?.trim() || null,
    colors:
      colors.length > 0
        ? {
            create: colors.map((c) => ({
              colorId: c.colorId,
              grams: c.grams,
            })),
          }
        : undefined,
  };
}

export async function updateOrder(
  id: string,
  input: {
    clientName?: string;
    notes?: string;
    deliveryDate?: string | null;
    lines: QuoteLineDraft[];
    materials?: OrderMaterialDraft[];
  },
) {
  if (!input.lines.length) throw new Error("Agregá al menos una línea");
  const existing = await prisma.order.findUnique({
    where: { id },
    include: { materials: true },
  });
  if (!existing) throw new Error("Pedido no encontrado");

  const totals = computeDocumentTotals(input.lines);
  const amountPaid = existing.amountPaid;
  const cleanedMaterials = await resolveOrderMaterials(
    input.lines,
    input.materials,
  );

  // No pisar materiales ya descontados: conservar esos y reemplazar solo los pendientes
  const deducted = existing.materials.filter((m) => m.deducted);
  const deductedIds = new Set(deducted.map((m) => m.supplyId));
  const pendingMaterials = cleanedMaterials.filter((m) => !deductedIds.has(m.supplyId));

  await prisma.$transaction(async (tx) => {
    await tx.orderLine.deleteMany({ where: { orderId: id } });
    await tx.orderMaterial.deleteMany({
      where: { orderId: id, deducted: false },
    });
    await tx.order.update({
      where: { id },
      data: {
        clientName: input.clientName?.trim() || null,
        notes: input.notes?.trim() || null,
        deliveryDate: parseOptionalDate(input.deliveryDate),
        ...totals,
        paymentStatus: paymentStatusFromPaid(totals.totalPrice, amountPaid),
        lines: {
          create: input.lines.map((line) => orderLineCreateData(line)),
        },
        materials:
          pendingMaterials.length > 0
            ? {
                create: pendingMaterials.map((m) => ({
                  supplyId: m.supplyId,
                  grams: m.grams,
                  deducted: false,
                })),
              }
            : undefined,
      },
    });
  });

  await syncCatalogArticlesFromLines(input.lines, { countOrder: false });
  revalidateOrderPaths(id);
  revalidatePath("/catalogo");
  revalidatePath("/ops/showcase");
  redirect(`/ops/orders/${id}`);
}

/** Suma líneas a un pedido aún no entregado (sin reemplazar las existentes). */
export async function addOrderLines(id: string, lines: QuoteLineDraft[]) {
  const cleaned = lines
    .map((l) => ({
      ...l,
      description: l.description.trim(),
      quantity: Math.max(1, Math.floor(l.quantity || 1)),
      productId: l.productId || null,
      link: l.link?.trim() || null,
      colors: (l.colors ?? []).filter((c) => c.colorId),
    }))
    .filter((l) => l.description);
  if (!cleaned.length) throw new Error("Agregá al menos una línea con descripción");

  const existing = await prisma.order.findUnique({
    where: { id },
    include: {
      materials: true,
    },
  });
  if (!existing) throw new Error("Pedido no encontrado");
  if (existing.status === "cancelled") {
    throw new Error("No se pueden agregar líneas a un pedido cancelado");
  }
  if (existing.deliveryStatus === "delivered") {
    throw new Error("No se pueden agregar líneas a un pedido ya entregado");
  }

  const fromColors = await materialsFromLineColors(cleaned);
  const amountPaid = existing.amountPaid;
  const pendingBySupply = new Map(
    existing.materials.filter((m) => !m.deducted).map((m) => [m.supplyId, m]),
  );

  await prisma.$transaction(async (tx) => {
    for (const line of cleaned) {
      await tx.orderLine.create({
        data: { orderId: id, ...orderLineCreateData(line) },
      });
    }

    for (const draft of fromColors) {
      const pending = pendingBySupply.get(draft.supplyId);
      if (pending) {
        const nextGrams = pending.grams + draft.grams;
        await tx.orderMaterial.update({
          where: { id: pending.id },
          data: { grams: nextGrams },
        });
        pending.grams = nextGrams;
      } else {
        const created = await tx.orderMaterial.create({
          data: {
            orderId: id,
            supplyId: draft.supplyId,
            grams: draft.grams,
            deducted: false,
          },
        });
        pendingBySupply.set(draft.supplyId, created);
      }
    }

    const allLines = await tx.orderLine.findMany({ where: { orderId: id } });
    const totals = computeDocumentTotals(allLines);
    await tx.order.update({
      where: { id },
      data: {
        ...totals,
        paymentStatus: paymentStatusFromPaid(totals.totalPrice, amountPaid),
      },
    });
  });

  await syncCatalogArticlesFromLines(cleaned, { countOrder: false });
  revalidateOrderPaths(id);
  revalidatePath("/catalogo");
  revalidatePath("/ops/showcase");
  redirect(`/ops/orders/${id}`);
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  await prisma.order.update({ where: { id }, data: { status } });
  revalidatePath("/ops/orders");
  revalidatePath(`/ops/orders/${id}`);
  revalidatePath("/ops");
}

export async function updateOrderDelivery(
  id: string,
  formData: FormData,
) {
  const deliveryStatus = String(formData.get("deliveryStatus") ?? "") as DeliveryStatus;
  const deliveryDateRaw = String(formData.get("deliveryDate") ?? "").trim();
  if (deliveryStatus !== "pending" && deliveryStatus !== "delivered") {
    throw new Error("Estado de entrega inválido");
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        deliveryStatus,
        deliveryDate: parseOptionalDate(deliveryDateRaw),
      },
    });
    if (deliveryStatus === "delivered") {
      await deductOrderMaterials(id, tx);
    }
  });

  revalidateOrderPaths(id);
}

export async function markOrderDelivered(id: string) {
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { deliveryStatus: "delivered" },
    });
    await deductOrderMaterials(id, tx);
  });
  revalidateOrderPaths(id);
}

export async function markOrderUndelivered(id: string) {
  await prisma.order.update({
    where: { id },
    data: { deliveryStatus: "pending" },
  });
  revalidateOrderPaths(id);
}

export async function addOrderPayment(orderId: string, formData: FormData) {
  const amount = Number(formData.get("amount"));
  const method = String(formData.get("method") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const paidAtRaw = String(formData.get("paidAt") ?? "").trim();
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Monto inválido");
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Pedido no encontrado");

  const paidAt = parseOptionalDate(paidAtRaw) ?? new Date();

  await prisma.$transaction(async (tx) => {
    await tx.orderPayment.create({
      data: {
        orderId,
        amount,
        method,
        notes,
        paidAt,
      },
    });
    const amountPaid = order.amountPaid + amount;
    await tx.order.update({
      where: { id: orderId },
      data: {
        amountPaid,
        paymentStatus: paymentStatusFromPaid(order.totalPrice, amountPaid),
      },
    });
  });

  revalidatePath("/ops/orders");
  revalidatePath(`/ops/orders/${orderId}`);
  revalidatePath("/ops");
}

export async function deleteOrderPayment(orderId: string, paymentId: string) {
  const payment = await prisma.orderPayment.findFirst({
    where: { id: paymentId, orderId },
  });
  if (!payment) throw new Error("Pago no encontrado");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Pedido no encontrado");

  await prisma.$transaction(async (tx) => {
    await tx.orderPayment.delete({ where: { id: paymentId } });
    const amountPaid = Math.max(0, order.amountPaid - payment.amount);
    await tx.order.update({
      where: { id: orderId },
      data: {
        amountPaid,
        paymentStatus: paymentStatusFromPaid(order.totalPrice, amountPaid),
      },
    });
  });

  revalidatePath("/ops/orders");
  revalidatePath(`/ops/orders/${orderId}`);
  revalidatePath("/ops");
}

export async function markOrderFullyPaid(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Pedido no encontrado");
  const remaining = Math.max(0, order.totalPrice - order.amountPaid);
  if (remaining <= 0.009) {
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: "paid" },
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.orderPayment.create({
        data: {
          orderId,
          amount: remaining,
          method: "ajuste",
          notes: "Marcado como cobrado",
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          amountPaid: order.totalPrice,
          paymentStatus: "paid",
        },
      });
    });
  }
  revalidatePath("/ops/orders");
  revalidatePath(`/ops/orders/${orderId}`);
  revalidatePath("/ops");
}

export async function deleteOrder(id: string) {
  await prisma.order.delete({ where: { id } });
  revalidatePath("/ops/orders");
  revalidatePath("/ops");
  redirect("/ops/orders");
}
