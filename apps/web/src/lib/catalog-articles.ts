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

async function upsertOne(
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

/** Sincroniza artículos públicos desde líneas con link MakerWorld (sin duplicar modelos). */
export async function syncCatalogArticlesFromLines(
  lines: CatalogLineInput[],
  options: { countOrder?: boolean } = {},
) {
  const countOrder = options.countOrder ?? true;
  const withLinks = lines.filter((l) => l.link?.trim());
  if (!withLinks.length) return;

  const byModel = new Map<number, CatalogLineInput>();
  for (const line of withLinks) {
    const parsed = parseMakerWorldUrl(line.link!.trim());
    if (!parsed) continue;
    const prev = byModel.get(parsed.modelId);
    if (!prev || line.unitPrice < prev.unitPrice) {
      byModel.set(parsed.modelId, line);
    }
  }

  await Promise.allSettled(
    [...byModel.values()].map((line) => upsertOne(line, { countOrder })),
  );
}
