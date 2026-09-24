import { prisma } from "@oct3d/db";
import { PageHeader } from "@/components/ops/PageHeader";
import { OrderForm } from "../OrderForm";
import { loadOrderFormSupplies } from "../load-supplies";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const [products, colors, supplies] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo pedido"
        description="Líneas, colores y materiales (gramos) para stock al entregar."
        breadcrumbs={[
          { label: "Ops", href: "/ops" },
          { label: "Pedidos", href: "/ops/orders" },
          { label: "Nuevo" },
        ]}
      />
      <OrderForm products={products} colors={colors} supplies={supplies} />
    </div>
  );
}
