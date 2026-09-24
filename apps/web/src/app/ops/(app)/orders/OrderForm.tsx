"use client";

import { formatMoney, formatPercent, marginFromTotals } from "@oct3d/pricing";
import { useMemo, useState } from "react";
import {
  LineColorPicker,
  type ColorOption,
  type LineColorUsage,
} from "@/components/ops/LineColorPicker";
import type { OrderMaterialDraft } from "@/lib/order-stock";
import type { QuoteLineDraft } from "../quotes/actions";
import { createOrder, updateOrder } from "./actions";

type ProductOption = {
  id: string;
  name: string;
  salePrice: number;
  costEstimate: number | null;
  makerWorldUrl: string | null;
};

export type SupplyOption = {
  id: string;
  label: string;
  unitCode: string;
  gramsPerUnit: number | null;
  stockQty: number;
};

export type OrderFormInitial = {
  clientName?: string | null;
  notes?: string | null;
  deliveryDate?: string | null;
  lines: QuoteLineDraft[];
  materials?: OrderMaterialDraft[];
};

function emptyLine(): QuoteLineDraft {
  return {
    description: "",
    quantity: 1,
    unitPrice: 0,
    unitCost: 0,
    link: "",
    productId: "",
    colors: [],
  };
}

function emptyMaterial(defaultSupplyId = ""): OrderMaterialDraft {
  return { supplyId: defaultSupplyId, grams: 0 };
}

export function OrderForm({
  products,
  colors,
  supplies,
  orderId,
  initial,
}: {
  products: ProductOption[];
  colors: ColorOption[];
  supplies: SupplyOption[];
  orderId?: string;
  initial?: OrderFormInitial;
}) {
  const massSupplies = useMemo(
    () => supplies.filter((s) => s.gramsPerUnit != null && s.gramsPerUnit > 0),
    [supplies],
  );
  const defaultSupplyId = massSupplies[0]?.id ?? "";

  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [deliveryDate, setDeliveryDate] = useState(initial?.deliveryDate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<QuoteLineDraft[]>(
    initial?.lines?.length ? initial.lines : [emptyLine()],
  );
  const [materials, setMaterials] = useState<OrderMaterialDraft[]>(
    initial?.materials?.length
      ? initial.materials
      : [],
  );

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

  function updateMaterial(index: number, patch: Partial<OrderMaterialDraft>) {
    setMaterials((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    );
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
          colors: (l.colors ?? []).filter((c) => c.colorId),
        }))
        .filter((l) => l.description);
      if (!cleaned.length) throw new Error("Agregá al menos una línea con descripción");
      const cleanedMaterials = materials.filter(
        (m) => m.supplyId && Number(m.grams) > 0,
      );
      const payload = {
        clientName,
        notes,
        deliveryDate: deliveryDate || null,
        lines: cleaned,
        materials: cleanedMaterials,
      };
      if (orderId) {
        await updateOrder(orderId, payload);
      } else {
        await createOrder(payload);
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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <section className="ops-card grid gap-3 p-4 md:grid-cols-2">
        <label className="block">
          <span className="ops-label">Cliente</span>
          <input
            className="ops-field"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="ops-label">Fecha de entrega</span>
          <input
            type="date"
            className="ops-field"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="ops-label">Notas</span>
          <input className="ops-field" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </section>

      <section className="ops-card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="ops-section-title">Líneas</h2>
          <button
            type="button"
            className="ops-btn ops-btn-default"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            Agregar línea
          </button>
        </div>
        {lines.map((line, index) => (
          <div
            key={index}
            className="space-y-2 rounded-[var(--ads-radius-lg)] border border-[var(--ads-border)] bg-[var(--ads-bg)] p-3"
          >
            <select
              className="ops-field"
              value={line.productId ?? ""}
              onChange={(e) => onProductPick(index, e.target.value)}
            >
              <option value="">Ítem libre / catálogo…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              className="ops-field"
              placeholder="Descripción"
              value={line.description}
              onChange={(e) => updateLine(index, { description: e.target.value })}
              required
            />
            <LineColorPicker
              colors={colors}
              value={line.colors ?? []}
              onChange={(next: LineColorUsage[]) => updateLine(index, { colors: next })}
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <span className="ops-label">Cantidad</span>
                <input
                  type="number"
                  min={1}
                  className="ops-field"
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: Number(e.target.value) || 1 })}
                />
              </div>
              <div>
                <span className="ops-label">Precio u.</span>
                <input
                  type="number"
                  step="0.01"
                  className="ops-field"
                  placeholder="Precio u."
                  value={line.unitPrice}
                  onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <span className="ops-label">Costo u.</span>
                <input
                  type="number"
                  step="0.01"
                  className="ops-field"
                  placeholder="Costo u."
                  value={line.unitCost}
                  onChange={(e) => updateLine(index, { unitCost: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <input
              className="ops-field"
              placeholder="Link"
              value={line.link ?? ""}
              onChange={(e) => updateLine(index, { link: e.target.value })}
            />
            {lines.length > 1 ? (
              <button
                type="button"
                className="ops-btn ops-btn-subtle"
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
              >
                Quitar línea
              </button>
            ) : null}
          </div>
        ))}
        <div className="flex justify-end">
          <button
            type="button"
            className="ops-btn ops-btn-default"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            Agregar línea
          </button>
        </div>
      </section>

      <section className="ops-card space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="ops-section-title">Materiales extra (stock)</h2>
            <p className="mt-1 text-sm text-[var(--ads-text-subtle)]">
              Los gramos por color de las líneas ya generan compromiso de stock (si hay
              insumo de ese color). Acá podés sumar filamento extra o sin color.
            </p>
          </div>
          <button
            type="button"
            className="ops-btn ops-btn-default"
            disabled={massSupplies.length === 0}
            onClick={() =>
              setMaterials((prev) => [...prev, emptyMaterial(defaultSupplyId)])
            }
          >
            Agregar material
          </button>
        </div>
        {massSupplies.length === 0 ? (
          <p className="ops-empty py-2">
            No hay insumos con unidad de masa. Cargá filamento en Catálogo.
          </p>
        ) : materials.length === 0 ? (
          <p className="text-sm text-[var(--ads-text-subtle)]">
            Opcional. Si no cargás materiales, el stock no se mueve con este pedido.
          </p>
        ) : (
          materials.map((m, index) => {
            const supply = massSupplies.find((s) => s.id === m.supplyId);
            const kgHint =
              supply?.gramsPerUnit && m.grams > 0
                ? `≈ ${(m.grams / supply.gramsPerUnit).toFixed(3)} ${supply.unitCode}`
                : null;
            return (
              <div
                key={index}
                className="grid gap-2 rounded-[var(--ads-radius-lg)] border border-[var(--ads-border)] bg-[var(--ads-bg)] p-3 sm:grid-cols-[1fr_8rem_auto]"
              >
                <div>
                  <span className="ops-label">Insumo</span>
                  <select
                    className="ops-field"
                    value={m.supplyId}
                    onChange={(e) => updateMaterial(index, { supplyId: e.target.value })}
                  >
                    {massSupplies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} (stock {s.stockQty} {s.unitCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="ops-label">Gramos</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="ops-field"
                    value={m.grams || ""}
                    onChange={(e) =>
                      updateMaterial(index, { grams: Number(e.target.value) || 0 })
                    }
                    placeholder="45"
                  />
                  {kgHint ? <span className="ops-hint">{kgHint}</span> : null}
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="ops-btn ops-btn-subtle"
                    onClick={() =>
                      setMaterials((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    Quitar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      <section className="ops-card p-4">
        <p className="text-sm text-[var(--ads-text-subtle)]">
          Precio {formatMoney(totals.totalPrice)} · Costo {formatMoney(totals.totalCost)}
        </p>
        <p className="ops-metric mt-1 text-xl">
          Margen {formatMoney(totals.marginAmount)} ({formatPercent(totals.marginPercent)})
        </p>
      </section>

      {error ? <p className="text-sm text-[var(--ads-danger)]">{error}</p> : null}

      <button type="submit" className="ops-btn ops-btn-primary" disabled={saving}>
        {saving ? "Guardando…" : orderId ? "Guardar cambios" : "Guardar pedido"}
      </button>
    </form>
  );
}
