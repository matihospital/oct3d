"use client";

import { useState } from "react";
import { HexColorField } from "./HexColorField";
import { deleteColor, updateColor } from "@/app/ops/(app)/catalog/actions";

type ColorRow = {
  id: string;
  name: string;
  hex: string | null;
};

export function EditableColorRow({ color }: { color: ColorRow }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <tr>
        <td>
          <span className="inline-flex items-center gap-2 font-medium">
            <span
              className="inline-block h-4 w-4 rounded-sm border border-[var(--ads-border)]"
              style={{ background: color.hex ?? "#ccc" }}
              aria-hidden
            />
            {color.name}
          </span>
        </td>
        <td className="tabular-nums text-[var(--ads-text-subtle)]">
          {color.hex ?? "—"}
        </td>
        <td className="text-right">
          <div className="inline-flex flex-wrap justify-end gap-1">
            <button
              type="button"
              className="ops-btn ops-btn-default"
              onClick={() => setEditing(true)}
            >
              Editar
            </button>
            <form action={deleteColor.bind(null, color.id)}>
              <button type="submit" className="ops-btn ops-btn-danger">
                Eliminar
              </button>
            </form>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={3} className="!p-3">
        <form
          action={async (fd) => {
            await updateColor(color.id, fd);
            setEditing(false);
          }}
          className="flex flex-wrap items-start gap-2"
        >
          <div>
            <span className="ops-label">Nombre</span>
            <input
              name="name"
              className="ops-field w-40"
              defaultValue={color.name}
              required
            />
          </div>
          <HexColorField defaultValue={color.hex ?? ""} compact />
          <div>
            <span className="ops-label invisible select-none" aria-hidden>
              Guardar
            </span>
            <div className="flex flex-wrap gap-1">
              <button type="submit" className="ops-btn ops-btn-primary">
                Guardar
              </button>
              <button
                type="button"
                className="ops-btn ops-btn-subtle"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </td>
    </tr>
  );
}
