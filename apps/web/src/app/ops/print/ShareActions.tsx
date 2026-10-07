"use client";

import { toBlob } from "html-to-image";
import { useState } from "react";

const IMAGE_WIDTH = 600;

export function ShareActions({
  backHref,
  shareText,
  targetId,
  fileName,
}: {
  backHref: string;
  shareText: string;
  targetId: string;
  fileName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiá el texto:", shareText);
    }
  }

  async function shareImage() {
    const node = document.getElementById(targetId);
    if (!node) return;
    setBusy(true);
    const prevWidth = node.style.width;
    const prevMaxWidth = node.style.maxWidth;
    try {
      node.style.width = `${IMAGE_WIDTH}px`;
      node.style.maxWidth = "none";
      const blob = await toBlob(node, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: IMAGE_WIDTH,
        height: node.offsetHeight,
        style: { margin: "0", boxShadow: "none" },
      });
      if (!blob) throw new Error("No se pudo generar la imagen");
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "No se pudo generar la imagen");
    } finally {
      node.style.width = prevWidth;
      node.style.maxWidth = prevMaxWidth;
      setBusy(false);
    }
  }

  return (
    <div className="print-toolbar">
      <button type="button" className="primary" onClick={shareImage} disabled={busy}>
        {busy ? "Generando…" : "Compartir / descargar imagen"}
      </button>
      <a
        className="whatsapp"
        href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noreferrer"
      >
        Enviar texto por WhatsApp
      </a>
      <button type="button" onClick={copyText}>
        {copied ? "¡Copiado!" : "Copiar texto"}
      </button>
      <button type="button" onClick={() => window.print()}>
        PDF
      </button>
      <a href={backHref}>Volver</a>
    </div>
  );
}
