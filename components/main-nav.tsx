import Link from "next/link";

export function MainNav() {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Navegacion principal">
      <Link
        href="/licitaciones"
        className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm hover:border-ocean hover:text-ocean dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        Licitaciones
      </Link>
      <Link
        href="/dashboard"
        className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm hover:border-ocean hover:text-ocean dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        Dashboard
      </Link>
    </nav>
  );
}
