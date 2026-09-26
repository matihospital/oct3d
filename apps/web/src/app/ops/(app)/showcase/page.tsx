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
    orderBy: [{ published: "asc" }, { updatedAt: "desc" }],
  });
  const drafts = articles.filter((a) => !a.published).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vitrina / catálogo público"
        description="Los pedidos con MakerWorld publican solos. Sin link se crea un borrador oculto para completar imagen y datos."
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

      {drafts > 0 ? (
        <p className="rounded-[var(--ads-radius)] border border-[var(--ads-border)] bg-[var(--ads-bg-raised)] px-4 py-3 text-sm">
          {drafts} borrador(es) sin publicar — completá imagen/descripción y marcá
          Publicado.
        </p>
      ) : null}

      {articles.length === 0 ? (
        <p className="ops-empty ops-card">
          Todavía no hay artículos. Se generan al guardar pedidos (con o sin MakerWorld).
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
                      <span className="text-[var(--ads-danger)]">Borrador</span>
                    )}
                  </p>
                  {a.makerWorldModelId != null ? (
                    <a
                      href={a.makerWorldUrl || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs"
                    >
                      MakerWorld #{a.makerWorldModelId}
                    </a>
                  ) : (
                    <span className="text-xs text-[var(--ads-text-subtlest)]">
                      Sin MakerWorld — cargá imagen a mano
                    </span>
                  )}
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
                encType="multipart/form-data"
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
                <div>
                  <span className="ops-label">Subir imagen</span>
                  <input
                    name="imageFile"
                    type="file"
                    accept="image/*"
                    className="ops-field"
                  />
                  <span className="ops-hint">JPG/PNG/WebP, máx. ~900 KB</span>
                </div>
                <div>
                  <span className="ops-label">O URL de imagen</span>
                  <input
                    name="imageUrl"
                    className="ops-field"
                    defaultValue={
                      a.imageUrl.startsWith("data:") ? "" : a.imageUrl
                    }
                    placeholder="https://..."
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
                <label className="flex items-center gap-2 text-sm text-[var(--ads-text-subtle)]">
                  <input name="clearImage" type="checkbox" className="h-4 w-4" />
                  Quitar imagen actual
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
        Tip: el mismo modelo MakerWorld no se duplica; sin link se agrupa por título
        normalizado como borrador.
      </p>
      <Link href="/ops" className="ops-btn ops-btn-subtle" style={{ textDecoration: "none" }}>
        Volver
      </Link>
    </div>
  );
}
