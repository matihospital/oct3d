"use server";

import { prisma } from "@oct3d/db";
import { revalidatePath } from "next/cache";

export async function createBrand(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nombre requerido");
  await prisma.brand.create({ data: { name } });
  revalidatePath("/ops/catalog");
}

export async function deleteBrand(id: string) {
  await prisma.brand.delete({ where: { id } });
  revalidatePath("/ops/catalog");
}

export async function createColor(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const hex = normalizeHexInput(String(formData.get("hex") ?? ""));
  if (!name) throw new Error("Nombre requerido");
  await prisma.color.create({ data: { name, hex } });
  revalidatePath("/ops/catalog");
  revalidatePath("/ops");
}

export async function updateColor(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const hex = normalizeHexInput(String(formData.get("hex") ?? ""));
  if (!name) throw new Error("Nombre requerido");
  await prisma.color.update({ where: { id }, data: { name, hex } });
  revalidatePath("/ops/catalog");
  revalidatePath("/ops");
}

export async function deleteColor(id: string) {
  await prisma.color.delete({ where: { id } });
  revalidatePath("/ops/catalog");
  revalidatePath("/ops");
}

function normalizeHexInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(withHash)) {
    throw new Error("Hex inválido. Usá #RRGGBB");
  }
  return withHash.toLowerCase();
}

export async function createUnit(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const gramsRaw = String(formData.get("gramsPerUnit") ?? "").trim();
  const gramsPerUnit = gramsRaw === "" ? null : Number(gramsRaw);
  if (!code || !name) throw new Error("Código y nombre requeridos");
  if (gramsPerUnit !== null && (!Number.isFinite(gramsPerUnit) || gramsPerUnit <= 0)) {
    throw new Error("Gramos por unidad inválidos");
  }
  await prisma.unitOfMeasure.create({
    data: { code, name, gramsPerUnit },
  });
  revalidatePath("/ops/catalog");
}

export async function deleteUnit(id: string) {
  await prisma.unitOfMeasure.delete({ where: { id } });
  revalidatePath("/ops/catalog");
}

export async function createSupply(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const materialType = String(formData.get("materialType") ?? "").trim() || null;
  const colorId = String(formData.get("colorId") ?? "").trim() || null;
  const unitId = String(formData.get("unitId") ?? "").trim();
  const unitCost = Number(formData.get("unitCost"));
  const brandId = String(formData.get("brandId") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const stockRaw = String(formData.get("stockQty") ?? "").trim();
  const stockQty = stockRaw === "" ? 0 : Number(stockRaw);
  if (!name || !unitId || !Number.isFinite(unitCost)) {
    throw new Error("Datos inválidos");
  }
  if (!Number.isFinite(stockQty) || stockQty < 0) {
    throw new Error("Stock inicial inválido");
  }
  await prisma.supply.create({
    data: {
      name,
      materialType,
      colorId,
      unitId,
      unitCost,
      brandId,
      notes,
      stockQty,
    },
  });
  revalidatePath("/ops/catalog");
  revalidatePath("/ops/inventory");
}

export async function deleteSupply(id: string) {
  await prisma.supply.delete({ where: { id } });
  revalidatePath("/ops/catalog");
}

export async function createProduct(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const salePrice = Number(formData.get("salePrice"));
  const costRaw = formData.get("costEstimate");
  const costEstimate =
    costRaw === null || String(costRaw).trim() === ""
      ? null
      : Number(costRaw);
  const brandId = String(formData.get("brandId") ?? "") || null;
  const makerWorldUrl = String(formData.get("makerWorldUrl") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!name || !Number.isFinite(salePrice)) throw new Error("Datos inválidos");
  await prisma.product.create({
    data: {
      name,
      salePrice,
      costEstimate:
        costEstimate !== null && Number.isFinite(costEstimate) ? costEstimate : null,
      brandId,
      makerWorldUrl,
      notes,
    },
  });
  revalidatePath("/ops/catalog");
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id } });
  revalidatePath("/ops/catalog");
}
