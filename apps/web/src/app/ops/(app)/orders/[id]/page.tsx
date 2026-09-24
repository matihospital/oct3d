import { formatMoney, formatPercent } from "@oct3d/pricing";
import { prisma, type OrderStatus } from "@oct3d/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ops/PageHeader";
import { ColorBadges } from "@/components/ops/LineColorPicker";
import {
  deliveryStatusLozenge,
  orderStatusLozenge,
  paymentStatusLozenge,
  Lozenge,
} from "@/components/ops/Lozenge";
import { AddOrderLinesForm } from "../AddOrderLinesForm";
import {
  addOrderPayment,
  deleteOrder,
  deleteOrderPayment,
  markOrderDelivered,
  markOrderFullyPaid,
  markOrderUndelivered,
  updateOrderDelivery,
  updateOrderStatus,
} from "../actions";

export const dynamic = "force-dynamic";

const STATUSES: Array<{ value: OrderStatus; label: string }> = [
  { value: "pending", label: "Pendiente" },
  { value: "done", label: "Hecho" },
  { value: "cancelled", label: "Cancelado" },
];

function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, products, colors] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            colors: { include: { color: true } },
          },
        },
        materials: {
          include: {
            supply: { include: { brand: true, color: true, unit: true } },
          },
          orderBy: { id: "asc" },
        },
        quote: true,
        payments: { orderBy: { paidAt: "desc" } },
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
  ]);
  if (!order) notFound();

  const balance = Math.max(0, order.totalPrice - order.amountPaid);
  const today = toDateInput(new Date());
  const pendingMaterials = order.materials.filter((m) => !m.deducted);
  const canAddLines =
    order.deliveryStatus === "pending" && order.status !== "cancelled";

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.clientName || "Sin cliente"}
        description={`${order.createdAt.toLocaleString("es-AR")}${order.notes ? ` · ${order.notes}` : ""}`}
        breadcrumbs={[
          { label: "Ops", href: "/ops" },
          { label: "Pedidos", href: "/ops/orders" },
          { label: order.clientName || "Detalle" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {orderStatusLozenge(order.status)}
            {paymentStatusLozenge(order.paymentStatus)}
            {deliveryStatusLozenge(order.deliveryStatus)}
            <Link
              href={`/ops/orders/${order.id}/edit`}
              className="ops-btn ops-btn-primary"
              style={{ textDecoration: "none" }}
            >
              Editar
            </Link>
            <a
              href={`/ops/print/orders/${order.id}`}
              target="_blank"
              rel="noreferrer"
              className="ops-btn ops-btn-default"
              style={{ textDecoration: "none" }}
            >
              Imprimir / PDF
            </a>
          </div>
        }
      />

      {order.quoteId ? (
        <p className="text-sm">
          Origen:{" "}
          <Link href={`/ops/quotes/${order.quoteId}`}>Ver presupuesto</Link>
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <section className="ops-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ads-text-subtlest)]">
            Total venta
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMoney(order.totalPrice)}
          </p>
          <p className="mt-1 text-sm text-[var(--ads-text-subtle)]">
            Costo {formatMoney(order.totalCost)}
          </p>
        </section>
        <section className="ops-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ads-text-subtlest)]">
            Margen
          </p>
          <p className="ops-metric mt-1 text-2xl">
            {formatMoney(order.marginAmount)}
          </p>
          <p className="mt-1 text-sm text-[var(--ads-text-subtle)]">
            {formatPercent(order.marginPercent)}
          </p>
        </section>
        <section className="ops-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ads-text-subtlest)]">
            Cobrado
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMoney(order.amountPaid)}
          </p>
          <p className="mt-1 text-sm text-[var(--ads-text-subtle)]">
            {balance > 0.009 ? `Saldo ${formatMoney(balance)}` : "Sin saldo"}
          </p>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ops-card space-y-3 p-4">
          <h2 className="ops-section-title">Entrega</h2>
          <form action={updateOrderDelivery.bind(null, order.id)} className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="ops-label">Fecha de entrega</span>
                <input
                  name="deliveryDate"
                  type="date"
                  className="ops-field"
                  defaultValue={toDateInput(order.deliveryDate)}
                />
              </div>
              <div>
                <span className="ops-label">Estado</span>
                <select
                  name="deliveryStatus"
                  className="ops-field"
                  defaultValue={order.deliveryStatus}
                >
                  <option value="pending">Sin entregar</option>
                  <option value="delivered">Entregado</option>
                </select>
              </div>
            </div>
            <button type="submit" className="ops-btn ops-btn-primary">
              Guardar entrega
            </button>
            {pendingMaterials.length > 0 ? (
              <p className="text-xs text-[var(--ads-text-subtle)]">
                Al marcar entregado se descuentan {pendingMaterials.length} material(es) del
                stock.
              </p>
            ) : null}
          </form>
          <div className="flex flex-wrap gap-2 border-t border-[var(--ads-border)] pt-3">
            {order.deliveryStatus === "delivered" ? (
              <form action={markOrderUndelivered.bind(null, order.id)}>
                <button type="submit" className="ops-btn ops-btn-subtle">
                  Marcar sin entregar
                </button>
              </form>
            ) : (
              <form action={markOrderDelivered.bind(null, order.id)}>
                <button type="submit" className="ops-btn ops-btn-default">
                  Marcar entregado
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="ops-card space-y-3 p-4">
          <h2 className="ops-section-title">Cobros</h2>
          <form action={addOrderPayment.bind(null, order.id)} className="grid gap-2 sm:grid-cols-2">
            <div>
              <span className="ops-label">Monto</span>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                className="ops-field"
                placeholder={balance > 0 ? String(Math.round(balance)) : ""}
                required
              />
            </div>
            <div>
              <span className="ops-label">Fecha</span>
              <input name="paidAt" type="date" className="ops-field" defaultValue={today} />
            </div>
            <div>
              <span className="ops-label">Medio</span>
              <input name="method" className="ops-field" placeholder="Transferencia, efectivo…" />
            </div>
            <div>
              <span className="ops-label">Notas</span>
              <input name="notes" className="ops-field" placeholder="Opcional" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="ops-btn ops-btn-primary">
                Registrar cobro
              </button>
            </div>
          </form>
          {balance > 0.009 ? (
            <form action={markOrderFullyPaid.bind(null, order.id)}>
              <button type="submit" className="ops-btn ops-btn-default">
                Marcar cobrado total ({formatMoney(balance)})
              </button>
            </form>
          ) : null}

          {order.payments.length === 0 ? (
            <p className="ops-empty py-3">Sin cobros registrados.</p>
          ) : (
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Medio</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {order.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="tabular-nums">{p.paidAt.toLocaleDateString("es-AR")}</td>
                    <td className="tabular-nums font-medium">{formatMoney(p.amount)}</td>
                    <td className="text-[var(--ads-text-subtle)]">
                      {p.method || "—"}
                      {p.notes ? ` · ${p.notes}` : ""}
                    </td>
                    <td className="text-right">
                      <form action={deleteOrderPayment.bind(null, order.id, p.id)}>
                        <button type="submit" className="ops-btn ops-btn-danger">
                          Quitar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="ops-card space-y-3 p-4">
        <h2 className="ops-section-title">Estado del pedido</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <form key={s.value} action={updateOrderStatus.bind(null, order.id, s.value)}>
              <button
                type="submit"
                className={`ops-btn ${
                  order.status === s.value ? "ops-btn-primary" : "ops-btn-default"
                }`}
              >
                {s.label}
              </button>
            </form>
          ))}
        </div>
        <form action={deleteOrder.bind(null, order.id)} className="border-t border-[var(--ads-border)] pt-3">
          <button type="submit" className="ops-btn ops-btn-danger">
            Eliminar pedido
          </button>
        </form>
      </section>

      <section className="ops-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ads-border)] px-4 py-3">
          <h2 className="ops-section-title">Materiales / stock</h2>
          <Link
            href={`/ops/orders/${order.id}/edit`}
            className="text-sm"
            style={{ textDecoration: "none" }}
          >
            Editar materiales
          </Link>
        </div>
        {order.materials.length === 0 ? (
          <p className="ops-empty">
            Sin materiales. Agregá insumos y gramos al editar el pedido para comprometer
            stock.
          </p>
        ) : (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Gramos</th>
                <th>Equiv.</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {order.materials.map((m) => {
                const label = [
                  m.supply.materialType || m.supply.name,
                  m.supply.brand?.name,
                  m.supply.color?.name,
                ]
                  .filter(Boolean)
                  .join(" · ");
                const gpu = m.supply.unit.gramsPerUnit;
                const equiv =
                  gpu != null && gpu > 0
                    ? `${(m.grams / gpu).toFixed(3)} ${m.supply.unit.code}`
                    : "—";
                return (
                  <tr key={m.id}>
                    <td className="font-medium">{label}</td>
                    <td className="tabular-nums">{m.grams} g</td>
                    <td className="tabular-nums text-[var(--ads-text-subtle)]">{equiv}</td>
                    <td>
                      {m.deducted ? (
                        <Lozenge appearance="success">Descontado</Lozenge>
                      ) : (
                        <Lozenge appearance="moved">Comprometido</Lozenge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="ops-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ads-border)] px-4 py-3">
          <h2 className="ops-section-title">Líneas</h2>
          <Link
            href={`/ops/orders/${order.id}/edit`}
            className="text-sm"
            style={{ textDecoration: "none" }}
          >
            Editar pedido completo
          </Link>
        </div>
        {canAddLines ? (
          <AddOrderLinesForm
            orderId={order.id}
            products={products}
            colors={colors}
          />
        ) : null}
        <table className="ops-table">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Costo</th>
              <th>Margen línea</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.id}>
                <td>
                  <div className="font-medium">{line.description}</div>
                  <ColorBadges
                    colors={line.colors.map((c) => ({
                      name: c.color.name,
                      hex: c.color.hex,
                      grams: c.grams,
                    }))}
                  />
                  {line.link ? (
                    <a href={line.link} target="_blank" rel="noreferrer" className="text-xs">
                      Link
                    </a>
                  ) : null}
                </td>
                <td>{line.quantity}</td>
                <td className="tabular-nums">{formatMoney(line.unitPrice)}</td>
                <td className="tabular-nums">{formatMoney(line.unitCost)}</td>
                <td className="ops-metric">
                  {formatMoney(line.quantity * (line.unitPrice - line.unitCost))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Link href="/ops/orders" className="ops-btn ops-btn-subtle" style={{ textDecoration: "none" }}>
        Volver al listado
      </Link>
    </div>
  );
}
