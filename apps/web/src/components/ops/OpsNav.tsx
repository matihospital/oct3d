"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useOpsCalculator } from "./OpsCalculatorProvider";

const NAV = [
  { href: "/ops", label: "Inicio", exact: true },
  { href: "/ops/catalog", label: "Catálogo" },
  { href: "/ops/inventory", label: "Inventario" },
  { href: "/ops/showcase", label: "Vitrina" },
  { href: "/ops/quotes", label: "Presupuestos" },
  { href: "/ops/orders", label: "Pedidos" },
  { href: "/ops/settings", label: "Parámetros" },
];

export function OpsNav() {
  const pathname = usePathname();
  const { open } = useOpsCalculator();

  return (
    <aside className="flex w-full flex-col border-b border-[var(--ads-border)] bg-[var(--ads-bg-raised)] md:w-[240px] md:shrink-0 md:border-b-0 md:border-r">
      <div className="border-b border-[var(--ads-border)] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ads-text-subtlest)]">
          Oct 3D
        </p>
        <p className="text-base font-semibold text-[var(--ads-text)]">Operations</p>
      </div>

      <nav className="flex flex-row gap-1 overflow-x-auto p-2 md:flex-col">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`ops-link-quiet rounded-[var(--ads-radius)] px-3 py-2 text-sm font-medium whitespace-nowrap ${
                active
                  ? "bg-[var(--ads-bg-selected)] text-[var(--ads-brand)]"
                  : "text-[var(--ads-text-subtle)] hover:bg-[var(--ads-bg-neutral)]"
              }`}
              style={{ textDecoration: "none" }}
            >
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={open}
          className="ops-link-quiet rounded-[var(--ads-radius)] px-3 py-2 text-left text-sm font-medium whitespace-nowrap text-[var(--ads-text-subtle)] hover:bg-[var(--ads-bg-neutral)]"
        >
          Calculadora
          <span className="ml-1 text-xs text-[var(--ads-text-subtlest)]">⌘K</span>
        </button>
      </nav>

      <div className="mt-auto space-y-1 border-t border-[var(--ads-border)] p-3">
        <button
          type="button"
          onClick={open}
          className="ops-btn ops-btn-primary w-full justify-center"
        >
          Abrir calculadora
        </button>
        <Link
          href="/"
          className="ops-link-quiet block rounded-[var(--ads-radius)] px-3 py-2 text-sm"
          style={{ textDecoration: "none" }}
        >
          Calculadora pública
        </Link>
        <button
          type="button"
          className="ops-btn ops-btn-subtle w-full justify-start"
          onClick={() => void signOut({ callbackUrl: "/ops/login" })}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
