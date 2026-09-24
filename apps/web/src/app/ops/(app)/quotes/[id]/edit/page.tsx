import { prisma } from "@oct3d/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ops/PageHeader";
import { getPricingSettings } from "@/lib/pricing-settings";
import { QuoteForm } from "../../QuoteForm";

export const dynamic = "force-dynamic";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [quote, products, colors, loaded] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: {
        lines: { include: { colors: true } },
      },
    }),
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

  if (!quote) notFound();

  const { longPrintHours: _h, ...pricing } = loaded;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar presupuesto"
        description={quote.clientName || "Sin cliente"}
        breadcrumbs={[
          { label: "Ops", href: "/ops" },
          { label: "Presupuestos", href: "/ops/quotes" },
          { label: quote.clientName || "Detalle", href: `/ops/quotes/${quote.id}` },
          { label: "Editar" },
        ]}
        actions={
          <Link
            href={`/ops/quotes/${quote.id}`}
            className="ops-btn ops-btn-subtle"
            style={{ textDecoration: "none" }}
          >
            Cancelar
          </Link>
        }
      />
      <QuoteForm
        products={products}
        colors={colors}
        pricing={pricing}
        quoteId={quote.id}
        initial={{
          clientName: quote.clientName,
          notes: quote.notes,
          lines: quote.lines.map((line) => ({
            productId: line.productId ?? "",
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            unitCost: line.unitCost,
            link: line.link ?? "",
            colors: line.colors.map((c) => ({
              colorId: c.colorId,
              grams: c.grams,
            })),
          })),
        }}
      />
    </div>
  );
}
