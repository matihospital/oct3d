import { formatMoney } from "@oct3d/pricing";
import { prisma } from "@oct3d/db";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catálogo — Oct 3D",
  description: "Piezas 3D que ya imprimimos. Consultá opciones y precios desde.",
};

export default async function CatalogoPage() {
  const articles = await prisma.catalogArticle.findMany({
    where: { published: true },
    orderBy: [{ timesOrdered: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="relative z-10 min-h-full">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-12">
        <header className="rise-in mb-10 space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal/30 bg-teal-soft px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal">
            Oct 3D
          </div>
          <h1 className="font-display text-3xl font-bold text-ink md:text-5xl">
            Catálogo
          </h1>
          <p className="mx-auto max-w-xl text-muted">
            Modelos que ya trabajamos. El precio es orientativo — pedí tu
            color, escala y cantidad.
          </p>
        </header>

        {articles.length === 0 ? (
          <p className="panel rise-in p-8 text-center text-muted">
            Pronto vas a ver acá las piezas disponibles.
          </p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <li key={a.id} className="panel rise-in overflow-hidden p-0">
                <div className="relative aspect-[4/3] bg-panel-2">
                  {a.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.imageUrl}
                      alt={a.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted">
                      Sin imagen
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <h2 className="font-display text-lg font-semibold leading-snug text-ink">
                    {a.title}
                  </h2>
                  {a.description ? (
                    <p className="line-clamp-3 text-sm text-muted">{a.description}</p>
                  ) : null}
                  <p className="pt-1 font-display text-xl font-bold text-accent">
                    Desde {formatMoney(a.fromPrice)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
