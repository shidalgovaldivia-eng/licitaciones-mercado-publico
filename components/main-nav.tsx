"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Search } from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/licitaciones", label: "Licitaciones", icon: Search },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 }
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav
      className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/75 p-1 shadow-sm ring-1 ring-slate-950/[0.03] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70"
      aria-label="Navegacion principal"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-ink text-white shadow-sm dark:bg-white dark:text-ink"
                : "text-slate-600 hover:bg-white hover:text-ink dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
