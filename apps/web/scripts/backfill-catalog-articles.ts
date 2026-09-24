/**
 * One-off: crea artículos de vitrina desde líneas de pedido con link MakerWorld.
 * Uso: npx tsx --tsconfig apps/web/tsconfig.json apps/web/scripts/backfill-catalog-articles.ts
 */
import { prisma } from "@oct3d/db";
import {
  fetchMakerWorldModel,
  parseMakerWorldUrl,
} from "../src/lib/makerworld";

function canonicalMakerWorldUrl(modelId: number): string {
  return `https://makerworld.com/models/${modelId}`;
}

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

type Agg = {
  modelId: number;
  link: string;
  description: string;
  fromPrice: number;
  timesOrdered: number;
};

async function main() {
  const lines = await prisma.orderLine.findMany({
    where: {
      link: { not: null },
      NOT: { link: "" },
    },
    select: {
      link: true,
      unitPrice: true,
      description: true,
      orderId: true,
    },
  });

  console.log(`Líneas con link: ${lines.length}`);

  const byModel = new Map<number, Agg>();
  let skipped = 0;

  for (const line of lines) {
    const link = line.link?.trim();
    if (!link) {
      skipped += 1;
      continue;
    }
    const parsed = parseMakerWorldUrl(link);
    if (!parsed) {
      console.warn(`  Link no válido: ${link}`);
      skipped += 1;
      continue;
    }

    const prev = byModel.get(parsed.modelId);
    if (!prev) {
      byModel.set(parsed.modelId, {
        modelId: parsed.modelId,
        link,
        description: line.description,
        fromPrice: line.unitPrice,
        timesOrdered: 1,
      });
    } else {
      prev.timesOrdered += 1;
      if (line.unitPrice < prev.fromPrice) {
        prev.fromPrice = line.unitPrice;
        prev.description = line.description;
        prev.link = link;
      }
    }
  }

  console.log(`Modelos únicos MakerWorld: ${byModel.size}`);

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const agg of byModel.values()) {
    const parsed = parseMakerWorldUrl(agg.link)!;
    let title = agg.description.trim() || `Modelo #${agg.modelId}`;
    let description = showcaseDescription(agg.description);
    let imageUrl = "";
    let makerWorldUrl = canonicalMakerWorldUrl(agg.modelId);

    try {
      const model = await fetchMakerWorldModel(parsed.modelId, parsed.profileId);
      title = model.title || title;
      imageUrl = model.coverUrl || "";
      makerWorldUrl = model.slug
        ? `https://makerworld.com/models/${model.id}-${model.slug}`
        : canonicalMakerWorldUrl(model.id);
      if (!description) {
        description = showcaseDescription(agg.description, model.creatorName);
      }
      console.log(`  OK #${agg.modelId} — ${title}`);
    } catch (err) {
      console.warn(
        `  MW falló #${agg.modelId}: ${err instanceof Error ? err.message : err}`,
      );
    }

    try {
      const existing = await prisma.catalogArticle.findUnique({
        where: { makerWorldModelId: agg.modelId },
      });

      if (!existing) {
        await prisma.catalogArticle.create({
          data: {
            makerWorldModelId: agg.modelId,
            makerWorldUrl,
            title,
            description,
            imageUrl,
            fromPrice: agg.fromPrice,
            published: true,
            timesOrdered: agg.timesOrdered,
          },
        });
        created += 1;
      } else {
        await prisma.catalogArticle.update({
          where: { id: existing.id },
          data: {
            fromPrice: Math.min(existing.fromPrice, agg.fromPrice),
            timesOrdered: Math.max(existing.timesOrdered, agg.timesOrdered),
            imageUrl: existing.imageUrl || imageUrl,
            makerWorldUrl: existing.makerWorldUrl || makerWorldUrl,
            description: existing.description || description,
            title: existing.title || title,
          },
        });
        updated += 1;
      }
    } catch (err) {
      failed += 1;
      console.error(`  DB error #${agg.modelId}:`, err);
    }
  }

  const total = await prisma.catalogArticle.count();
  console.log(
    `\nListo. Creados: ${created}, actualizados: ${updated}, fallidos: ${failed}, omitidos: ${skipped}. Total en vitrina: ${total}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
