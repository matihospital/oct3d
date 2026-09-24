"use server";

import { prisma, type QuoteStatus } from "@oct3d/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { syncCatalogArticlesFromLines } from "@/lib/catalog-articles";
import type { LineColorUsage } from "@/lib/line-colors";
import {
  materialCreateData,
  materialsFromLineColors,
} from "@/lib/order-stock";
import { computeDocumentTotals } from "@/lib/totals";

export type QuoteLineDraft = {
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  link?: string | null;
  /** @deprecated usar colors */
  colorIds?: string[];
  colors?: LineColorUsage[];
};

function normalizeLineColors(line: QuoteLineDraft): LineColorUsage[] {
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

function lineCreateData(line: QuoteLineDraft) {
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

export async function createQuote(input: {
  clientName?: string;
  notes?: string;
  referenceLinks: string[];
  lines: QuoteLineDraft[];
}) {
  if (!input.lines.length) throw new Error("Agregá al menos una línea");
  const totals = computeDocumentTotals(input.lines);
  const quote = await prisma.quote.create({
    data: {
      clientName: input.clientName?.trim() || null,
      notes: input.notes?.trim() || null,
      referenceLinks: input.referenceLinks.filter(Boolean),
      ...totals,
      lines: {
        create: input.lines.map((line) => lineCreateData(line)),
      },
    },
  });
  revalidatePath("/ops/quotes");
  redirect(`/ops/quotes/${quote.id}`);
}

export async function updateQuote(
  id: string,
  input: {
    clientName?: string;
    notes?: string;
    referenceLinks?: string[];
    lines: QuoteLineDraft[];
  },
) {
  if (!input.lines.length) throw new Error("Agregá al menos una línea");
  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing) throw new Error("Presupuesto no encontrado");

  const totals = computeDocumentTotals(input.lines);

  await prisma.$transaction(async (tx) => {
    await tx.quoteLine.deleteMany({ where: { quoteId: id } });
    await tx.quote.update({
      where: { id },
      data: {
        clientName: input.clientName?.trim() || null,
        notes: input.notes?.trim() || null,
        referenceLinks: (input.referenceLinks ?? existing.referenceLinks).filter(Boolean),
        ...totals,
        lines: {
          create: input.lines.map((line) => lineCreateData(line)),
        },
      },
    });
  });

  revalidatePath("/ops/quotes");
  revalidatePath(`/ops/quotes/${id}`);
  revalidatePath("/ops");
  redirect(`/ops/quotes/${id}`);
}

/** Guarda presupuesto y lo convierte en pedido en un solo paso. */
export async function createQuoteAsOrder(input: {
  clientName?: string;
  notes?: string;
  referenceLinks: string[];
  deliveryDate?: string | null;
  lines: QuoteLineDraft[];
}) {
  if (!input.lines.length) throw new Error("Agregá al menos una línea");
  const totals = computeDocumentTotals(input.lines);
  const deliveryDate = input.deliveryDate?.trim()
    ? new Date(input.deliveryDate)
    : null;
  if (input.deliveryDate?.trim() && Number.isNaN(deliveryDate?.getTime())) {
    throw new Error("Fecha de entrega inválida");
  }

  const fromColors = await materialsFromLineColors(
    input.lines.map((l) => ({ colors: normalizeLineColors(l) })),
  );
  const materials = materialCreateData(fromColors);

  const order = await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.create({
      data: {
        clientName: input.clientName?.trim() || null,
        notes: input.notes?.trim() || null,
        referenceLinks: input.referenceLinks.filter(Boolean),
        status: "accepted",
        ...totals,
        lines: {
          create: input.lines.map((line) => lineCreateData(line)),
        },
      },
      include: { lines: { include: { colors: true } } },
    });

    return tx.order.create({
      data: {
        clientName: quote.clientName,
        notes: quote.notes,
        quoteId: quote.id,
        deliveryDate,
        totalCost: quote.totalCost,
        totalPrice: quote.totalPrice,
        marginAmount: quote.marginAmount,
        marginPercent: quote.marginPercent,
        lines: {
          create: quote.lines.map((line) => ({
            productId: line.productId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            unitCost: line.unitCost,
            link: line.link,
            colors:
              line.colors.length > 0
                ? {
                    create: line.colors.map((c) => ({
                      colorId: c.colorId,
                      grams: c.grams,
                    })),
                  }
                : undefined,
          })),
        },
        ...(materials ? { materials } : {}),
      },
    });
  });

  await syncCatalogArticlesFromLines(input.lines);
  revalidatePath("/ops/orders");
  revalidatePath("/ops/quotes");
  revalidatePath("/ops");
  revalidatePath("/catalogo");
  revalidatePath("/ops/showcase");
  redirect(`/ops/orders/${order.id}`);
}

export async function updateQuoteStatus(id: string, status: QuoteStatus) {
  await prisma.quote.update({ where: { id }, data: { status } });
  revalidatePath("/ops/quotes");
  revalidatePath(`/ops/quotes/${id}`);
}

export async function deleteQuote(id: string) {
  await prisma.quote.delete({ where: { id } });
  revalidatePath("/ops/quotes");
  redirect("/ops/quotes");
}

export async function convertQuoteToOrder(quoteId: string, formData?: FormData) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: { include: { colors: true } } },
  });
  if (!quote) throw new Error("Presupuesto no encontrado");

  const deliveryDateRaw = formData
    ? String(formData.get("deliveryDate") ?? "").trim()
    : "";
  const deliveryDate = deliveryDateRaw ? new Date(deliveryDateRaw) : null;
  if (deliveryDateRaw && Number.isNaN(deliveryDate?.getTime())) {
    throw new Error("Fecha de entrega inválida");
  }

  const fromColors = await materialsFromLineColors(
    quote.lines.map((line) => ({
      colors: line.colors.map((c) => ({ colorId: c.colorId, grams: c.grams })),
    })),
  );
  const materials = materialCreateData(fromColors);

  const order = await prisma.order.create({
    data: {
      clientName: quote.clientName,
      notes: quote.notes,
      quoteId: quote.id,
      deliveryDate,
      totalCost: quote.totalCost,
      totalPrice: quote.totalPrice,
      marginAmount: quote.marginAmount,
      marginPercent: quote.marginPercent,
      lines: {
        create: quote.lines.map((line) => ({
          productId: line.productId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitCost: line.unitCost,
          link: line.link,
          colors:
            line.colors.length > 0
              ? {
                  create: line.colors.map((c) => ({
                    colorId: c.colorId,
                    grams: c.grams,
                  })),
                }
              : undefined,
        })),
      },
      ...(materials ? { materials } : {}),
    },
  });

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "accepted" },
  });

  await syncCatalogArticlesFromLines(
    quote.lines.map((line) => ({
      link: line.link,
      unitPrice: line.unitPrice,
      description: line.description,
    })),
  );

  revalidatePath("/ops/orders");
  revalidatePath("/ops/quotes");
  revalidatePath("/ops");
  revalidatePath("/catalogo");
  revalidatePath("/ops/showcase");
  redirect(`/ops/orders/${order.id}`);
}
