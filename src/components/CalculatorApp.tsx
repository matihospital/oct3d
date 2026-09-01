"use client";

import {
  calculateCosts,
  isLongPrint,
  unitPriceForQuantity,
} from "@/lib/calculator";
import { DEFAULT_PRICING, LONG_PRINT_HOURS } from "@/lib/constants";
import { formatDuration, formatGrams, formatMoney } from "@/lib/format";
import type { CostBreakdown, MakerWorldModel } from "@/lib/types";
import { useCallback, useMemo, useState } from "react";

const EXAMPLE_URL =
  "https://makerworld.com/en/models/380261-weapons-pack-for-dummy-13#profileId-414004";

function PriceCard({
  label,
  subtitle,
  price,
  variant,
  active,
}: {
  label: string;
  subtitle: string;
  price: string;
  variant: "retail" | "wholesale" | "bulk";
  active?: boolean;
}) {
  const colorClass =
    variant === "retail"
      ? "text-ok"
      : variant === "wholesale"
        ? "text-teal"
        : "text-accent";

  return (
    <div
      className={`price-card price-card-${variant} rise-in ${active ? "price-card-active" : ""}`}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-muted">{label}</p>
      <p className={`stat-value font-display text-3xl font-bold md:text-4xl ${colorClass}`}>
        {price}
      </p>
      <p className="text-sm text-muted">{subtitle}</p>
      {active ? (
        <p className="text-xs font-bold uppercase tracking-wider text-ink">Aplica a este pedido</p>
      ) : null}
    </div>
  );
}

function activePriceTier(
  costs: CostBreakdown,
  quantity: number,
): "retail" | "wholesale" | "bulk" {
  const qty = Math.max(1, Math.floor(quantity));
  if (
    costs.bulkEligible &&
    costs.bulkPrice !== null &&
    qty >= DEFAULT_PRICING.bulkQuantity
  ) {
    return "bulk";
  }
  if (qty > 1) return "wholesale";
  return "retail";
}

export function CalculatorApp() {
  const [url, setUrl] = useState("");
  const [model, setModel] = useState<MakerWorldModel | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const activeProfile = useMemo(() => {
    if (!model || activeProfileId === null) return null;
    return model.profiles.find((p) => p.id === activeProfileId) ?? null;
  }, [model, activeProfileId]);

  const weightGrams = activeProfile?.weightGrams ?? 0;
  const printTimeSeconds = activeProfile?.printTimeSeconds ?? 0;

  const costs: CostBreakdown | null = useMemo(() => {
    if (weightGrams <= 0 && printTimeSeconds <= 0) return null;
    return calculateCosts(weightGrams, printTimeSeconds, DEFAULT_PRICING);
  }, [weightGrams, printTimeSeconds]);

  const qty = Math.max(1, Math.floor(quantity) || 1);

  const showBulkPrice =
    costs?.bulkEligible &&
    costs.bulkPrice !== null &&
    qty >= DEFAULT_PRICING.bulkQuantity;

  const tier = costs ? activePriceTier(costs, qty) : "retail";

  const orderTotal = costs
    ? unitPriceForQuantity(costs, qty, DEFAULT_PRICING.bulkQuantity) * qty
    : 0;

  const analyze = useCallback(async () => {
    setError(null);
    setLoading(true);
    setQuantity(1);

    try {
      const res = await fetch(`/api/makerworld?url=${encodeURIComponent(url.trim())}`);
      const data = (await res.json()) as MakerWorldModel & { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo analizar el modelo.");
      }

      setModel(data);
      setActiveProfileId(data.selectedProfileId);
    } catch (err) {
      setModel(null);
      setActiveProfileId(null);
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:py-12">
      <header className="rise-in space-y-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal/30 bg-teal-soft px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal">
          Oct 3D
        </div>
        <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">
          ¿A qué precio vendo?
        </h1>
        <p className="mx-auto max-w-lg text-muted">
          Pegá el link de MakerWorld y obtené el precio sugerido para vender la pieza.
        </p>
      </header>

      <section className="panel rise-in space-y-4 p-5 md:p-6">
        <input
          className="field"
          placeholder="https://makerworld.com/en/models/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url.trim()) void analyze();
          }}
        />
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="btn bg-accent px-5 py-2.5 text-sm text-void"
            disabled={!url.trim() || loading}
            onClick={() => void analyze()}
          >
            {loading ? "Consultando…" : "Ver precio"}
          </button>
          <button
            type="button"
            className="btn border border-line bg-panel-2 px-4 py-2.5 text-sm text-muted"
            onClick={() => setUrl(EXAMPLE_URL)}
          >
            Probar con ejemplo
          </button>
        </div>
        {error ? (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-center text-sm text-red-300">
            {error}
          </p>
        ) : null}
      </section>

      {model && costs ? (
        <div className="space-y-5">
          {isLongPrint(costs.printTimeHours, LONG_PRINT_HOURS) ? (
            <div className="warning-banner rise-in" role="alert">
              <span aria-hidden>⚠</span>
              <p>
                <strong>Impresión larga:</strong> esta pieza tarda más de {LONG_PRINT_HOURS}{" "}
                horas por unidad ({formatDuration(costs.printTimeSeconds)}). Confirmá plazo de
                entrega con el taller antes de cotizar.
                {qty > 1 ? (
                  <>
                    {" "}
                    Con {qty} unidades, estimá ~{formatDuration(costs.printTimeSeconds * qty)} de
                    impresión total.
                  </>
                ) : null}
              </p>
            </div>
          ) : null}

          <section className="panel rise-in space-y-4 p-5 md:p-6">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              {model.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={model.coverUrl}
                  alt={model.title}
                  className="h-28 w-28 shrink-0 rounded-xl border border-line object-cover"
                />
              ) : null}
              <div className="min-w-0 space-y-1">
                <h2 className="font-display text-xl font-bold text-ink">{model.title}</h2>
                <p className="text-sm text-muted">
                  {formatGrams(costs.weightGrams)} · {formatDuration(costs.printTimeSeconds)} por
                  unidad
                </p>
              </div>
            </div>

            {model.profiles.length > 1 ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-ink">Variante / perfil</span>
                <select
                  className="field"
                  value={activeProfileId ?? ""}
                  onChange={(e) => setActiveProfileId(Number(e.target.value))}
                >
                  {model.profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-ink">Cantidad de unidades</span>
              <span className="block text-xs text-muted">
                Con {DEFAULT_PRICING.bulkQuantity}+ unidades de productos baratos se activa el
                precio por volumen
              </span>
              <input
                type="number"
                className="field"
                min={1}
                step={1}
                value={qty}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
          </section>

          <div
            className={`grid gap-4 ${showBulkPrice ? "md:grid-cols-3" : "md:grid-cols-2"}`}
          >
            <PriceCard
              label="Precio público"
              subtitle="1 unidad · cliente final"
              price={formatMoney(costs.retailPrice)}
              variant="retail"
              active={tier === "retail"}
            />
            <PriceCard
              label="Precio mayorista"
              subtitle="2 o más unidades"
              price={formatMoney(costs.wholesalePrice)}
              variant="wholesale"
              active={tier === "wholesale"}
            />
            {showBulkPrice ? (
              <PriceCard
                label="Mayorista por volumen"
                subtitle={`${DEFAULT_PRICING.bulkQuantity}+ unidades`}
                price={formatMoney(costs.bulkPrice!)}
                variant="bulk"
                active={tier === "bulk"}
              />
            ) : null}
          </div>

          <section className="panel rise-in p-5 text-center md:p-6">
            <p className="text-sm text-muted">
              Total sugerido para {qty} {qty === 1 ? "unidad" : "unidades"}
            </p>
            <p className="stat-value font-display text-3xl font-bold text-ink">
              {formatMoney(orderTotal)}
            </p>
            {isLongPrint(costs.printTimeHours * qty, LONG_PRINT_HOURS) ? (
              <p className="mt-2 text-xs text-muted">
                Tiempo de impresión estimado: {formatDuration(printTimeSeconds * qty)}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
