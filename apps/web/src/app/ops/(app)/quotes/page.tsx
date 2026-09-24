import { formatMoney, formatPercent } from "@oct3d/pricing";
import { prisma } from "@oct3d/db";
import Link from "next/link";
import { PageHeader } from "@/components/ops/PageHeader";
import { quoteStatusLozengeEs } from "@/components/ops/Lozenge";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { lines: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presupuestos"
        description="Cotizaciones con links y margen estimado."
        breadcrumbs={[{ label: "Ops", href: "/ops" }, { label: "Presupuestos" }]}
        actions={
          <Link href="/ops/quotes/new" className="ops-btn ops-btn-primary" style={{ textDecoration: "none" }}>
            Crear presupuesto
          </Link>
        }
      />

      <section className="ops-card overflow-hidden">
        {quotes.length === 0 ? (
          <p className="ops-empty">Todavía no hay presupuestos.</p>
        ) : (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Líneas</th>
                <th>Total</th>
                <th>Margen</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td>
                    <Link href={`/ops/quotes/${q.id}`} style={{ textDecoration: "none" }}>
                      {q.clientName || "Sin cliente"}
                    </Link>
                  </td>
                  <td>{quoteStatusLozengeEs(q.status)}</td>
                  <td>{q._count.lines}</td>
                  <td className="tabular-nums">{formatMoney(q.totalPrice)}</td>
                  <td className="ops-metric">{formatPercent(q.marginPercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
