"use server";

import { prisma } from "@oct3d/db";
import { revalidatePath } from "next/cache";

const MAX_IMAGE_BYTES = 900_000;

async function fileToDataUrl(file: File | null): Promise<string | null> {
  if (!file || file.size <= 0) return null;
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("La imagen supera ~900 KB. Comprimila o usá una URL.");
  }
  const type = file.type || "image/jpeg";
  if (!type.startsWith("image/")) {
    throw new Error("El archivo tiene que ser una imagen");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  return `data:${type};base64,${buf.toString("base64")}`;
}

export async function updateCatalogArticle(id: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const fromPrice = Number(formData.get("fromPrice"));
  const published = formData.get("published") === "on";
  const imageUrlField = String(formData.get("imageUrl") ?? "").trim();
  const clearImage = formData.get("clearImage") === "on";
  const imageFile = formData.get("imageFile");

  if (!title) throw new Error("Título requerido");
  if (!Number.isFinite(fromPrice) || fromPrice < 0) {
    throw new Error("Precio inválido");
  }

  const existing = await prisma.catalogArticle.findUnique({ where: { id } });
  if (!existing) throw new Error("Artículo no encontrado");

  let imageUrl = existing.imageUrl;
  if (clearImage) {
    imageUrl = "";
  }
  if (imageFile instanceof File && imageFile.size > 0) {
    const dataUrl = await fileToDataUrl(imageFile);
    if (dataUrl) imageUrl = dataUrl;
  } else if (imageUrlField) {
    imageUrl = imageUrlField;
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
