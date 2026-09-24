import { formatMoney } from "@oct3d/pricing";
import { prisma } from "@oct3d/db";
import { notFound } from "next/navigation";
import { PrintActions } from "../../PrintActions";

export const dynamic = "force-dynamic";

export default async function PrintQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      lines: { include: { colors: { include: { color: true } } } },
    },
  });
  if (!quote) notFound();

  const shortId = quote.id.slice(-8).toUpperCase();

  return (
    <>
      <PrintActions backHref={`/ops/quotes/${quote.id}`} />
      <article className="print-sheet">
        <header className="print-header">
          <div>
            <div className="print-brand">Oct3D</div>
            <div style={{ color: "var(--print-muted)", fontSize: "0.875rem" }}>
              Presupuesto
            </div>
          </div>
          <div className="print-meta">
            <strong>#{shortId}</strong>
            {quote.createdAt.toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </div>
        </header>

        <dl className="print-client">
          <dt>Cliente</dt>
          <dd>{quote.clientName || "Sin cliente"}</dd>
          {quote.notes ? (
            <>
              <dt>Notas</dt>
              <dd style={{ fontWeight: 400 }}>{quote.notes}</dd>
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
            {quote.lines.map((line) => {
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
          <div className="row total">
            <span>Total</span>
            <span>{formatMoney(quote.totalPrice)}</span>
          </div>
        </div>

        <p className="print-footer">
          Documento generado por Oct3D · Presupuesto no fiscal.
          Válido sujeto a confirmación de stock y tiempos de impresión.
        </p>
      </article>
    </>
  );
}
