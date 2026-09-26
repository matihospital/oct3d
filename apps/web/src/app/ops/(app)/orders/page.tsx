import { formatMoney, formatPercent } from "@oct3d/pricing";
import { prisma, type OrderStatus, type PaymentStatus, type DeliveryStatus } from "@oct3d/db";
import Link from "next/link";
import { PageHeader } from "@/components/ops/PageHeader";
import {
  deliveryStatusLozenge,
  orderStatusLozenge,
  paymentStatusLozenge,
} from "@/components/ops/Lozenge";

export const dynamic = "force-dynamic";

type SortKey = "delivery" | "created" | "margin";

function toDateInputValue(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    payment?: string;
    delivery?: string;
    sort?: string;
  }>;
}) {
  const sp = await searchParams;
  const statusFilter =
    sp.status === "pending" || sp.status === "done" || sp.status === "cancelled"
      ? (sp.status as OrderStatus)
      : undefined;
  const paymentFilter =
    sp.payment === "unpaid" ||
    sp.payment === "partial" ||
    sp.payment === "paid" ||
    sp.payment === "due"
      ? sp.payment
      : undefined;
  const deliveryFilter =
    sp.delivery === "pending" || sp.delivery === "delivered"
      ? (sp.delivery as DeliveryStatus)
      : undefined;
  const sort: SortKey =
    sp.sort === "created" || sp.sort === "margin" ? sp.sort : "delivery";

  const orders = await prisma.order.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(paymentFilter === "due"
        ? { paymentStatus: { in: ["unpaid", "partial"] } }
        : paymentFilter
          ? { paymentStatus: paymentFilter as PaymentStatus }
          : {}),
      ...(deliveryFilter ? { deliveryStatus: deliveryFilter } : {}),
    },
    orderBy:
      sort === "margin"
        ? { marginPercent: "desc" }
        : sort === "created"
          ? { createdAt: "desc" }
          : [{ deliveryDate: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { lines: true } } },
  });

  // Null delivery dates last when sorting by delivery
  const sorted =
    sort === "delivery"
      ? [...orders].sort((a, b) => {
          if (!a.deliveryDate && !b.deliveryDate) {
            return b.createdAt.getTime() - a.createdAt.getTime();
          }
          if (!a.deliveryDate) return 1;
          if (!b.deliveryDate) return -1;
          return a.deliveryDate.getTime() - b.deliveryDate.getTime();
        })
      : orders;

  const sumTotalPrice = sorted.reduce((s, o) => s + o.totalPrice, 0);
  const sumMargin = sorted.reduce((s, o) => s + o.marginAmount, 0);

  function hrefWith(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const next = {
      status: statusFilter ?? "",
      payment: paymentFilter ?? "",
      delivery: deliveryFilter ?? "",
      sort,
      ...patch,
    };
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
    }
    const q = params.toString();
    return q ? `/ops/orders?${q}` : "/ops/orders";
  }

  const statusFilters = [
    { label: "Todos", value: "" },
    { label: "Pendientes", value: "pending" },
    { label: "Hechos", value: "done" },
    { label: "Cancelados", value: "cancelled" },
  ];
  const paymentFilters = [
    { label: "Cobro: todos", value: "" },
    { label: "Por cobrar", value: "due" },
    { label: "Sin cobrar", value: "unpaid" },
    { label: "Parcial", value: "partial" },
    { label: "Cobrados", value: "paid" },
  ];
  const deliveryFilters = [
    { label: "Entrega: todas", value: "" },
    { label: "Sin entregar", value: "pending" },
    { label: "Entregados", value: "delivered" },
  ];
  const sortFilters: Array<{ label: string; value: SortKey }> = [
    { label: "Por entrega", value: "delivery" },
    { label: "Más recientes", value: "created" },
    { label: "Mayor margen", value: "margin" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description="Margen, cobro, entrega y fechas. Ordená por entrega para priorizar lo próximo."
        breadcrumbs={[{ label: "Ops", href: "/ops" }, { label: "Pedidos" }]}
        actions={
          <Link href="/ops/orders/new" className="ops-btn ops-btn-primary" style={{ textDecoration: "none" }}>
            Crear pedido
          </Link>
        }
      />

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((f) => {
            const active = (statusFilter ?? "") === f.value;
            return (
              <Link
                key={f.label}
                href={hrefWith({ status: f.value || undefined })}
                className={`ops-btn ${active ? "ops-btn-primary" : "ops-btn-default"}`}
                style={{ textDecoration: "none" }}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {paymentFilters.map((f) => {
            const active = (paymentFilter ?? "") === f.value;
            return (
              <Link
                key={f.label}
                href={hrefWith({ payment: f.value || undefined })}
                className={`ops-btn ${active ? "ops-btn-primary" : "ops-btn-subtle"}`}
                style={{ textDecoration: "none" }}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {deliveryFilters.map((f) => {
            const active = (deliveryFilter ?? "") === f.value;
            return (
              <Link
                key={f.label}
                href={hrefWith({ delivery: f.value || undefined })}
                className={`ops-btn ${active ? "ops-btn-primary" : "ops-btn-subtle"}`}
                style={{ textDecoration: "none" }}
              >
                {f.label}
              </Link>
            );
          })}
          <span className="mx-1 self-center text-[var(--ads-border)]">|</span>
          {sortFilters.map((f) => {
            const active = sort === f.value;
            return (
              <Link
                key={f.value}
                href={hrefWith({ sort: f.value })}
                className={`ops-btn ${active ? "ops-btn-primary" : "ops-btn-subtle"}`}
                style={{ textDecoration: "none" }}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      <section className="ops-card overflow-hidden">
        {sorted.length === 0 ? (
          <p className="ops-empty">No hay pedidos con este filtro.</p>
        ) : (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Entrega</th>
                <th>Estado</th>
                <th>Cobro</th>
                <th>Total</th>
                <th>Margen</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((o) => {
                const balance = Math.max(0, o.totalPrice - o.amountPaid);
                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/ops/orders/${o.id}`} style={{ textDecoration: "none" }}>
                        {o.clientName || "Sin cliente"}
                      </Link>
                      <div className="text-xs text-[var(--ads-text-subtlest)]">
                        {o._count.lines} líneas
                        {o.paymentStatus !== "paid" && balance > 0
                          ? ` · debe ${formatMoney(balance)}`
                          : ""}
                      </div>
                    </td>
                    <td>
                      <div className="tabular-nums">{toDateInputValue(o.deliveryDate)}</div>
                      <div className="mt-0.5">{deliveryStatusLozenge(o.deliveryStatus)}</div>
                    </td>
                    <td>{orderStatusLozenge(o.status)}</td>
                    <td>{paymentStatusLozenge(o.paymentStatus)}</td>
                    <td className="tabular-nums">{formatMoney(o.totalPrice)}</td>
                    <td className="ops-metric">
                      {formatMoney(o.marginAmount)}
                      <div className="text-xs font-normal text-[var(--ads-text-subtle)]">
                        {formatPercent(o.marginPercent)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--ads-border)]">
                <td colSpan={4} className="font-semibold text-[var(--ads-text)]">
                  Total ({sorted.length} pedido{sorted.length === 1 ? "" : "s"})
                </td>
                <td className="tabular-nums font-semibold">
                  {formatMoney(sumTotalPrice)}
                </td>
                <td className="ops-metric font-semibold">
                  {formatMoney(sumMargin)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>
    </div>
  );
}
