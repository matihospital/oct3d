import { prisma } from "@oct3d/db";
import { fetchMakerWorldModel, parseMakerWorldUrl } from "@/lib/makerworld";

export type CatalogLineInput = {
  link?: string | null;
  unitPrice: number;
  description: string;
};

function canonicalMakerWorldUrl(modelId: number): string {
  return `https://makerworld.com/models/${modelId}`;
}

/** Descripción usable para vitrina a partir de la línea del pedido. */
function showcaseDescription(lineDescription: string, creatorName?: string): string {
  const cleaned = lineDescription
    .replace(/\s*·\s*escala\s+[\d.,]+%\s*/gi, " ")
    .replace(/\s*·\s*\d+(?:[.,]\d+)?\s*×\s*\d+(?:[.,]\d+)?\s*×\s*\d+(?:[.,]\d+)?\s*cm\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (cleaned) return cleaned;
  if (creatorName) return `Diseño de ${creatorName} en MakerWorld.`;
  return "";
}

function manualSourceKey(title: string): string {
  const norm = title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return `manual:${norm || "sin-titulo"}`;
}

async function upsertMakerWorld(
  line: CatalogLineInput,
  options: { countOrder: boolean },
): Promise<void> {
  const link = line.link?.trim();
  if (!link) return;
  const parsed = parseMakerWorldUrl(link);
  if (!parsed) return;

  const unitPrice = Number(line.unitPrice);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return;

  let title = line.description.trim() || `Modelo #${parsed.modelId}`;
  let description = showcaseDescription(line.description);
  let imageUrl = "";
  let makerWorldUrl = canonicalMakerWorldUrl(parsed.modelId);

  try {
    const model = await fetchMakerWorldModel(parsed.modelId, parsed.profileId);
    title = model.title || title;
    imageUrl = model.coverUrl || "";
    makerWorldUrl = model.slug
      ? `https://makerworld.com/models/${model.id}-${model.slug}`
      : canonicalMakerWorldUrl(model.id);
    if (!description) {
      description = showcaseDescription(line.description, model.creatorName);
    }
  } catch {
    if (!description) description = showcaseDescription(line.description);
  }

  const existing = await prisma.catalogArticle.findUnique({
    where: { makerWorldModelId: parsed.modelId },
  });

  if (!existing) {
    await prisma.catalogArticle.create({
      data: {
        makerWorldModelId: parsed.modelId,
        makerWorldUrl,
        title,
        description,
        imageUrl,
        fromPrice: unitPrice,
        published: true,
        timesOrdered: 1,
      },
    });
    return;
  }

  await prisma.catalogArticle.update({
    where: { id: existing.id },
    data: {
      fromPrice: Math.min(existing.fromPrice, unitPrice),
      timesOrdered: options.countOrder
        ? existing.timesOrdered + 1
        : existing.timesOrdered,
      imageUrl: existing.imageUrl || imageUrl,
      makerWorldUrl: existing.makerWorldUrl || makerWorldUrl,
      description: existing.description || description,
    },
  });
}

/** Pieza sin MakerWorld → borrador no publicado para completar en vitrina. */
async function upsertManualDraft(
  line: CatalogLineInput,
  options: { countOrder: boolean },
): Promise<void> {
  const title = line.description.trim();
  if (!title) return;
  const unitPrice = Number(line.unitPrice);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return;

  const sourceKey = manualSourceKey(title);
  const description = showcaseDescription(line.description);

  const existing = await prisma.catalogArticle.findUnique({
    where: { sourceKey },
  });

  if (!existing) {
    await prisma.catalogArticle.create({
      data: {
        sourceKey,
        makerWorldModelId: null,
        makerWorldUrl: "",
        title,
        description,
        imageUrl: "",
        fromPrice: unitPrice,
        published: false,
        timesOrdered: 1,
      },
    });
    return;
  }

  await prisma.catalogArticle.update({
    where: { id: existing.id },
    data: {
      fromPrice: Math.min(existing.fromPrice, unitPrice),
      timesOrdered: options.countOrder
        ? existing.timesOrdered + 1
        : existing.timesOrdered,
      description: existing.description || description,
    },
  });
}

/**
 * Sincroniza artículos de vitrina desde líneas de pedido/presupuesto.
 * Con MakerWorld → publicado.
 * Sin link → borrador oculto solo si includeManualDrafts (pedidos).
 */
export async function syncCatalogArticlesFromLines(
  lines: CatalogLineInput[],
  options: { countOrder?: boolean; includeManualDrafts?: boolean } = {},
) {
  const countOrder = options.countOrder ?? true;
  const includeManualDrafts = options.includeManualDrafts ?? false;
  if (!lines.length) return;

  const mwByModel = new Map<number, CatalogLineInput>();
  const manualByKey = new Map<string, CatalogLineInput>();

  for (const line of lines) {
    const link = line.link?.trim();
    if (link) {
      const parsed = parseMakerWorldUrl(link);
      if (parsed) {
        const prev = mwByModel.get(parsed.modelId);
        if (!prev || line.unitPrice < prev.unitPrice) {
          mwByModel.set(parsed.modelId, line);
        }
        continue;
      }
    }
    if (!includeManualDrafts) continue;
    const title = line.description.trim();
    if (!title) continue;
    const key = manualSourceKey(title);
    const prev = manualByKey.get(key);
    if (!prev || line.unitPrice < prev.unitPrice) {
      manualByKey.set(key, line);
    }
  }

  await Promise.allSettled([
    ...[...mwByModel.values()].map((line) =>
      upsertMakerWorld(line, { countOrder }),
    ),
    ...[...manualByKey.values()].map((line) =>
      upsertManualDraft(line, { countOrder }),
    ),
  ]);
}
