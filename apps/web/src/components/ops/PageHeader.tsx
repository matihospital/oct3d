import type { ReactNode } from "react";
import Link from "next/link";

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--ads-border)] pb-4">
      <div className="min-w-0 space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex flex-wrap items-center gap-1 text-xs text-[var(--ads-text-subtlest)]">
            {breadcrumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 ? <span>/</span> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="ops-link-quiet hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="text-[24px] font-semibold leading-tight text-[var(--ads-text)]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-[var(--ads-text-subtle)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
