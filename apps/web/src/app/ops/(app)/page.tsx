import { formatMoney, formatPercent } from "@oct3d/pricing";
import { prisma } from "@oct3d/db";
import Link from "next/link";
import { PageHeader } from "@/components/ops/PageHeader";
import {
  deliveryStatusLozenge,
  orderStatusLozenge,
  paymentStatusLozenge,
} from "@/components/ops/Lozenge";

export const dynamic = "force-dynamic";

export default async function OpsHomePage() {
  const [products, quotes, orders, openOrders, lowStock, unpaid] = await Promise.all([
    prisma.product.count(),
    prisma.quote.count(),
    prisma.order.count(),
    prisma.order.findMany({
      where: { status: "pending" },
      orderBy: [{ deliveryDate: "asc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.supply.count({ where: { stockQty: { lte: 0.5 } } }),
    prisma.order.count({
      where: {
        status: { not: "cancelled" },
        paymentStatus: { in: ["unpaid", "partial"] },
      },
    }),
  ]);

  const sortedOpen = [...openOrders].sort((a, b) => {
    if (!a.deliveryDate && !b.deliveryDate) {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    if (!a.deliveryDate) return 1;
    if (!b.deliveryDate) return -1;
    return a.deliveryDate.getTime() - b.deliveryDate.getTime();
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel"
        description="Resumen operativo: entregas próximas, cobros e inventario."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/ops/quotes/new" className="ops-btn ops-btn-default" style={{ textDecoration: "none" }}>
              Nuevo presupuesto
            </Link>
            <Link href="/ops/orders/new" className="ops-btn ops-btn-primary" style={{ textDecoration: "none" }}>
              Crear pedido
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Productos" value={String(products)} href="/ops/catalog" />
        <StatCard label="Presupuestos" value={String(quotes)} href="/ops/quotes" />
        <StatCard label="Pedidos" value={String(orders)} href="/ops/orders" />
        <StatCard
          label="Por cobrar"
          value={String(unpaid)}
          href="/ops/orders?payment=unpaid"
        />
      </div>

      {lowStock > 0 ? (
        <p className="rounded-[var(--ads-radius)] border border-[var(--ads-border)] bg-[var(--ads-bg-raised)] px-4 py-3 text-sm">
          {lowStock} insumo(s) con stock bajo (≤ 0,5).{" "}
          <Link href="/ops/inventory">Revisar inventario</Link>
        </p>
      ) : null}

      <section className="ops-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--ads-border)] px-4 py-3">
          <h2 className="ops-section-title">Pendientes por entrega</h2>
          <Link
            href="/ops/orders?status=pending&sort=delivery"
            className="text-sm"
            style={{ textDecoration: "none" }}
          >
            Ver todos
          </Link>
        </div>
        {sortedOpen.length === 0 ? (
          <p className="ops-empty">No hay pedidos pendientes.</p>
        ) : (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Entrega</th>
                <th>Cobro</th>
                <th>Total</th>
                <th>Margen</th>
              </tr>
            </thead>
            <tbody>
              {sortedOpen.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/ops/orders/${o.id}`} style={{ textDecoration: "none" }}>
                      {o.clientName || "Sin cliente"}
                    </Link>
                    <div className="mt-0.5">{orderStatusLozenge(o.status)}</div>
                  </td>
                  <td>
                    <div className="tabular-nums">
                      {o.deliveryDate
                        ? o.deliveryDate.toLocaleDateString("es-AR")
                        : "Sin fecha"}
                    </div>
                    <div className="mt-0.5">{deliveryStatusLozenge(o.deliveryStatus)}</div>
                  </td>
                  <td>{paymentStatusLozenge(o.paymentStatus)}</td>
                  <td className="tabular-nums">{formatMoney(o.totalPrice)}</td>
                  <td className="ops-metric">
                    {formatMoney(o.marginAmount)} ({formatPercent(o.marginPercent)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="ops-card block p-4 transition hover:bg-[var(--ads-bg)]"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ads-text-subtlest)]">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-[var(--ads-text)]">{value}</p>
    </Link>
  );
}
