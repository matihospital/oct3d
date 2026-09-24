"use server";

import { prisma } from "@oct3d/db";
import { revalidatePath } from "next/cache";

export async function updateCatalogArticle(id: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const fromPrice = Number(formData.get("fromPrice"));
  const published = formData.get("published") === "on";
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();

  if (!title) throw new Error("Título requerido");
  if (!Number.isFinite(fromPrice) || fromPrice < 0) {
    throw new Error("Precio inválido");
  }

  await prisma.catalogArticle.update({
    where: { id },
    data: {
      title,
      description,
      fromPrice,
      published,
      imageUrl,
    },
  });

  revalidatePath("/ops/showcase");
  revalidatePath("/catalogo");
}

export async function deleteCatalogArticle(id: string) {
  await prisma.catalogArticle.delete({ where: { id } });
  revalidatePath("/ops/showcase");
  revalidatePath("/catalogo");
}

export async function toggleCatalogArticlePublished(id: string) {
  const row = await prisma.catalogArticle.findUnique({ where: { id } });
  if (!row) throw new Error("Artículo no encontrado");
  await prisma.catalogArticle.update({
    where: { id },
    data: { published: !row.published },
  });
  revalidatePath("/ops/showcase");
  revalidatePath("/catalogo");
}
