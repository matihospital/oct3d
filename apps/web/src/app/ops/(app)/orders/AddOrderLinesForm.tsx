"use client";

import { formatMoney } from "@oct3d/pricing";
import { useMemo, useState } from "react";
import {
  LineColorPicker,
  type ColorOption,
  type LineColorUsage,
} from "@/components/ops/LineColorPicker";
import type { QuoteLineDraft } from "../quotes/actions";
import { addOrderLines } from "./actions";

type ProductOption = {
  id: string;
  name: string;
  salePrice: number;
  costEstimate: number | null;
  makerWorldUrl: string | null;
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

export function AddOrderLinesForm({
  orderId,
  products,
  colors,
  children,
}: {
  orderId: string;
  products: ProductOption[];
  colors: ColorOption[];
  /** Contenido entre los botones (tabla de líneas existentes). */
  children?: React.ReactNode;
}) {
  const [lines, setLines] = useState<QuoteLineDraft[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const previewTotal = useMemo(
    () =>
      lines.reduce(
        (s, l) =>
          s + Math.max(1, Math.floor(l.quantity || 1)) * (l.unitPrice || 0),
        0,
      ),
    [lines],
  );

  function updateLine(index: number, patch: Partial<QuoteLineDraft>) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
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
      if (!cleaned.length) {
        throw new Error("Agregá al menos una línea con descripción");
      }
      await addOrderLines(orderId, cleaned);
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "digest" in err &&
        String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      setError(err instanceof Error ? err.message : "No se pudo agregar");
      setSaving(false);
    }
  }

  function openButton(border: "b" | "t") {
    return (
      <div
        className={`flex justify-end px-4 py-3 ${
          border === "b"
            ? "border-b border-[var(--ads-border)]"
            : "border-t border-[var(--ads-border)]"
        }`}
      >
        <button
          type="button"
          className="ops-btn ops-btn-primary"
          onClick={() => setOpen(true)}
        >
          Agregar líneas
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <>
        {openButton("b")}
        {children}
        {openButton("t")}
      </>
    );
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="space-y-3 border-b border-[var(--ads-border)] bg-[var(--ads-bg-raised)] p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--ads-text)]">
            Nuevas líneas
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ops-btn ops-btn-default"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
            >
              + Otra línea
            </button>
            <button
              type="button"
              className="ops-btn ops-btn-subtle"
              onClick={() => {
                setOpen(false);
                setLines([emptyLine()]);
                setError(null);
              }}
            >
              Cancelar
            </button>
          </div>
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
              onChange={(next: LineColorUsage[]) =>
                updateLine(index, { colors: next })
              }
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <span className="ops-label">Cantidad</span>
                <input
                  type="number"
                  min={1}
                  className="ops-field"
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(index, { quantity: Number(e.target.value) || 1 })
                  }
                />
              </div>
              <div>
                <span className="ops-label">Precio u.</span>
                <input
                  type="number"
                  step="0.01"
                  className="ops-field"
                  value={line.unitPrice}
                  onChange={(e) =>
                    updateLine(index, { unitPrice: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <span className="ops-label">Costo u.</span>
                <input
                  type="number"
                  step="0.01"
                  className="ops-field"
                  value={line.unitCost}
                  onChange={(e) =>
                    updateLine(index, { unitCost: Number(e.target.value) || 0 })
                  }
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
                onClick={() =>
                  setLines((prev) => prev.filter((_, i) => i !== index))
                }
              >
                Quitar
              </button>
            ) : null}
          </div>
        ))}

        <p className="text-sm text-[var(--ads-text-subtle)]">
          Suma a agregar: {formatMoney(previewTotal)}
        </p>
        {error ? <p className="text-sm text-[var(--ads-danger)]">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ops-btn ops-btn-default"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            + Otra línea
          </button>
          <button type="submit" className="ops-btn ops-btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Sumar al pedido"}
          </button>
        </div>
      </form>
      {children}
    </>
  );
}

