import { costPerGram, formatMoney, formatMoneyDetailed } from "@oct3d/pricing";
import { prisma } from "@oct3d/db";
import { PageHeader } from "@/components/ops/PageHeader";
import { HexColorField } from "@/components/ops/HexColorField";
import { EditableColorRow } from "@/components/ops/EditableColorRow";
import {
  createBrand,
  createColor,
  createProduct,
  createSupply,
  createUnit,
  deleteBrand,
  deleteProduct,
  deleteSupply,
  deleteUnit,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const [brands, colors, units, supplies, products] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.color.findMany({ orderBy: { name: "asc" } }),
    prisma.unitOfMeasure.findMany({ orderBy: { code: "asc" } }),
    prisma.supply.findMany({
      include: { brand: true, color: true, unit: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      include: { brand: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const defaultUnitId = units.find((u) => u.code === "kg")?.id ?? units[0]?.id ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo"
        description="Marcas, unidades, insumos (compra por kg) y productos. Stock y compras en Inventario."
        breadcrumbs={[{ label: "Ops", href: "/ops" }, { label: "Catálogo" }]}
      />

      <section className="ops-card p-4">
        <h2 className="ops-section-title mb-3">Marcas</h2>
        <form action={createBrand} className="mb-4 flex flex-wrap gap-2">
          <input name="name" className="ops-field max-w-xs" placeholder="Ej. Ecofila" required />
          <button type="submit" className="ops-btn ops-btn-primary">
            Agregar
          </button>
        </form>
        {brands.length === 0 ? (
          <p className="ops-empty py-4">Sin marcas todavía.</p>
        ) : (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium">{b.name}</td>
                  <td className="text-right">
                    <form action={deleteBrand.bind(null, b.id)}>
                      <button type="submit" className="ops-btn ops-btn-danger">
                        Eliminar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="ops-card p-4">
        <h2 className="ops-section-title mb-3">Colores</h2>
        <form action={createColor} className="mb-4 flex flex-wrap items-start gap-2">
          <div>
            <span className="ops-label">Nombre</span>
            <input name="name" className="ops-field w-40" placeholder="Negro" required />
          </div>
          <HexColorField />
          <div>
            <span className="ops-label invisible select-none" aria-hidden>
              Agregar
            </span>
            <button type="submit" className="ops-btn ops-btn-primary">
              Agregar
            </button>
          </div>
        </form>
        {colors.length === 0 ? (
          <p className="ops-empty py-4">Sin colores. Corré seed o agregá uno.</p>
        ) : (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Color</th>
                <th>Hex</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {colors.map((c) => (
                <EditableColorRow key={c.id} color={c} />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="ops-card p-4">
        <h2 className="ops-section-title mb-1">Unidades de medida</h2>
        <p className="mb-3 text-sm text-[var(--ads-text-subtle)]">
          La compra suele ser por <strong>kg</strong>. En venta/presupuesto se usa el equivalente en{" "}
          <strong>gramos</strong> (1 kg = 1000 g).
        </p>
        <form action={createUnit} className="mb-4 grid gap-2 md:grid-cols-4">
          <div>
            <span className="ops-label">Código</span>
            <input name="code" className="ops-field" placeholder="kg" required />
          </div>
          <div>
            <span className="ops-label">Nombre</span>
            <input name="name" className="ops-field" placeholder="Kilogramo" required />
          </div>
          <div>
            <span className="ops-label">Gramos por unidad</span>
            <input
              name="gramsPerUnit"
              type="number"
              step="any"
              className="ops-field"
              placeholder="1000 (vacío si no es masa)"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="ops-btn ops-btn-primary">
              Agregar unidad
            </button>
          </div>
        </form>
        {units.length === 0 ? (
          <p className="ops-empty py-4">
            Sin unidades. Corré <code>npm run db:seed</code> o agregá kg manualmente.
          </p>
        ) : (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>g / unidad</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.code}</td>
                  <td>{u.name}</td>
                  <td className="tabular-nums">
                    {u.gramsPerUnit != null ? u.gramsPerUnit : "—"}
                  </td>
                  <td className="text-right">
                    <form action={deleteUnit.bind(null, u.id)}>
                      <button type="submit" className="ops-btn ops-btn-danger">
                        Eliminar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="ops-card p-4">
        <h2 className="ops-section-title mb-1">Insumos</h2>
        <p className="mb-3 text-sm text-[var(--ads-text-subtle)]">
          Ejemplo: 1 kg PLA Ecofila negro a $19.000 → el sistema calcula ~$19 / g para
          presupuestos.
        </p>
        <form action={createSupply} className="mb-4 grid gap-2 md:grid-cols-2">
          <div>
            <span className="ops-label">Material / nombre</span>
            <input name="name" className="ops-field" placeholder="PLA" required />
          </div>
          <div>
            <span className="ops-label">Tipo (opcional)</span>
            <input
              name="materialType"
              className="ops-field"
              placeholder="PLA, PETG, TPU…"
            />
          </div>
          <div>
            <span className="ops-label">Marca</span>
            <select name="brandId" className="ops-field" defaultValue="">
              <option value="">Sin marca</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="ops-label">Color</span>
            <select name="colorId" className="ops-field" defaultValue="">
              <option value="">Sin color</option>
              {colors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="ops-label">Unidad de compra</span>
            <select name="unitId" className="ops-field" defaultValue={defaultUnitId} required>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} — {u.name}
                  {u.gramsPerUnit != null ? ` (${u.gramsPerUnit} g)` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="ops-label">Costo por unidad de compra</span>
            <input
              name="unitCost"
              type="number"
              step="0.01"
              className="ops-field"
              placeholder="19000"
              required
            />
          </div>
          <div>
            <span className="ops-label">Stock inicial</span>
            <input
              name="stockQty"
              type="number"
              step="any"
              min="0"
              className="ops-field"
              placeholder="0"
              defaultValue={0}
            />
          </div>
          <div className="md:col-span-2">
            <span className="ops-label">Notas</span>
            <input name="notes" className="ops-field" placeholder="Bobina 1 kg, lote…" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="ops-btn ops-btn-primary" disabled={units.length === 0}>
              Agregar insumo
            </button>
          </div>
        </form>
        {supplies.length === 0 ? (
          <p className="ops-empty py-4">Sin insumos todavía.</p>
        ) : (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Stock</th>
                <th>Compra</th>
                <th>Costo / g</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {supplies.map((s) => {
                const perGram = costPerGram(s.unitCost, s.unit.gramsPerUnit);
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="font-medium">
                        {[s.materialType || s.name, s.brand?.name, s.color?.name]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      <div className="text-xs text-[var(--ads-text-subtlest)]">
                        {s.name}
                        {s.notes ? ` · ${s.notes}` : ""}
                      </div>
                    </td>
                    <td className="tabular-nums font-medium">
                      {s.stockQty} {s.unit.code}
                    </td>
                    <td className="tabular-nums">
                      {formatMoney(s.unitCost)} / {s.unit.code}
                    </td>
                    <td className="tabular-nums text-[var(--ads-text-subtle)]">
                      {perGram != null ? formatMoneyDetailed(perGram) : "—"}
                    </td>
                    <td className="text-right">
                      <form action={deleteSupply.bind(null, s.id)}>
                        <button type="submit" className="ops-btn ops-btn-danger">
                          Eliminar
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="ops-card p-4">
        <h2 className="ops-section-title mb-3">Productos</h2>
        <form action={createProduct} className="mb-4 grid gap-2 md:grid-cols-2">
          <div>
            <span className="ops-label">Nombre</span>
            <input name="name" className="ops-field" required />
          </div>
          <div>
            <span className="ops-label">Marca</span>
            <select name="brandId" className="ops-field" defaultValue="">
              <option value="">Sin marca</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="ops-label">Precio venta</span>
            <input name="salePrice" type="number" step="0.01" className="ops-field" required />
          </div>
          <div>
            <span className="ops-label">Costo estimado</span>
            <input name="costEstimate" type="number" step="0.01" className="ops-field" />
          </div>
          <div className="md:col-span-2">
            <span className="ops-label">Link MakerWorld</span>
            <input name="makerWorldUrl" className="ops-field" />
          </div>
          <div className="md:col-span-2">
            <span className="ops-label">Notas</span>
            <input name="notes" className="ops-field" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="ops-btn ops-btn-primary">
              Agregar producto
            </button>
          </div>
        </form>
        {products.length === 0 ? (
          <p className="ops-empty py-4">Sin productos todavía.</p>
        ) : (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Venta</th>
                <th>Costo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-[var(--ads-text-subtlest)]">
                      {p.brand?.name ?? "Sin marca"}
                      {p.makerWorldUrl ? (
                        <>
                          {" · "}
                          <a href={p.makerWorldUrl} target="_blank" rel="noreferrer">
                            MakerWorld
                          </a>
                        </>
                      ) : null}
                    </div>
                  </td>
                  <td className="tabular-nums">{formatMoney(p.salePrice)}</td>
                  <td className="tabular-nums">
                    {p.costEstimate != null ? formatMoney(p.costEstimate) : "—"}
                  </td>
                  <td className="text-right">
                    <form action={deleteProduct.bind(null, p.id)}>
                      <button type="submit" className="ops-btn ops-btn-danger">
                        Eliminar
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
  );
}
