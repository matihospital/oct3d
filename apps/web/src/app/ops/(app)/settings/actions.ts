"use server";

import { prisma } from "@oct3d/db";
import { serializeTiers, type StoredPricingTier } from "@oct3d/pricing";
import { revalidatePath } from "next/cache";
import { ensurePricingSettings } from "@/lib/pricing-settings";

function num(formData: FormData, key: string) {
  const n = Number(formData.get(key));
  if (!Number.isFinite(n)) throw new Error(`Valor inválido: ${key}`);
  return n;
}

export async function updatePricingSettings(formData: FormData) {
  await ensurePricingSettings();

  const tierCount = Number(formData.get("tierCount") ?? 0);
  const tiers: StoredPricingTier[] = [];
  for (let i = 0; i < tierCount; i++) {
    const maxRaw = String(formData.get(`tierMax_${i}`) ?? "").trim();
    const maxCost = maxRaw === "" || maxRaw === "inf" ? null : Number(maxRaw);
    if (maxCost !== null && !Number.isFinite(maxCost)) {
      throw new Error(`Tope de costo inválido en tramo ${i + 1}`);
    }
    tiers.push({
      maxCost,
      retailMultiplier: num(formData, `tierRetail_${i}`),
      wholesaleMultiplier: num(formData, `tierWholesale_${i}`),
      bulkMultiplier: num(formData, `tierBulk_${i}`),
    });
  }
  if (tiers.length === 0) throw new Error("Agregá al menos un tramo de margen");

  // Último tramo sin tope si no lo dejaron vacío
  if (tiers[tiers.length - 1].maxCost != null) {
    tiers[tiers.length - 1].maxCost = null;
  }

  await prisma.pricingSettings.update({
    where: { id: "default" },
    data: {
      kwhPrice: num(formData, "kwhPrice"),
      printerWatts: num(formData, "printerWatts"),
      plaPricePerKg: num(formData, "plaPricePerKg"),
      minRetailPrice: num(formData, "minRetailPrice"),
      minWholesalePrice: num(formData, "minWholesalePrice"),
      minBulkPrice: num(formData, "minBulkPrice"),
      bulkQuantity: Math.max(1, Math.floor(num(formData, "bulkQuantity"))),
      bulkMaxRetailPrice: num(formData, "bulkMaxRetailPrice"),
      longPrintHours: num(formData, "longPrintHours"),
      tiers,
    },
  });

  revalidatePath("/");
  revalidatePath("/ops/settings");
  revalidatePath("/ops/quotes");
}

export async function resetPricingSettings() {
  const { DEFAULT_PRICING, LONG_PRINT_HOURS } = await import("@oct3d/pricing");
  await ensurePricingSettings();
  await prisma.pricingSettings.update({
    where: { id: "default" },
    data: {
      ...DEFAULT_PRICING,
      longPrintHours: LONG_PRINT_HOURS,
      tiers: serializeTiers(DEFAULT_PRICING.tiers),
    },
  });
  revalidatePath("/");
  revalidatePath("/ops/settings");
}
