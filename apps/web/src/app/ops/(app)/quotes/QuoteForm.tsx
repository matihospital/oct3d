"use client";

import {
  calculateCosts,
  formatBoundingBoxCm,
  formatDuration,
  formatGrams,
  formatMoney,
  formatPercent,
  formatScaleLabel,
  marginFromTotals,
  scaleBoundingBox,
  scaleFactorFromPercent,
  scaleVolumeMetric,
  type PricingParams,
} from "@oct3d/pricing";
import { makerWorldProfileUrl } from "@/lib/makerworld";
import type { MakerWorldModel, MakerWorldProfile } from "@/lib/types";
import {
  LineColorPicker,
  type ColorOption,
  type LineColorUsage,
} from "@/components/ops/LineColorPicker";
import { useMemo, useState } from "react";
import { createQuote, createQuoteAsOrder, updateQuote, type QuoteLineDraft } from "./actions";

type ProductOption = {
  id: string;
  name: string;
  salePrice: number;
  costEstimate: number | null;
  makerWorldUrl: string | null;
};

export type QuoteFormInitial = {
  clientName?: string | null;
  notes?: string | null;
  lines: QuoteLineDraft[];
};

export function QuoteForm({
  products,
  colors,
  pricing,
  quoteId,
  initial,
}: {
  products: ProductOption[];
  colors: ColorOption[];
  pricing: PricingParams;
  quoteId?: string;
  initial?: QuoteFormInitial;
}) {
  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [mwUrl, setMwUrl] = useState("");
  const [mwModel, setMwModel] = useState<MakerWorldModel | null>(null);
  const [mwSelectedIds, setMwSelectedIds] = useState<number[]>([]);
  const [mwScalePercent, setMwScalePercent] = useState(100);
  const [mwLengthCm, setMwLengthCm] = useState("");
  const [mwWidthCm, setMwWidthCm] = useState("");
  const [mwHeightCm, setMwHeightCm] = useState("");
  const [mwLoading, setMwLoading] = useState(false);
  const [mwError, setMwError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<QuoteLineDraft[]>(initial?.lines ?? []);

  const scale = scaleFactorFromPercent(mwScalePercent);
  const hasOriginalBox =
    Number(mwLengthCm) > 0 && Number(mwWidthCm) > 0 && Number(mwHeightCm) > 0;
  const scaledBoxPreview = useMemo(() => {
    if (!hasOriginalBox) return null;
    return scaleBoundingBox(
      {
        lengthCm: Number(mwLengthCm),
        widthCm: Number(mwWidthCm),
        heightCm: Number(mwHeightCm),
      },
      scale,
    );
  }, [hasOriginalBox, mwLengthCm, mwWidthCm, mwHeightCm, scale]);

  const totals = useMemo(() => {
    const totalPrice = lines.reduce(
      (s, l) => s + Math.max(1, Math.floor(l.quantity || 1)) * (l.unitPrice || 0),
      0,
    );
    const totalCost = lines.reduce(
      (s, l) => s + Math.max(1, Math.floor(l.quantity || 1)) * (l.unitCost || 0),
      0,
    );
    return { totalPrice, totalCost, ...marginFromTotals(totalPrice, totalCost) };
  }, [lines]);

  function updateLine(index: number, patch: Partial<QuoteLineDraft>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addManualLine() {
    setLines((prev) => [
      ...prev,
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
        unitCost: 0,
        link: "",
        productId: "",
        colorIds: [],
        colors: [],
      },
    ]);
  }

  function onProductPick(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      updateLine(index, { productId: "" });
      return;
    }
    updateLine(index, {
      productId,
      description: product.name,
      unitPrice: product.salePrice,
      unitCost: product.costEstimate ?? 0,
      link: product.makerWorldUrl ?? "",
    });
  }

  function toggleProfile(id: number) {
    setMwSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAllProfiles() {
    if (!mwModel) return;
    setMwSelectedIds(mwModel.profiles.map((p) => p.id));
  }

  function clearProfileSelection() {
    setMwSelectedIds([]);
  }

  async function fetchMakerWorld() {
    setMwError(null);
    setMwLoading(true);
    setMwModel(null);
    setMwSelectedIds([]);
    try {
      const res = await fetch(`/api/makerworld?url=${encodeURIComponent(mwUrl.trim())}`);
      const data = (await res.json()) as MakerWorldModel & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo consultar MakerWorld");
      if (!data.profiles?.length) throw new Error("Sin perfiles de impresión");
      setMwModel(data);
      setMwSelectedIds(
        data.selectedProfileId
          ? [data.selectedProfileId]
          : data.profiles[0]
            ? [data.profiles[0].id]
            : [],
      );
    } catch (err) {
      setMwError(err instanceof Error ? err.message : "Error");
    } finally {
      setMwLoading(false);
    }
  }

  function lineFromProfile(model: MakerWorldModel, profile: MakerWorldProfile): QuoteLineDraft {
    const weightGrams = scaleVolumeMetric(profile.weightGrams, scale);
    const printTimeSeconds = scaleVolumeMetric(profile.printTimeSeconds, scale);
    const costs = calculateCosts(weightGrams, printTimeSeconds, pricing);
    const parts = [model.title, profile.title];
    if (Math.abs(mwScalePercent - 100) > 0.05) {
      parts.push(`escala ${formatScaleLabel(mwScalePercent)}`);
    }
    if (scaledBoxPreview) {
      parts.push(formatBoundingBoxCm(scaledBoxPreview));
    }
    return {
      description: parts.join(" · "),
      quantity: 1,
      unitPrice: costs.retailPrice,
      unitCost: costs.totalCost,
      link: makerWorldProfileUrl(mwUrl, profile.id),
      productId: "",
      colorIds: [],
      colors: [],
    };
  }

  function addSelectedProfiles() {
    if (!mwModel || mwSelectedIds.length === 0) {
      setMwError("Seleccioná al menos un perfil / variante.");
      return;
    }
    setMwError(null);
    const selected = mwModel.profiles.filter((p) => mwSelectedIds.includes(p.id));
    const newLines = selected.map((p) => lineFromProfile(mwModel, p));
    setLines((prev) => [...prev, ...newLines]);
  }

  async function save(mode: "quote" | "order") {
    setSaving(true);
    setError(null);
    try {
      const cleaned = lines
        .map((l) => ({
          ...l,
          description: l.description.trim(),
          quantity: Math.max(1, Math.floor(l.quantity || 1)),
          productId: l.productId || null,
          link: l.link?.trim() || null,
          colorIds: l.colorIds ?? [],
          colors: l.colors ?? [],
        }))
        .filter((l) => l.description);
      if (!cleaned.length) throw new Error("Agregá al menos una línea con descripción");
      if (quoteId) {
        await updateQuote(quoteId, {
          clientName,
          notes,
          lines: cleaned,
        });
        return;
      }
      if (mode === "order") {
        await createQuoteAsOrder({
          clientName,
          notes,
          referenceLinks: [],
          deliveryDate: deliveryDate || null,
          lines: cleaned,
        });
      } else {
        await createQuote({
          clientName,
          notes,
          referenceLinks: [],
          lines: cleaned,
        });
      }
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "digest" in err &&
        String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await save("quote");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <section className="ops-card grid gap-3 p-4 md:grid-cols-2">
        <h2 className="ops-section-title md:col-span-2">Datos del presupuesto</h2>
        <label className="block">
          <span className="ops-label">Cliente</span>
          <input
            className="ops-field"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Nombre, taller o empresa"
          />
          <span className="ops-hint">A quién le estás cotizando. Podés dejarlo vacío.</span>
        </label>
        {!quoteId ? (
          <label className="block">
            <span className="ops-label">Fecha de entrega (si ya es pedido)</span>
            <input
              type="date"
              className="ops-field"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
            <span className="ops-hint">Se usa al guardar directo como pedido.</span>
          </label>
        ) : null}
        <label className="block md:col-span-2">
          <span className="ops-label">Notas internas</span>
          <input
            className="ops-field"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. entrega viernes, color a confirmar…"
          />
          <span className="ops-hint">Comentarios para vos / el taller. No son el detalle de cada pieza.</span>
        </label>
      </section>

      <section className="ops-card space-y-3 p-4">
        <h2 className="ops-section-title">Traer piezas desde MakerWorld (opcional)</h2>
        <p className="text-sm text-[var(--ads-text-subtle)]">
          Pegá el link del modelo, consultá las variantes y marcá las que querés cotizar.
          Cada variante se agrega como un ítem abajo, con su precio/costo y su propio link.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block min-w-[16rem] flex-1">
            <span className="ops-label">Link del modelo en MakerWorld</span>
            <input
              className="ops-field"
              value={mwUrl}
              onChange={(e) => {
                setMwUrl(e.target.value);
                setMwModel(null);
                setMwSelectedIds([]);
              }}
              placeholder="https://makerworld.com/en/models/..."
            />
            <span className="ops-hint">URL completa de la página del modelo.</span>
          </label>
          <button
            type="button"
            className="ops-btn ops-btn-default"
            disabled={!mwUrl.trim() || mwLoading}
            onClick={() => void fetchMakerWorld()}
          >
            {mwLoading ? "Consultando…" : "Consultar variantes"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="ops-label">Escala de impresión (%)</span>
            <input
              type="number"
              min={1}
              step={1}
              className="ops-field"
              value={mwScalePercent}
              onChange={(e) => setMwScalePercent(Math.max(1, Number(e.target.value) || 100))}
            />
            <span className="ops-hint">100 = tamaño original. 150 = 50% más grande. Ajusta peso y tiempo.</span>
          </label>
          <label className="block">
            <span className="ops-label">Largo original (cm)</span>
            <input
              type="number"
              min={0}
              step="0.1"
              className="ops-field"
              value={mwLengthCm}
              onChange={(e) => setMwLengthCm(e.target.value)}
              placeholder="Opcional"
            />
            <span className="ops-hint">Medida del archivo original, si la sabés.</span>
          </label>
          <label className="block">
            <span className="ops-label">Ancho original (cm)</span>
            <input
              type="number"
              min={0}
              step="0.1"
              className="ops-field"
              value={mwWidthCm}
              onChange={(e) => setMwWidthCm(e.target.value)}
              placeholder="Opcional"
            />
            <span className="ops-hint">Medida del archivo original, si la sabés.</span>
          </label>
          <label className="block">
            <span className="ops-label">Alto original (cm)</span>
            <input
              type="number"
              min={0}
              step="0.1"
              className="ops-field"
              value={mwHeightCm}
              onChange={(e) => setMwHeightCm(e.target.value)}
              placeholder="Opcional"
            />
            <span className="ops-hint">Con las 3 medidas te mostramos el tamaño final al escalar.</span>
          </label>
        </div>

        {Math.abs(mwScalePercent - 100) > 0.05 || scaledBoxPreview ? (
          <p className="text-sm text-[var(--ads-text-subtle)]">
            Factor ×{scale.toFixed(2)} · volumen ×{(scale ** 3).toFixed(2)}
            {scaledBoxPreview
              ? ` · medida final ${formatBoundingBoxCm(scaledBoxPreview)}`
              : null}
          </p>
        ) : null}

        {mwModel ? (
          <div className="space-y-2 rounded-[var(--ads-radius-lg)] border border-[var(--ads-border)] bg-[var(--ads-bg)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-[var(--ads-text)]">{mwModel.title}</p>
              <div className="flex gap-2">
                <button type="button" className="ops-btn ops-btn-subtle" onClick={selectAllProfiles}>
                  Todos
                </button>
                <button
                  type="button"
                  className="ops-btn ops-btn-subtle"
                  onClick={clearProfileSelection}
                >
                  Ninguno
                </button>
              </div>
            </div>
            <ul className="space-y-2">
              {mwModel.profiles.map((profile) => {
                const checked = mwSelectedIds.includes(profile.id);
                const weight = scaleVolumeMetric(profile.weightGrams, scale);
                const time = scaleVolumeMetric(profile.printTimeSeconds, scale);
                const costs = calculateCosts(weight, time, pricing);
                return (
                  <li key={profile.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--ads-radius)] border border-[var(--ads-border)] bg-[var(--ads-bg-raised)] px-3 py-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => toggleProfile(profile.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-[var(--ads-text)]">
                          {profile.title}
                          {profile.isDefault ? (
                            <span className="ml-2 text-xs font-normal text-[var(--ads-text-subtlest)]">
                              default
                            </span>
                          ) : null}
                        </span>
                        <span className="block text-xs text-[var(--ads-text-subtle)]">
                          {formatGrams(weight)} · {formatDuration(time)} · venta{" "}
                          {formatMoney(costs.retailPrice)} · costo {formatMoney(costs.totalCost)}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="ops-btn ops-btn-primary"
              disabled={mwSelectedIds.length === 0}
              onClick={addSelectedProfiles}
            >
              Agregar {mwSelectedIds.length || ""}{" "}
              {mwSelectedIds.length === 1 ? "ítem" : "ítems"} al presupuesto
            </button>
          </div>
        ) : null}

        {mwError ? <p className="text-sm text-[var(--ads-danger)]">{mwError}</p> : null}
      </section>

      <section className="ops-card space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="ops-section-title">Ítems a cotizar</h2>
            <p className="mt-1 text-sm text-[var(--ads-text-subtle)]">
              Acá van las piezas del presupuesto. Cada tarjeta es un ítem con nombre,
              cantidad, precio de venta y costo.
            </p>
          </div>
          <button
            type="button"
            className="ops-btn ops-btn-default"
            onClick={addManualLine}
          >
            + Agregar ítem a mano
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="ops-empty rounded-[var(--ads-radius-lg)] border border-dashed border-[var(--ads-border)]">
            Todavía no hay ítems. Usá MakerWorld arriba o tocá “Agregar ítem a mano”.
          </p>
        ) : null}

        {lines.map((line, index) => {
          const qty = Math.max(1, Math.floor(line.quantity || 1));
          const lineTotal = qty * (line.unitPrice || 0);
          const lineCostTotal = qty * (line.unitCost || 0);
          return (
            <div
              key={index}
              className="space-y-4 rounded-[var(--ads-radius-lg)] border border-[var(--ads-border)] bg-[var(--ads-bg-raised)] p-4 shadow-[var(--ads-shadow)]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-bold text-[var(--ads-text)]">Pieza #{index + 1}</p>
                <button
                  type="button"
                  className="ops-btn ops-btn-subtle"
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                >
                  Quitar esta pieza
                </button>
              </div>

              <div>
                <div className="ops-label">1. Origen (opcional)</div>
                <select
                  className="ops-field"
                  value={line.productId ?? ""}
                  onChange={(e) => onProductPick(index, e.target.value)}
                >
                  <option value="">No usar catálogo — completar a mano</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      Usar producto: {p.name}
                    </option>
                  ))}
                </select>
                <span className="ops-hint">
                  Solo si ya está en Catálogo. Si viene de MakerWorld, dejá “No usar
                  catálogo”.
                </span>
              </div>

              <div>
                <div className="ops-label">2. Nombre de la pieza</div>
                <input
                  className="ops-field"
                  value={line.description}
                  onChange={(e) => updateLine(index, { description: e.target.value })}
                  placeholder="Ejemplo: Soporte auriculares · versión A1"
                  required
                />
                <span className="ops-hint">Cómo se llama este ítem en el presupuesto.</span>
              </div>

              <LineColorPicker
                colors={colors}
                value={line.colors ?? []}
                onChange={(next: LineColorUsage[]) => updateLine(index, { colors: next })}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="ops-label">3. Cantidad</div>
                  <input
                    type="number"
                    min={1}
                    className="ops-field"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(index, { quantity: Number(e.target.value) || 1 })
                    }
                  />
                  <span className="ops-hint">Cuántas unidades iguales.</span>
                </div>
                <div>
                  <div className="ops-label">4. Precio de venta ($)</div>
                  <input
                    type="number"
                    step="0.01"
                    className="ops-field"
                    value={line.unitPrice}
                    onChange={(e) =>
                      updateLine(index, { unitPrice: Number(e.target.value) || 0 })
                    }
                  />
                  <span className="ops-hint">Lo que cobrás por cada unidad.</span>
                </div>
                <div>
                  <div className="ops-label">5. Costo de producción ($)</div>
                  <input
                    type="number"
                    step="0.01"
                    className="ops-field"
                    value={line.unitCost}
                    onChange={(e) =>
                      updateLine(index, { unitCost: Number(e.target.value) || 0 })
                    }
                  />
                  <span className="ops-hint">Lo que te sale producir cada unidad.</span>
                </div>
              </div>

              <div>
                <div className="ops-label">6. Link MakerWorld de esta pieza</div>
                <input
                  className="ops-field"
                  value={line.link ?? ""}
                  onChange={(e) => updateLine(index, { link: e.target.value })}
                  placeholder="https://makerworld.com/..."
                />
                <span className="ops-hint">
                  Se guarda en esta pieza (no en la cabecera del presupuesto).
                </span>
              </div>

              <p className="rounded-[var(--ads-radius)] bg-[var(--ads-bg-selected)] px-3 py-2 text-sm text-[var(--ads-text)]">
                <strong>Resumen de esta pieza:</strong> cobrás {formatMoney(lineTotal)} · te
                cuesta {formatMoney(lineCostTotal)} · margen{" "}
                {formatMoney(lineTotal - lineCostTotal)}
              </p>
            </div>
          );
        })}

        <div className="flex justify-end">
          <button
            type="button"
            className="ops-btn ops-btn-default"
            onClick={addManualLine}
          >
            + Agregar ítem a mano
          </button>
        </div>
      </section>

      <section className="ops-card p-4">
        <h2 className="ops-section-title mb-1">Total del presupuesto</h2>
        <p className="text-sm text-[var(--ads-text-subtle)]">
          Suma de todos los ítems: lo que cobrás vs lo que te cuesta.
        </p>
        <p className="mt-2 text-sm text-[var(--ads-text-subtle)]">
          Precio {formatMoney(totals.totalPrice)} · Costo {formatMoney(totals.totalCost)}
        </p>
        <p className="ops-metric mt-1 text-xl">
          Margen {formatMoney(totals.marginAmount)} ({formatPercent(totals.marginPercent)})
        </p>
      </section>

      {error ? <p className="text-sm text-[var(--ads-danger)]">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="ops-btn ops-btn-primary" disabled={saving}>
          {saving
            ? "Guardando…"
            : quoteId
              ? "Guardar cambios"
              : "Guardar presupuesto"}
        </button>
        {!quoteId ? (
          <button
            type="button"
            className="ops-btn ops-btn-default"
            disabled={saving}
            onClick={() => void save("order")}
          >
            Guardar y crear pedido
          </button>
        ) : null}
      </div>
    </form>
  );
}
