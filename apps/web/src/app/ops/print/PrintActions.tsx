"use client";

export function PrintActions({ backHref }: { backHref: string }) {
  return (
    <div className="print-toolbar">
      <button type="button" className="primary" onClick={() => window.print()}>
        Imprimir / Guardar PDF
      </button>
      <a href={backHref}>Volver</a>
    </div>
  );
}
