/**
 * One-off: fija stock físico actual (gramos) y marca materiales de pedidos
 * ya cargados como descontados (sin volver a restar stock).
 *
 * Uso:
 *   npx tsx --tsconfig apps/web/tsconfig.json apps/web/scripts/set-physical-stock.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@oct3d/db";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), "apps/web/.env.local"));
loadEnvFile(resolve(process.cwd(), "packages/db/.env"));
loadEnvFile(resolve(process.cwd(), ".env"));

type StockRow = {
  brand: string;
  material: string;
  color: string;
  colorHex: string;
  grams: number;
};

/** Stock físico actual en gramos (ya descontado lo consumido por pedidos cargados). */
const PHYSICAL: StockRow[] = [
  { brand: "Ecofila", material: "PLA", color: "Amarillo", colorHex: "#f9a825", grams: 700 },
  { brand: "Ecofila", material: "PLA", color: "Verde", colorHex: "#2e7d32", grams: 500 },
  { brand: "Ecofila", material: "PLA", color: "Celeste", colorHex: "#4fc3f7", grams: 100 },
  { brand: "Ecofila", material: "PLA", color: "Gris", colorHex: "#757575", grams: 100 },
  { brand: "Ecofila", material: "PLA", color: "Blanco", colorHex: "#f5f5f5", grams: 200 },
  // 300 + bobina nueva 1000
  { brand: "Ecofila", material: "PLA", color: "Negro", colorHex: "#1a1a1a", grams: 1300 },
  { brand: "Ecofila", material: "PLA", color: "Marrón", colorHex: "#6d4c41", grams: 1000 },
  { brand: "Ecofila", material: "PLA", color: "Vainilla", colorHex: "#f3e5ab", grams: 700 },
  { brand: "Ecofila", material: "PLA", color: "Marrón claro", colorHex: "#a1887f", grams: 1000 },
  { brand: "Ecofila", material: "PLA", color: "Naranja", colorHex: "#ef6c00", grams: 1000 },
  { brand: "Ecofila", material: "PLA", color: "Violeta", colorHex: "#7b1fa2", grams: 1000 },
  { brand: "Ecofila", material: "PLA", color: "Verde agua", colorHex: "#26a69a", grams: 1000 },
  { brand: "Ecofila", material: "PLA", color: "Rosa", colorHex: "#ec407a", grams: 300 },
  { brand: "Ecofila", material: "PLA", color: "Azul", colorHex: "#1565c0", grams: 600 },
  { brand: "Ecofila", material: "PLA", color: "Azul cobalto", colorHex: "#0047ab", grams: 1000 },
  { brand: "GST", material: "PLA", color: "Azul oscuro", colorHex: "#0d47a1", grams: 700 },
  { brand: "Filar", material: "PLA", color: "Bordo mate", colorHex: "#6d1b2a", grams: 500 },
  { brand: "Printalot", material: "PLA", color: "Dorado", colorHex: "#c9a227", grams: 300 },
];

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function supplyLabel(s: {
  brand?: { name: string } | null;
  materialType: string | null;
  color?: { name: string } | null;
  name: string;
}) {
  return [s.brand?.name, s.materialType, s.color?.name].filter(Boolean).join(" ") || s.name;
}

async function ensureBrand(name: string) {
  const existing = await prisma.brand.findMany();
  const hit = existing.find((b) => norm(b.name) === norm(name));
  if (hit) return hit;
  return prisma.brand.create({ data: { name } });
}

async function ensureColor(name: string, hex: string) {
  const existing = await prisma.color.findMany();
  const hit = existing.find((c) => norm(c.name) === norm(name));
  if (hit) {
    if (hit.hex !== hex) {
      return prisma.color.update({ where: { id: hit.id }, data: { hex } });
    }
    return hit;
  }
  return prisma.color.create({ data: { name, hex } });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no configurada");
  }

  const [units, pricing, allSupplies, pendingMats] = await Promise.all([
    prisma.unitOfMeasure.findMany(),
    prisma.pricingSettings.findUnique({ where: { id: "default" } }),
    prisma.supply.findMany({
      include: { brand: true, color: true, unit: true },
    }),
    prisma.orderMaterial.findMany({
      where: { deducted: false },
      include: {
        supply: { include: { brand: true, color: true } },
        order: { select: { clientName: true, deliveryStatus: true } },
      },
    }),
  ]);

  const unitKg = units.find((u) => u.code === "kg");
  const unitG = units.find((u) => u.code === "g");
  if (!unitKg?.gramsPerUnit) {
    throw new Error("Falta unidad kg con gramsPerUnit");
  }

  const defaultUnitCost = pricing?.plaPricePerKg ?? 19000;

  console.log("--- Insumos actuales ---");
  for (const s of allSupplies) {
    const grams =
      s.unit.gramsPerUnit != null ? s.stockQty * s.unit.gramsPerUnit : null;
    console.log(
      `${supplyLabel(s)} | stock=${s.stockQty} ${s.unit.code}` +
        (grams != null ? ` (~${grams}g)` : ""),
    );
  }

  console.log(`\n--- Materiales pendientes de descontar: ${pendingMats.length} ---`);
  for (const m of pendingMats) {
    console.log(
      `${m.grams}g ${supplyLabel(m.supply)} | pedido=${m.order.clientName ?? "?"} delivery=${m.order.deliveryStatus}`,
    );
  }

  // Marcar pedidos cargados como ya descontados (sin tocar stockQty)
  if (pendingMats.length > 0) {
    const updated = await prisma.orderMaterial.updateMany({
      where: { deducted: false },
      data: { deducted: true },
    });
    console.log(`\nMarcados como deducted: ${updated.count}`);
  } else {
    console.log("\nNo había OrderMaterial pendientes.");
  }

  const results: string[] = [];

  for (const row of PHYSICAL) {
    const brand = await ensureBrand(row.brand);
    const color = await ensureColor(row.color, row.colorHex);

    // Match exacto brand + material + color (normalizado)
    let supply = allSupplies.find(
      (s) =>
        norm(s.brand?.name ?? "") === norm(row.brand) &&
        norm(s.color?.name ?? "") === norm(row.color) &&
        norm(s.materialType ?? "") === norm(row.material),
    );

    // Fallback: nombre del insumo contiene las tres piezas como tokens
    if (!supply) {
      const tokens = [norm(row.brand), norm(row.material), norm(row.color)];
      supply = allSupplies.find((s) => {
        const label = norm(supplyLabel(s) + " " + s.name);
        return tokens.every((t) => {
          // Evitar que "azul" matchee "azul cobalto" / "azul oscuro"
          const re = new RegExp(`(?:^|\\s)${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`);
          return re.test(label);
        });
      });
    }

    const preferUnitId = unitKg.id;
    const gpu = unitKg.gramsPerUnit!;
    const stockQty = row.grams / gpu;

    if (!supply) {
      const name = `${row.brand} ${row.material} ${row.color}`;
      supply = await prisma.supply.create({
        data: {
          name,
          materialType: row.material,
          brandId: brand.id,
          colorId: color.id,
          unitId: preferUnitId,
          unitCost: defaultUnitCost,
          stockQty,
          notes: "Alta por conteo físico",
        },
        include: { brand: true, color: true, unit: true },
      });
      await prisma.stockAdjustment.create({
        data: {
          supplyId: supply.id,
          deltaQty: stockQty,
          reason: "Conteo físico",
          notes: `${row.grams}g — stock inicial`,
        },
      });
      allSupplies.push(supply);
      results.push(`CREADO ${name}: ${stockQty.toFixed(3)} kg (${row.grams}g)`);
      continue;
    }

    // Alinear brand/color/material al catálogo canónico
    const updateData: {
      stockQty: number;
      brandId: string;
      colorId: string;
      materialType: string;
      unitId?: string;
    } = {
      stockQty,
      brandId: brand.id,
      colorId: color.id,
      materialType: row.material,
    };

    // Si la unidad no tiene masa, pasar a kg
    if (supply.unit.gramsPerUnit == null || supply.unit.gramsPerUnit <= 0) {
      updateData.unitId = preferUnitId;
      updateData.stockQty = stockQty;
    } else if (supply.unitId === unitG?.id) {
      // Si está en gramos, stockQty = gramos
      updateData.stockQty = row.grams;
    } else {
      updateData.stockQty = row.grams / supply.unit.gramsPerUnit;
    }

    const prev = supply.stockQty;
    const next = updateData.stockQty;
    const deltaQty = next - prev;

    await prisma.$transaction(async (tx) => {
      if (Math.abs(deltaQty) >= 0.0001) {
        await tx.stockAdjustment.create({
          data: {
            supplyId: supply!.id,
            deltaQty,
            reason: "Conteo físico",
            notes: `${row.grams}g — pedidos previos ya descontados`,
          },
        });
      }
      await tx.supply.update({
        where: { id: supply!.id },
        data: updateData,
      });
    });

    supply.stockQty = next;
    results.push(
      `OK ${supplyLabel(supply)}: ${prev} → ${next} ${supply.unit.code} (${row.grams}g)`,
    );
  }

  console.log("\n--- Resultado ---");
  for (const line of results) console.log(line);

  // Resumen final
  const after = await prisma.supply.findMany({
    include: { brand: true, color: true, unit: true },
    orderBy: { name: "asc" },
  });
  console.log("\n--- Stock final (gramos) ---");
  for (const s of after) {
    if (s.unit.gramsPerUnit == null) continue;
    const g = s.stockQty * s.unit.gramsPerUnit;
    console.log(`${supplyLabel(s)}: ${g}g`);
  }

  const stillPending = await prisma.orderMaterial.count({
    where: { deducted: false },
  });
  console.log(`\nOrderMaterial aún no deducted: ${stillPending}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
