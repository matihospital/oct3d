import { prisma } from "@oct3d/db";
import { OpsNav } from "@/components/ops/OpsNav";
import { OpsCalculatorProvider } from "@/components/ops/OpsCalculatorProvider";
import { getPricingSettings } from "@/lib/pricing-settings";

export const dynamic = "force-dynamic";

export default async function OpsAppLayout({ children }: { children: React.ReactNode }) {
  const [supplies, loaded] = await Promise.all([
    prisma.supply.findMany({
      include: { brand: true, color: true, unit: true },
      orderBy: { name: "asc" },
    }),
    getPricingSettings(),
  ]);

  const { longPrintHours, ...pricing } = loaded;

  const supplyOptions = supplies.map((s) => ({
    id: s.id,
    name: s.name,
    label: [s.materialType || s.name, s.brand?.name, s.color?.name]
      .filter(Boolean)
      .join(" · "),
    unitCost: s.unitCost,
    gramsPerUnit: s.unit.gramsPerUnit,
    unitCode: s.unit.code,
  }));

  return (
    <OpsCalculatorProvider
      supplies={supplyOptions}
      pricing={pricing}
      longPrintHours={longPrintHours}
    >
      <div className="flex min-h-screen flex-col md:flex-row">
        <OpsNav />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </OpsCalculatorProvider>
  );
}
