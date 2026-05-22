import Link from "next/link";

export function MainNav() {
  return (
    <nav className="flex flex-wrap gap-2">
      <Link
        href="/licitaciones"
        className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:border-ocean hover:text-ocean"
      >
        Licitaciones
      </Link>
      <Link
        href="/dashboard"
        className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:border-ocean hover:text-ocean"
      >
        Dashboard
      </Link>
    </nav>
  );
}
