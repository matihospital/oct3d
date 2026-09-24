import { prisma } from "@oct3d/db";
import { PageHeader } from "@/components/ops/PageHeader";
import { getPricingSettings } from "@/lib/pricing-settings";
import { QuoteForm } from "../QuoteForm";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  const [products, colors, loaded] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        salePrice: true,
        costEstimate: true,
        makerWorldUrl: true,
      },
    }),
    prisma.color.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, hex: true },
    }),
    getPricingSettings(),
  ]);

  const { longPrintHours: _h, ...pricing } = loaded;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo presupuesto"
        description="1) Datos del cliente · 2) Opcional: traer piezas de MakerWorld · 3) Revisar ítems, colores, precios y costos · 4) Guardar."
        breadcrumbs={[
          { label: "Ops", href: "/ops" },
          { label: "Presupuestos", href: "/ops/quotes" },
          { label: "Nuevo" },
        ]}
      />
      <QuoteForm products={products} colors={colors} pricing={pricing} />
    </div>
  );
}
