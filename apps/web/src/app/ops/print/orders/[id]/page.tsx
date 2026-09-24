import { formatMoney } from "@oct3d/pricing";
import { prisma } from "@oct3d/db";
import { notFound } from "next/navigation";
import { PrintActions } from "../../PrintActions";
import {
  deliveryStatusLabel,
  paymentStatusLabel,
} from "@/lib/order-status";

export const dynamic = "force-dynamic";

export default async function PrintOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      lines: {
        include: { colors: { include: { color: true } } },
      },
      payments: { orderBy: { paidAt: "asc" } },
    },
  });
  if (!order) notFound();

  const shortId = order.id.slice(-8).toUpperCase();
  const balance = Math.max(0, order.totalPrice - order.amountPaid);

  return (
    <>
      <PrintActions backHref={`/ops/orders/${order.id}`} />
      <article className="print-sheet">
        <header className="print-header">
          <div>
            <div className="print-brand">Oct3D</div>
            <div style={{ color: "var(--print-muted)", fontSize: "0.875rem" }}>
              Comprobante de pedido
            </div>
          </div>
          <div className="print-meta">
            <strong>#{shortId}</strong>
            {order.createdAt.toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </div>
        </header>

        <dl className="print-client">
          <dt>Cliente</dt>
          <dd>{order.clientName || "Sin cliente"}</dd>
          {order.deliveryDate ? (
            <>
              <dt>Fecha de entrega</dt>
              <dd>
                {order.deliveryDate.toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </>
          ) : null}
          <dt>Estado</dt>
          <dd style={{ fontWeight: 400 }}>
            {deliveryStatusLabel(order.deliveryStatus)} ·{" "}
            {paymentStatusLabel(order.paymentStatus)}
          </dd>
          {order.notes ? (
            <>
              <dt>Notas</dt>
              <dd style={{ fontWeight: 400 }}>{order.notes}</dd>
            </>
          ) : null}
        </dl>

        <table className="print-table">
          <thead>
            <tr>
              <th>Descripción</th>
              <th className="num">Cant.</th>
              <th className="num">P. unit.</th>
              <th className="num">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => {
              const colorNames = line.colors.map((c) => c.color.name).join(", ");
              return (
                <tr key={line.id}>
                  <td>
                    {line.description}
                    {colorNames ? (
                      <div style={{ fontSize: "0.8rem", color: "var(--print-muted)" }}>
                        Color: {colorNames}
                      </div>
                    ) : null}
                  </td>
                  <td className="num">{line.quantity}</td>
                  <td className="num">{formatMoney(line.unitPrice)}</td>
                  <td className="num">
                    {formatMoney(line.quantity * line.unitPrice)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="print-totals">
          <div className="row">
            <span>Total</span>
            <span>{formatMoney(order.totalPrice)}</span>
          </div>
          <div className="row">
            <span>Cobrado</span>
            <span>{formatMoney(order.amountPaid)}</span>
          </div>
          <div className="row total">
            <span>Saldo</span>
            <span>{formatMoney(balance)}</span>
          </div>
        </div>

        {order.payments.length > 0 ? (
          <div className="print-notes">
            <strong style={{ color: "var(--print-ink)" }}>Pagos registrados</strong>
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem" }}>
              {order.payments.map((p) => (
                <li key={p.id}>
                  {p.paidAt.toLocaleDateString("es-AR")}: {formatMoney(p.amount)}
                  {p.method ? ` (${p.method})` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="print-footer">
          Documento generado por Oct3D · Comprobante interno no fiscal.
        </p>
      </article>
    </>
  );
}
