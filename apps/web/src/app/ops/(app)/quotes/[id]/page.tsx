import { formatMoney, formatPercent } from "@oct3d/pricing";
import { prisma, type QuoteStatus } from "@oct3d/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ops/PageHeader";
import { ColorBadges } from "@/components/ops/LineColorPicker";
import { quoteStatusLozengeEs } from "@/components/ops/Lozenge";
import {
  convertQuoteToOrder,
  deleteQuote,
  updateQuoteStatus,
} from "../actions";

export const dynamic = "force-dynamic";

const STATUSES: Array<{ value: QuoteStatus; label: string }> = [
  { value: "draft", label: "Borrador" },
  { value: "sent", label: "Enviado" },
  { value: "accepted", label: "Aceptado" },
  { value: "rejected", label: "Rechazado" },
];

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      lines: { include: { colors: { include: { color: true } } } },
      orders: { select: { id: true }, take: 5 },
    },
  });
  if (!quote) notFound();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  const defaultDelivery = tomorrow.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title={quote.clientName || "Sin cliente"}
        description={quote.notes ?? undefined}
        breadcrumbs={[
          { label: "Ops", href: "/ops" },
          { label: "Presupuestos", href: "/ops/quotes" },
          { label: quote.clientName || "Detalle" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {quoteStatusLozengeEs(quote.status)}
            <Link
              href={`/ops/quotes/${quote.id}/edit`}
              className="ops-btn ops-btn-primary"
              style={{ textDecoration: "none" }}
            >
              Editar
            </Link>
            <a
              href={`/ops/print/quotes/${quote.id}`}
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

      <section className="ops-card p-4">
        <p className="text-sm text-[var(--ads-text-subtle)]">
          Precio {formatMoney(quote.totalPrice)} · Costo {formatMoney(quote.totalCost)}
        </p>
        <p className="ops-metric mt-1 text-xl">
          Margen {formatMoney(quote.marginAmount)} ({formatPercent(quote.marginPercent)})
        </p>
      </section>

      <section className="ops-card space-y-3 p-4">
        <h2 className="ops-section-title">Pasar a pedido</h2>
        <p className="text-sm text-[var(--ads-text-subtle)]">
          Copia líneas, precios y costos. Podés fijar la fecha de entrega ahora.
        </p>
        <form
          action={convertQuoteToOrder.bind(null, quote.id)}
          className="flex flex-wrap items-end gap-2"
        >
          <div>
            <span className="ops-label">Fecha de entrega</span>
            <input
              name="deliveryDate"
              type="date"
              className="ops-field"
              defaultValue={defaultDelivery}
            />
          </div>
          <button type="submit" className="ops-btn ops-btn-primary">
            Convertir en pedido
          </button>
        </form>
        {quote.orders.length > 0 ? (
          <p className="text-sm text-[var(--ads-text-subtle)]">
            Ya tiene pedido(s):{" "}
            {quote.orders.map((o, i) => (
              <span key={o.id}>
                {i > 0 ? ", " : null}
                <Link href={`/ops/orders/${o.id}`}>#{o.id.slice(-6)}</Link>
              </span>
            ))}
          </p>
        ) : null}
      </section>

      <section className="ops-card space-y-3 p-4">
        <h2 className="ops-section-title">Estado</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <form key={s.value} action={updateQuoteStatus.bind(null, quote.id, s.value)}>
              <button
                type="submit"
                className={`ops-btn ${
                  quote.status === s.value ? "ops-btn-primary" : "ops-btn-default"
                }`}
              >
                {s.label}
              </button>
            </form>
          ))}
        </div>
        <form action={deleteQuote.bind(null, quote.id)} className="border-t border-[var(--ads-border)] pt-3">
          <button type="submit" className="ops-btn ops-btn-danger">
            Eliminar
          </button>
        </form>
      </section>

      <section className="ops-card overflow-hidden">
        <div className="border-b border-[var(--ads-border)] px-4 py-3">
          <h2 className="ops-section-title">Líneas</h2>
        </div>
        <table className="ops-table">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Link</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Costo</th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((line) => (
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
                </td>
                <td>
                  {line.link ? (
                    <a
                      href={line.link}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-xs"
                    >
                      MakerWorld
                    </a>
                  ) : (
                    <span className="text-[var(--ads-text-subtlest)]">—</span>
                  )}
                </td>
                <td>{line.quantity}</td>
                <td className="tabular-nums">{formatMoney(line.unitPrice)}</td>
                <td className="tabular-nums">{formatMoney(line.unitCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Link href="/ops/quotes" className="ops-btn ops-btn-subtle" style={{ textDecoration: "none" }}>
        Volver al listado
      </Link>
    </div>
  );
}
