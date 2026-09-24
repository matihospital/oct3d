"use client";

import { useState } from "react";

function normalizeHex(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(withHash)) return null;
  return withHash.toLowerCase();
}

function hexToRgb(hex: string): string {
  const h = hex.slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

export function HexColorField({
  name = "hex",
  defaultValue = "",
  compact = false,
}: {
  name?: string;
  defaultValue?: string;
  compact?: boolean;
}) {
  const initial = normalizeHex(defaultValue) ?? "";
  const [hex, setHex] = useState(initial);
  const valid = normalizeHex(hex);
  const pickerValue = valid ?? "#cccccc";

  return (
    <div>
      {!compact ? <span className="ops-label">Hex (opcional)</span> : (
        <span className="ops-label">Hex</span>
      )}
      <div className="flex h-10 items-center gap-2">
        <input
          type="color"
          className="h-10 w-10 shrink-0 cursor-pointer rounded-[var(--ads-radius)] border border-[var(--ads-border)] bg-[var(--ads-bg-input)] p-0.5"
          value={pickerValue}
          aria-label="Elegir color"
          onChange={(e) => setHex(e.target.value.toLowerCase())}
        />
        <input
          name={name}
          className="ops-field w-28"
          placeholder="#1a1a1a"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
        />
      </div>
      {!compact ? (
        <span className="ops-hint">
          {valid
            ? hexToRgb(valid)
            : hex.trim()
              ? "Usá formato #RRGGBB"
              : "Elegí un color o escribí el hex"}
        </span>
      ) : valid ? (
        <span className="ops-hint">{hexToRgb(valid)}</span>
      ) : (
        <span className="ops-hint">&nbsp;</span>
      )}
    </div>
  );
}
