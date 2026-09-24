"use client";

import type { LineColorUsage } from "@/lib/line-colors";

export type ColorOption = {
  id: string;
  name: string;
  hex: string | null;
};

export type { LineColorUsage };

export function LineColorPicker({
  colors,
  value,
  onChange,
}: {
  colors: ColorOption[];
  value: LineColorUsage[];
  onChange: (next: LineColorUsage[]) => void;
}) {
  if (colors.length === 0) {
    return (
      <p className="text-xs text-[var(--ads-text-subtlest)]">
        No hay colores en el catálogo. Agregalos en Catálogo.
      </p>
    );
  }

  const selected = new Map(value.map((v) => [v.colorId, v.grams]));

  function toggle(id: string) {
    if (selected.has(id)) {
      onChange(value.filter((v) => v.colorId !== id));
    } else {
      onChange([...value, { colorId: id, grams: 0 }]);
    }
  }

  function setGrams(id: string, grams: number) {
    onChange(
      value.map((v) => (v.colorId === id ? { ...v, grams } : v)),
    );
  }

  return (
    <div>
      <span className="ops-label">Colores y gramos</span>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {colors.map((c) => {
          const active = selected.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={`inline-flex items-center gap-1.5 rounded-[var(--ads-radius)] border px-2 py-1 text-xs font-medium transition ${
                active
                  ? "border-[var(--ads-brand)] bg-[var(--ads-bg-selected)] text-[var(--ads-brand)]"
                  : "border-[var(--ads-border)] bg-[var(--ads-bg-raised)] text-[var(--ads-text-subtle)] hover:bg-[var(--ads-bg-neutral)]"
              }`}
            >
              <span
                className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-[var(--ads-border)]"
                style={{ background: c.hex ?? "#ccc" }}
                aria-hidden
              />
              {c.name}
            </button>
          );
        })}
      </div>

      {value.length > 0 ? (
        <div className="mt-2 space-y-2">
          {value.map((v) => {
            const c = colors.find((x) => x.id === v.colorId);
            if (!c) return null;
            return (
              <div
                key={v.colorId}
                className="flex flex-wrap items-center gap-2 rounded-[var(--ads-radius)] border border-[var(--ads-border)] bg-[var(--ads-bg)] px-2 py-1.5"
              >
                <span
                  className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-[var(--ads-border)]"
                  style={{ background: c.hex ?? "#ccc" }}
                  aria-hidden
                />
                <span className="min-w-[5rem] text-sm font-medium">{c.name}</span>
                <label className="flex items-center gap-1.5 text-sm">
                  <span className="text-[var(--ads-text-subtle)]">g</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="ops-field w-24"
                    value={v.grams || ""}
                    placeholder="0"
                    onChange={(e) => setGrams(v.colorId, Number(e.target.value) || 0)}
                  />
                </label>
              </div>
            );
          })}
          <span className="ops-hint">
            Gramos totales de cada color en esta línea (si hay varias unidades, sumalos).
          </span>
        </div>
      ) : (
        <span className="ops-hint">Opcional. Marcá colores y cargá los gramos de cada uno.</span>
      )}
    </div>
  );
}

export function ColorBadges({
  colors,
}: {
  colors: Array<{ name: string; hex: string | null; grams?: number }>;
}) {
  if (!colors.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {colors.map((c) => (
        <span
          key={c.name}
          className="inline-flex items-center gap-1 rounded-[var(--ads-radius)] bg-[var(--ads-bg-neutral)] px-1.5 py-0.5 text-xs text-[var(--ads-text-subtle)]"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm border border-[var(--ads-border)]"
            style={{ background: c.hex ?? "#ccc" }}
            aria-hidden
          />
          {c.name}
          {c.grams != null && c.grams > 0 ? ` · ${c.grams} g` : null}
        </span>
      ))}
    </div>
  );
}
