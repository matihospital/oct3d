import { serializeTiers, type StoredPricingTier } from "@oct3d/pricing";
import { PageHeader } from "@/components/ops/PageHeader";
import { getPricingSettings } from "@/lib/pricing-settings";
import { resetPricingSettings, updatePricingSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const pricing = await getPricingSettings();
  const tiers: StoredPricingTier[] = serializeTiers(pricing.tiers);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parámetros de cálculo"
        description="Electricidad, PLA de referencia, pisos y márgenes que usa la calculadora pública y los presupuestos."
        breadcrumbs={[{ label: "Ops", href: "/ops" }, { label: "Parámetros" }]}
      />

      <form action={updatePricingSettings} className="space-y-4">
        <input type="hidden" name="tierCount" value={tiers.length} />

        <section className="ops-card space-y-3 p-4">
          <h2 className="ops-section-title">Costos base</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="ops-label">Precio kWh ($)</span>
              <input
                name="kwhPrice"
                type="number"
                step="0.01"
                className="ops-field"
                defaultValue={pricing.kwhPrice}
                required
              />
            </label>
            <label className="block">
              <span className="ops-label">Consumo impresora (W)</span>
              <input
                name="printerWatts"
                type="number"
                step="1"
                className="ops-field"
                defaultValue={pricing.printerWatts}
                required
              />
            </label>
            <label className="block">
              <span className="ops-label">PLA referencia ($/kg)</span>
              <input
                name="plaPricePerKg"
                type="number"
                step="0.01"
                className="ops-field"
                defaultValue={pricing.plaPricePerKg}
                required
              />
              <span className="mt-1 block text-xs text-[var(--ads-text-subtlest)]">
                Fallback de la calculadora pública. En ops los insumos tienen su propio costo.
              </span>
            </label>
          </div>
        </section>

        <section className="ops-card space-y-3 p-4">
          <h2 className="ops-section-title">Pisos y volumen</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="ops-label">Piso público ($)</span>
              <input
                name="minRetailPrice"
                type="number"
                step="1"
                className="ops-field"
                defaultValue={pricing.minRetailPrice}
                required
              />
            </label>
            <label className="block">
              <span className="ops-label">Piso mayorista ($)</span>
              <input
                name="minWholesalePrice"
                type="number"
                step="1"
                className="ops-field"
                defaultValue={pricing.minWholesalePrice}
                required
              />
            </label>
            <label className="block">
              <span className="ops-label">Piso volumen ($)</span>
              <input
                name="minBulkPrice"
                type="number"
                step="1"
                className="ops-field"
                defaultValue={pricing.minBulkPrice}
                required
              />
            </label>
            <label className="block">
              <span className="ops-label">Cantidad mín. volumen</span>
              <input
                name="bulkQuantity"
                type="number"
                step="1"
                min={1}
                className="ops-field"
                defaultValue={pricing.bulkQuantity}
                required
              />
            </label>
            <label className="block">
              <span className="ops-label">Tope público p/ activar volumen ($)</span>
              <input
                name="bulkMaxRetailPrice"
                type="number"
                step="1"
                className="ops-field"
                defaultValue={pricing.bulkMaxRetailPrice}
                required
              />
            </label>
            <label className="block">
              <span className="ops-label">Alerta impresión larga (horas)</span>
              <input
                name="longPrintHours"
                type="number"
                step="0.5"
                className="ops-field"
                defaultValue={pricing.longPrintHours}
                required
              />
            </label>
          </div>
        </section>

        <section className="ops-card space-y-3 p-4">
          <h2 className="ops-section-title">Tramos de margen (multiplicadores)</h2>
          <p className="text-sm text-[var(--ads-text-subtle)]">
            Según el costo interno: público / mayorista / volumen. Dejá el tope vacío en el
            último tramo (sin límite).
          </p>
          <div className="overflow-x-auto">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Costo máx. ($)</th>
                  <th>× Público</th>
                  <th>× Mayorista</th>
                  <th>× Volumen</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        name={`tierMax_${i}`}
                        type="number"
                        step="1"
                        className="ops-field"
                        defaultValue={tier.maxCost ?? ""}
                        placeholder={i === tiers.length - 1 ? "sin tope" : ""}
                      />
                    </td>
                    <td>
                      <input
                        name={`tierRetail_${i}`}
                        type="number"
                        step="0.01"
                        className="ops-field"
                        defaultValue={tier.retailMultiplier}
                        required
                      />
                    </td>
                    <td>
                      <input
                        name={`tierWholesale_${i}`}
                        type="number"
                        step="0.01"
                        className="ops-field"
                        defaultValue={tier.wholesaleMultiplier}
                        required
                      />
                    </td>
                    <td>
                      <input
                        name={`tierBulk_${i}`}
                        type="number"
                        step="0.01"
                        className="ops-field"
                        defaultValue={tier.bulkMultiplier}
                        required
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="ops-btn ops-btn-primary">
            Guardar parámetros
          </button>
        </div>
      </form>

      <form action={resetPricingSettings}>
        <button type="submit" className="ops-btn ops-btn-default">
          Restaurar valores por defecto
        </button>
      </form>
    </div>
  );
}
