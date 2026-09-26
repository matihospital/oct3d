import { formatMoney } from "@oct3d/pricing";
import { prisma } from "@oct3d/db";
import Link from "next/link";
import { PageHeader } from "@/components/ops/PageHeader";
import { getCommittedStockBySupply } from "@/lib/order-stock";
import {
  registerPurchase,
  registerStockAdjustment,
  setSupplyStock,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ stock?: string }>;
}) {
  const sp = await searchParams;
  const lowOnly = sp.stock === "low";

  const [supplies, purchases, adjustments, committedMap] = await Promise.all([
    prisma.supply.findMany({
      include: { brand: true, color: true, unit: true },
      orderBy: { name: "asc" },
    }),
    prisma.supplyPurchase.findMany({
      include: { supply: { include: { unit: true, brand: true, color: true } } },
      orderBy: { purchasedAt: "desc" },
      take: 15,
    }),
    prisma.stockAdjustment.findMany({
      include: { supply: { include: { unit: true, brand: true, color: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    getCommittedStockBySupply(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const defaultSupplyId = supplies[0]?.id ?? "";
  const rows = supplies.map((s) => {
    const committed = committedMap.get(s.id) ?? 0;
    const available = s.stockQty - committed;
    const low = available <= 0.5;
    return { s, committed, available, low };
  });
  const lowAvailable = rows.filter((r) => r.low).length;
  const visible = lowOnly ? rows.filter((r) => r.low) : rows;

  function supplyLabel(s: (typeof supplies)[0]) {
    return [s.materialType || s.name, s.brand?.name, s.color?.name]
      .filter(Boolean)
      .join(" · ");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description="Stock, comprometido en pedidos sin entregar y disponible para saber cuándo comprar."
        breadcrumbs={[{ label: "Ops", href: "/ops" }, { label: "Inventario" }]}
        actions={
          <Link href="/ops/catalog" className="ops-btn ops-btn-default" style={{ textDecoration: "none" }}>
            Ir al catálogo
          </Link>
        }
      />

      {lowAvailable > 0 ? (
        <p className="rounded-[var(--ads-radius)] border border-[var(--ads-border)] bg-[var(--ads-warning-bg)] px-4 py-3 text-sm text-[var(--ads-warning)]">
          {lowAvailable} insumo(s) con disponible ≤ 0,5 (stock menos comprometido). Revisá
          compras.
        </p>
      ) : null}

      <section className="ops-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ads-border)] px-4 py-3">
          <h2 className="ops-section-title">Stock actual</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/ops/inventory"
              className={`ops-btn ${!lowOnly ? "ops-btn-primary" : "ops-btn-subtle"}`}
              style={{ textDecoration: "none" }}
            >
              Todos
            </Link>
            <Link
              href="/ops/inventory?stock=low"
              className={`ops-btn ${lowOnly ? "ops-btn-primary" : "ops-btn-subtle"}`}
              style={{ textDecoration: "none" }}
            >
              Stock bajo ({lowAvailable})
            </Link>
          </div>
        </div>
        {supplies.length === 0 ? (
          <p className="ops-empty">
            Todavía no hay insumos.{" "}
            <Link href="/ops/catalog">Creá uno en Catálogo</Link>.
          </p>
        ) : visible.length === 0 ? (
          <p className="ops-empty">No hay insumos con stock bajo.</p>
        ) : (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Stock</th>
                <th>Comprometido</th>
                <th>Disponible</th>
                <th>Costo / u</th>
                <th>Fijar stock</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ s, committed, available, low }) => (
                  <tr key={s.id}>
                    <td>
                      <div className="font-medium">{supplyLabel(s)}</div>
                      <div className="text-xs text-[var(--ads-text-subtlest)]">{s.name}</div>
                    </td>
                    <td className="tabular-nums font-semibold">
                      {s.stockQty.toFixed(3)} {s.unit.code}
                    </td>
                    <td className="tabular-nums text-[var(--ads-text-subtle)]">
                      {committed > 0
                        ? `${committed.toFixed(3)} ${s.unit.code}`
                        : "—"}
                    </td>
                    <td
                      className={`tabular-nums font-semibold ${
                        low ? "text-[var(--ads-danger)]" : "ops-metric"
                      }`}
                    >
                      {available.toFixed(3)} {s.unit.code}
                    </td>
                    <td className="tabular-nums">{formatMoney(s.unitCost)}</td>
                    <td>
                      <form
                        action={setSupplyStock}
                        className="flex flex-wrap items-end gap-1"
                      >
                        <input type="hidden" name="supplyId" value={s.id} />
                        <input
                          name="stockQty"
                          type="number"
                          step="any"
                          min="0"
                          className="ops-field w-24"
                          defaultValue={s.stockQty}
                          required
                        />
                        <input
                          name="reason"
                          className="ops-field w-32"
                          placeholder="Conteo"
                          defaultValue="Conteo físico"
                        />
                        <button type="submit" className="ops-btn ops-btn-subtle">
                          Guardar
                        </button>
                      </form>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ops-card p-4">
          <h2 className="ops-section-title mb-3">Registrar compra</h2>
          {supplies.length === 0 ? (
            <p className="ops-empty py-2">Necesitás al menos un insumo.</p>
          ) : (
            <form action={registerPurchase} className="grid gap-2">
              <div>
                <span className="ops-label">Insumo</span>
                <select name="supplyId" className="ops-field" defaultValue={defaultSupplyId} required>
                  {supplies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {supplyLabel(s)} (stock {s.stockQty} {s.unit.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="ops-label">Cantidad</span>
                  <input
                    name="quantity"
                    type="number"
                    step="any"
                    min="0.001"
                    className="ops-field"
                    placeholder="1"
                    required
                  />
                </div>
                <div>
                  <span className="ops-label">Costo por unidad</span>
                  <input
                    name="unitCost"
                    type="number"
                    step="0.01"
                    min="0"
                    className="ops-field"
                    placeholder="19000"
                    required
                  />
                </div>
              </div>
              <div>
                <span className="ops-label">Fecha</span>
                <input name="purchasedAt" type="date" className="ops-field" defaultValue={today} />
              </div>
              <div>
                <span className="ops-label">Proveedor</span>
                <input name="supplier" className="ops-field" placeholder="Opcional" />
              </div>
              <div>
                <span className="ops-label">Notas</span>
                <input name="notes" className="ops-field" placeholder="Opcional" />
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--ads-text-subtle)]">
                <input name="updateUnitCost" type="checkbox" defaultChecked className="h-4 w-4" />
                Actualizar costo unitario del insumo con esta compra
              </label>
              <button type="submit" className="ops-btn ops-btn-primary justify-self-start">
                Guardar compra
              </button>
            </form>
          )}
        </section>

        <section className="ops-card p-4">
          <h2 className="ops-section-title mb-1">Ajuste de stock</h2>
          <p className="mb-3 text-sm text-[var(--ads-text-subtle)]">
            Usá cantidad positiva para entrada y negativa para merma o uso.
          </p>
          {supplies.length === 0 ? (
            <p className="ops-empty py-2">Necesitás al menos un insumo.</p>
          ) : (
            <form action={registerStockAdjustment} className="grid gap-2">
              <div>
                <span className="ops-label">Insumo</span>
                <select name="supplyId" className="ops-field" defaultValue={defaultSupplyId} required>
                  {supplies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {supplyLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="ops-label">Cantidad (+ / −)</span>
                <input
                  name="deltaQty"
                  type="number"
                  step="any"
                  className="ops-field"
                  placeholder="-0.1"
                  required
                />
              </div>
              <div>
                <span className="ops-label">Motivo</span>
                <input
                  name="reason"
                  className="ops-field"
                  placeholder="Merma, uso interno, corrección…"
                  required
                />
              </div>
              <div>
                <span className="ops-label">Notas</span>
                <input name="notes" className="ops-field" placeholder="Opcional" />
              </div>
              <button type="submit" className="ops-btn ops-btn-primary justify-self-start">
                Registrar ajuste
              </button>
            </form>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ops-card overflow-hidden">
          <div className="border-b border-[var(--ads-border)] px-4 py-3">
            <h2 className="ops-section-title">Últimas compras</h2>
          </div>
          {purchases.length === 0 ? (
            <p className="ops-empty">Sin compras todavía.</p>
          ) : (
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Insumo</th>
                  <th>Cant.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="tabular-nums">
                      {p.purchasedAt.toLocaleDateString("es-AR")}
                    </td>
                    <td>
                      <div className="font-medium">
                        {[
                          p.supply.materialType || p.supply.name,
                          p.supply.brand?.name,
                          p.supply.color?.name,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      {p.supplier ? (
                        <div className="text-xs text-[var(--ads-text-subtlest)]">
                          {p.supplier}
                        </div>
                      ) : null}
                    </td>
                    <td className="tabular-nums">
                      {p.quantity} {p.supply.unit.code}
                    </td>
                    <td className="tabular-nums">{formatMoney(p.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="ops-card overflow-hidden">
          <div className="border-b border-[var(--ads-border)] px-4 py-3">
            <h2 className="ops-section-title">Últimos ajustes</h2>
          </div>
          {adjustments.length === 0 ? (
            <p className="ops-empty">Sin ajustes todavía.</p>
          ) : (
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Insumo</th>
                  <th>Δ</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((a) => (
                  <tr key={a.id}>
                    <td className="tabular-nums">
                      {a.createdAt.toLocaleDateString("es-AR")}
                    </td>
                    <td className="font-medium">
                      {[
                        a.supply.materialType || a.supply.name,
                        a.supply.brand?.name,
                        a.supply.color?.name,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </td>
                    <td
                      className={`tabular-nums font-medium ${
                        a.deltaQty < 0 ? "text-[var(--ads-danger, #de350b)]" : "ops-metric"
                      }`}
                    >
                      {a.deltaQty > 0 ? "+" : ""}
                      {a.deltaQty} {a.supply.unit.code}
                    </td>
                    <td className="text-[var(--ads-text-subtle)]">{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
