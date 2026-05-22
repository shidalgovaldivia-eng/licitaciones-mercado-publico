import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="max-w-md rounded-lg border border-line bg-white p-8 text-center shadow-subtle">
        <p className="text-sm font-semibold text-ocean">404</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Licitación no encontrada</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          No encontramos una licitación con ese código en la respuesta actual de Mercado Público.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-ocean px-4 py-3 text-sm font-semibold text-white hover:bg-ink"
        >
          Volver al buscador
        </Link>
      </section>
    </main>
  );
}
