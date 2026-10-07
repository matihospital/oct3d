import { formatMoney } from "@oct3d/pricing";
import { prisma } from "@oct3d/db";
import { notFound } from "next/navigation";
import { ShareActions } from "../../ShareActions";

export const dynamic = "force-dynamic";

function shortDate(d: Date): string {
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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
    },
  });
  if (!order) notFound();

  const shortId = order.id.slice(-6).toUpperCase();
  const balance = Math.max(0, order.totalPrice - order.amountPaid);
  const lines = order.lines.map((line) => ({
    id: line.id,
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    subtotal: line.quantity * line.unitPrice,
    colors: line.colors.map((c) => c.color.name).join(", "),
  }));

  const shareText = [
    `*Oct3D · Pedido #${shortId}*`,
    order.clientName ? `Cliente: ${order.clientName}` : null,
    order.deliveryDate ? `Entrega: ${shortDate(order.deliveryDate)}` : null,
    "",
    ...lines.map(
      (l) =>
        `• ${l.quantity} × ${l.description}${l.colors ? ` (${l.colors})` : ""} — ${formatMoney(l.subtotal)}`,
    ),
    "",
    `*Total: ${formatMoney(order.totalPrice)}*`,
    order.amountPaid > 0 ? `Pagado: ${formatMoney(order.amountPaid)}` : null,
    order.amountPaid > 0
      ? balance > 0
        ? `*Saldo: ${formatMoney(balance)}*`
        : "✅ Pagado completo"
      : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  return (
    <>
      <ShareActions
        backHref={`/ops/orders/${order.id}`}
        shareText={shareText}
        targetId="receipt"
        fileName={`oct3d-pedido-${shortId}.png`}
      />
      <article id="receipt" className="receipt">
        <header className="receipt-head">
          <div>
            <div className="receipt-brand">Oct3D</div>
            <div className="receipt-sub">Pedido #{shortId}</div>
          </div>
          <div className="receipt-date">{shortDate(order.createdAt)}</div>
        </header>

        <div className="receipt-client">
          <div>
            <span>Cliente</span>
            <strong>{order.clientName || "Sin cliente"}</strong>
          </div>
          {order.deliveryDate ? (
            <div>
              <span>Entrega</span>
              <strong>{shortDate(order.deliveryDate)}</strong>
            </div>
          ) : null}
        </div>

        <ul className="receipt-lines">
          {lines.map((l) => (
            <li key={l.id}>
              <span className="receipt-line-qty">{l.quantity}×</span>
              <span className="receipt-line-desc">
                {l.description}
                {l.colors ? <span className="receipt-line-detail"> · {l.colors}</span> : null}
              </span>
              <span className="receipt-line-unit">{formatMoney(l.unitPrice)}</span>
              <span className="receipt-line-amount">{formatMoney(l.subtotal)}</span>
            </li>
          ))}
        </ul>

        <div className="receipt-totals">
          <div className="receipt-row receipt-total">
            <span>Total</span>
            <span>{formatMoney(order.totalPrice)}</span>
          </div>
          {order.amountPaid > 0 ? (
            <div className="receipt-row">
              <span>Pagado</span>
              <span>{formatMoney(order.amountPaid)}</span>
            </div>
          ) : null}
          {order.amountPaid > 0 ? (
            balance > 0 ? (
              <div className="receipt-row receipt-balance">
                <span>Saldo</span>
                <span>{formatMoney(balance)}</span>
              </div>
            ) : (
              <div className="receipt-paid">Pagado completo</div>
            )
          ) : null}
        </div>

        {order.notes ? <p className="receipt-notes">{order.notes}</p> : null}

        <p className="receipt-footer">¡Gracias por tu compra! · Comprobante no fiscal</p>
      </article>
    </>
  );
}
