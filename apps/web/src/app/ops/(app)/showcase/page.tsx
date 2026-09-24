import { formatMoney } from "@oct3d/pricing";
import { prisma } from "@oct3d/db";
import Link from "next/link";
import { PageHeader } from "@/components/ops/PageHeader";
import {
  deleteCatalogArticle,
  toggleCatalogArticlePublished,
  updateCatalogArticle,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function ShowcasePage() {
  const articles = await prisma.catalogArticle.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vitrina / catálogo público"
        description="Se completa al guardar pedidos con link MakerWorld. Un artículo por modelo (sin duplicar)."
        breadcrumbs={[{ label: "Ops", href: "/ops" }, { label: "Vitrina" }]}
        actions={
          <a
            href="/catalogo"
            target="_blank"
            rel="noreferrer"
            className="ops-btn ops-btn-default"
            style={{ textDecoration: "none" }}
          >
            Ver página pública
          </a>
        }
      />

      {articles.length === 0 ? (
        <p className="ops-empty ops-card">
          Todavía no hay artículos. Creá un pedido con una línea que tenga link de
          MakerWorld.
        </p>
      ) : (
        <div className="space-y-4">
          {articles.map((a) => (
            <section key={a.id} className="ops-card p-4">
              <div className="mb-3 flex flex-wrap items-start gap-3">
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-[var(--ads-radius)] border border-[var(--ads-border)] bg-[var(--ads-bg)]">
                  {a.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--ads-text-subtlest)]">
                      Sin img
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--ads-text)]">{a.title}</p>
                  <p className="text-sm text-[var(--ads-text-subtle)]">
                    Desde {formatMoney(a.fromPrice)} · pedido {a.timesOrdered}× ·{" "}
                    {a.published ? (
                      <span className="text-[var(--ads-success)]">Público</span>
                    ) : (
                      <span className="text-[var(--ads-danger)]">Oculto</span>
                    )}
                  </p>
                  <a
                    href={a.makerWorldUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs"
                  >
                    MakerWorld #{a.makerWorldModelId}
                  </a>
                </div>
                <div className="flex flex-wrap gap-1">
                  <form action={toggleCatalogArticlePublished.bind(null, a.id)}>
                    <button type="submit" className="ops-btn ops-btn-subtle">
                      {a.published ? "Ocultar" : "Publicar"}
                    </button>
                  </form>
                  <form action={deleteCatalogArticle.bind(null, a.id)}>
                    <button type="submit" className="ops-btn ops-btn-danger">
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>

              <form
                action={updateCatalogArticle.bind(null, a.id)}
                className="grid gap-2 border-t border-[var(--ads-border)] pt-3 md:grid-cols-2"
              >
                <div>
                  <span className="ops-label">Título</span>
                  <input
                    name="title"
                    className="ops-field"
                    defaultValue={a.title}
                    required
                  />
                </div>
                <div>
                  <span className="ops-label">Desde $</span>
                  <input
                    name="fromPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    className="ops-field"
                    defaultValue={a.fromPrice}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <span className="ops-label">Descripción</span>
                  <textarea
                    name="description"
                    className="ops-field"
                    rows={2}
                    defaultValue={a.description}
                  />
                </div>
                <div className="md:col-span-2">
                  <span className="ops-label">URL imagen</span>
                  <input
                    name="imageUrl"
                    className="ops-field"
                    defaultValue={a.imageUrl}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-[var(--ads-text-subtle)]">
                  <input
                    name="published"
                    type="checkbox"
                    defaultChecked={a.published}
                    className="h-4 w-4"
                  />
                  Publicado en /catalogo
                </label>
                <div className="flex justify-end md:col-span-2">
                  <button type="submit" className="ops-btn ops-btn-primary">
                    Guardar
                  </button>
                </div>
              </form>
            </section>
          ))}
        </div>
      )}

      <p className="text-sm text-[var(--ads-text-subtle)]">
        Tip: la próxima vez que el mismo modelo entre en un pedido, no se duplica;
        solo baja el “desde” si el precio es menor.
      </p>
      <Link href="/ops" className="ops-btn ops-btn-subtle" style={{ textDecoration: "none" }}>
        Volver
      </Link>
    </div>
  );
}
