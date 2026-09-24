import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_PRICING, LONG_PRINT_HOURS, serializeTiers } from "@oct3d/pricing";

const prisma = new PrismaClient();

const UNITS = [
  { code: "kg", name: "Kilogramo", gramsPerUnit: 1000 },
  { code: "g", name: "Gramo", gramsPerUnit: 1 },
  { code: "u", name: "Unidad", gramsPerUnit: null },
  { code: "m", name: "Metro", gramsPerUnit: null },
] as const;

async function main() {
  for (const unit of UNITS) {
    await prisma.unitOfMeasure.upsert({
      where: { code: unit.code },
      update: { name: unit.name, gramsPerUnit: unit.gramsPerUnit },
      create: {
        code: unit.code,
        name: unit.name,
        gramsPerUnit: unit.gramsPerUnit,
      },
    });
  }
  console.log("Unidades de medida listas:", UNITS.map((u) => u.code).join(", "));

  const COLORS = [
    { name: "Negro", hex: "#1a1a1a" },
    { name: "Blanco", hex: "#f5f5f5" },
    { name: "Rojo", hex: "#c62828" },
    { name: "Azul", hex: "#1565c0" },
    { name: "Verde", hex: "#2e7d32" },
    { name: "Amarillo", hex: "#f9a825" },
    { name: "Naranja", hex: "#ef6c00" },
    { name: "Gris", hex: "#757575" },
    { name: "Natural", hex: "#e8dcc8" },
  ] as const;

  for (const color of COLORS) {
    await prisma.color.upsert({
      where: { name: color.name },
      update: { hex: color.hex },
      create: { name: color.name, hex: color.hex },
    });
  }
  console.log("Colores listos:", COLORS.map((c) => c.name).join(", "));

  await prisma.pricingSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      kwhPrice: DEFAULT_PRICING.kwhPrice,
      printerWatts: DEFAULT_PRICING.printerWatts,
      plaPricePerKg: DEFAULT_PRICING.plaPricePerKg,
      minRetailPrice: DEFAULT_PRICING.minRetailPrice,
      minWholesalePrice: DEFAULT_PRICING.minWholesalePrice,
      minBulkPrice: DEFAULT_PRICING.minBulkPrice,
      bulkQuantity: DEFAULT_PRICING.bulkQuantity,
      bulkMaxRetailPrice: DEFAULT_PRICING.bulkMaxRetailPrice,
      longPrintHours: LONG_PRINT_HOURS,
      tiers: serializeTiers(DEFAULT_PRICING.tiers),
    },
  });
  console.log("Parámetros de pricing listos");

  const email = process.env.ADMIN_EMAIL ?? "admin@oct3d.local";
  const password = process.env.ADMIN_PASSWORD ?? "oct3d-admin";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name: "Admin" },
    create: { email, passwordHash, name: "Admin" },
  });

  console.log(`Admin listo: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
