"use client";

import {
  calculateCosts,
  costPerGram,
  formatDuration,
  formatGrams,
  formatMoney,
  formatMoneyDetailed,
  isLongPrint,
  minutesToSeconds,
  unitPriceForQuantity,
  type PricingParams,
} from "@oct3d/pricing";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SupplyOption = {
  id: string;
  name: string;
  label: string;
  unitCost: number;
  gramsPerUnit: number | null;
  unitCode: string;
};

function plaPricePerKgFromSupply(supply: SupplyOption | null, fallback: number): number {
  if (!supply || supply.gramsPerUnit == null || supply.gramsPerUnit <= 0) {
    return fallback;
  }
  return (supply.unitCost / supply.gramsPerUnit) * 1000;
}

export function OpsCalculatorModal({
  open,
  onClose,
  supplies,
  pricing,
  longPrintHours,
}: {
  open: boolean;
  onClose: () => void;
  supplies: SupplyOption[];
  pricing: PricingParams;
  longPrintHours: number;
}) {
  const titleId = useId();
  const gramsRef = useRef<HTMLInputElement>(null);
  const massSupplies = useMemo(
    () => supplies.filter((s) => s.gramsPerUnit != null && s.gramsPerUnit > 0),
    [supplies],
  );

  const [supplyId, setSupplyId] = useState(massSupplies[0]?.id ?? "");
  const [grams, setGrams] = useState("");
  const [minutes, setMinutes] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => gramsRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (massSupplies.length === 0) {
      setSupplyId("");
      return;
    }
    if (!massSupplies.some((s) => s.id === supplyId)) {
      setSupplyId(massSupplies[0].id);
    }
  }, [massSupplies, supplyId]);

  const selected = massSupplies.find((s) => s.id === supplyId) ?? null;
  const perGram = selected
    ? costPerGram(selected.unitCost, selected.gramsPerUnit)
    : null;
  const plaPricePerKg = plaPricePerKgFromSupply(selected, pricing.plaPricePerKg);

  const weightGrams = Number(grams) || 0;
  const printMinutes = Number(minutes) || 0;
  const printSeconds = minutesToSeconds(printMinutes);
  const qty = Math.max(1, Math.floor(quantity) || 1);

  const costs = useMemo(() => {
    if (weightGrams <= 0 && printSeconds <= 0) return null;
    return calculateCosts(weightGrams, printSeconds, {
      ...pricing,
      plaPricePerKg,
    });
  }, [weightGrams, printSeconds, pricing, plaPricePerKg]);

  const unitPrice = costs
    ? unitPriceForQuantity(costs, qty, pricing.bulkQuantity)
    : 0;
  const orderTotal = unitPrice * qty;
  const longPrint = costs ? isLongPrint(costs.printTimeHours, longPrintHours) : false;

  if (!open) return null;

  return (
    <div className="ops-modal-root" role="presentation">
      <button
        type="button"
        className="ops-modal-backdrop"
        aria-label="Cerrar calculadora"
        onClick={onClose}
      />
      <div
        className="ops-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="ops-modal-header">
          <div>
            <h2 id={titleId} className="ops-section-title">
              Calculadora rápida
            </h2>
            <p className="text-sm text-[var(--ads-text-subtle)]">
              Gramos + filamento + minutos → costo y precio (misma fórmula que la pública).
            </p>
          </div>
          <button type="button" className="ops-btn ops-btn-subtle" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="ops-modal-body space-y-4">
          {massSupplies.length === 0 ? (
            <p className="ops-empty py-2">
              No hay insumos con unidad de masa (kg). Cargá filamento en Catálogo.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="ops-label">Insumo / filamento</span>
                  <select
                    className="ops-field"
                    value={supplyId}
                    onChange={(e) => setSupplyId(e.target.value)}
                  >
                    {massSupplies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} — {formatMoney(s.unitCost)}/{s.unitCode}
                      </option>
                    ))}
                  </select>
                  {perGram != null ? (
                    <span className="ops-hint">
                      Costo {formatMoneyDetailed(perGram)}/g · equiv.{" "}
                      {formatMoney(plaPricePerKg)}/kg
                    </span>
                  ) : null}
                </label>

                <label className="block">
                  <span className="ops-label">Gramos</span>
                  <input
                    ref={gramsRef}
                    type="number"
                    min="0"
                    step="any"
                    className="ops-field"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    placeholder="45"
                  />
                </label>

                <label className="block">
                  <span className="ops-label">Minutos de impresión</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="ops-field"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    placeholder="120"
                  />
                </label>

                <label className="block">
                  <span className="ops-label">Cantidad (canal)</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="ops-field"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                  />
                  <span className="ops-hint">
                    1 = público · 2+ = mayorista · {pricing.bulkQuantity}+ = bulk
                  </span>
                </label>
              </div>

              {costs ? (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Metric
                      label="Costo filamento"
                      value={formatMoney(costs.filamentCost)}
                    />
                    <Metric
                      label="Costo electricidad"
                      value={formatMoney(costs.electricCost)}
                    />
                    <Metric
                      label="Costo total"
                      value={formatMoney(costs.totalCost)}
                      emphasis
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <PriceTile
                      label="Público"
                      price={formatMoney(costs.retailPrice)}
                      active={qty === 1}
                    />
                    <PriceTile
                      label="Mayorista"
                      price={formatMoney(costs.wholesalePrice)}
                      active={qty > 1 && !(costs.bulkEligible && qty >= pricing.bulkQuantity)}
                    />
                    <PriceTile
                      label={`Bulk (${pricing.bulkQuantity}+)`}
                      price={
                        costs.bulkPrice != null
                          ? formatMoney(costs.bulkPrice)
                          : "No aplica"
                      }
                      active={
                        Boolean(
                          costs.bulkEligible &&
                            costs.bulkPrice != null &&
                            qty >= pricing.bulkQuantity,
                        )
                      }
                      muted={costs.bulkPrice == null}
                    />
                  </div>

                  <div className="rounded-[var(--ads-radius-lg)] border border-[var(--ads-border)] bg-[var(--ads-bg-selected)] px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ads-text-subtlest)]">
                      Para este pedido ({qty} u.)
                    </p>
                    <p className="ops-metric mt-1 text-xl">
                      {formatMoney(unitPrice)} / u · total {formatMoney(orderTotal)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ads-text-subtle)]">
                      {formatGrams(costs.weightGrams)} · {formatDuration(costs.printTimeSeconds)}
                      {longPrint ? ` · impresión larga (>${longPrintHours} h)` : ""}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ads-text-subtle)]">
                      Margen unitario{" "}
                      {formatMoney(unitPrice - costs.totalCost)} (
                      {unitPrice > 0
                        ? `${(((unitPrice - costs.totalCost) / unitPrice) * 100).toFixed(0)}%`
                        : "—"}
                      )
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--ads-text-subtle)]">
                  Ingresá gramos y/o minutos para ver el resultado.
                </p>
              )}
            </>
          )}
        </div>

        <div className="ops-modal-footer">
          <span className="text-xs text-[var(--ads-text-subtlest)]">
            Atajo: Ctrl+K / ⌘K
          </span>
          <button type="button" className="ops-btn ops-btn-primary" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-[var(--ads-radius)] border border-[var(--ads-border)] bg-[var(--ads-bg)] px-3 py-2">
      <p className="text-xs text-[var(--ads-text-subtlest)]">{label}</p>
      <p className={`tabular-nums font-semibold ${emphasis ? "ops-metric" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function PriceTile({
  label,
  price,
  active,
  muted,
}: {
  label: string;
  price: string;
  active?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--ads-radius)] border px-3 py-2 ${
        active
          ? "border-[var(--ads-brand)] bg-[var(--ads-bg-selected)]"
          : "border-[var(--ads-border)] bg-[var(--ads-bg-raised)]"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ads-text-subtlest)]">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${
          muted ? "text-[var(--ads-text-subtlest)]" : "text-[var(--ads-text)]"
        }`}
      >
        {price}
      </p>
    </div>
  );
}
