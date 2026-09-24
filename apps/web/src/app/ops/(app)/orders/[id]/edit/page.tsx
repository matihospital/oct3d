import { prisma } from "@oct3d/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ops/PageHeader";
import { OrderForm } from "../../OrderForm";
import { loadOrderFormSupplies } from "../../load-supplies";

export const dynamic = "force-dynamic";

function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, products, colors, supplies] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        lines: { include: { colors: true } },
        materials: true,
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
    loadOrderFormSupplies(),
  ]);

  if (!order) notFound();

  const pendingMaterials = order.materials.filter((m) => !m.deducted);
  const deductedCount = order.materials.filter((m) => m.deducted).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar pedido"
        description={order.clientName || "Sin cliente"}
        breadcrumbs={[
          { label: "Ops", href: "/ops" },
          { label: "Pedidos", href: "/ops/orders" },
          { label: order.clientName || "Detalle", href: `/ops/orders/${order.id}` },
          { label: "Editar" },
        ]}
        actions={
          <Link
            href={`/ops/orders/${order.id}`}
            className="ops-btn ops-btn-subtle"
            style={{ textDecoration: "none" }}
          >
            Cancelar
          </Link>
        }
      />
      {deductedCount > 0 ? (
        <p className="rounded-[var(--ads-radius)] border border-[var(--ads-border)] bg-[var(--ads-bg-raised)] px-4 py-3 text-sm text-[var(--ads-text-subtle)]">
          {deductedCount} material(es) ya descontados del stock no se editan acá (quedan
          en el historial del pedido).
        </p>
      ) : null}
      <OrderForm
        products={products}
        colors={colors}
        supplies={supplies}
        orderId={order.id}
        initial={{
          clientName: order.clientName,
          notes: order.notes,
          deliveryDate: toDateInput(order.deliveryDate),
          lines: order.lines.map((line) => ({
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
          materials: pendingMaterials.map((m) => ({
            supplyId: m.supplyId,
            grams: m.grams,
          })),
        }}
      />
    </div>
  );
}
