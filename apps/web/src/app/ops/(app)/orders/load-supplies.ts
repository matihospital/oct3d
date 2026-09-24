import { prisma } from "@oct3d/db";

export async function loadOrderFormSupplies() {
  const supplies = await prisma.supply.findMany({
    include: { brand: true, color: true, unit: true },
    orderBy: { name: "asc" },
  });
  return supplies.map((s) => ({
    id: s.id,
    label: [s.materialType || s.name, s.brand?.name, s.color?.name]
      .filter(Boolean)
      .join(" · "),
    unitCode: s.unit.code,
    gramsPerUnit: s.unit.gramsPerUnit,
    stockQty: s.stockQty,
  }));
}
