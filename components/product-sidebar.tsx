"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Search, ShoppingCart, Star } from "lucide-react";
import { clsx } from "clsx";
import { Card, CardContent } from "@/components/ui/card";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/licitaciones", label: "Licitaciones", icon: Search },
  { href: "/ordenes-compra", label: "Órdenes", icon: ShoppingCart },
  { href: "/licitaciones", label: "Favoritos", icon: Star },
  { href: "/dashboard", label: "Alertas", icon: Bell }
] as const;

export function ProductSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] min-h-[720px] flex-col rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-premium ring-1 ring-slate-950/[0.03] backdrop-blur-xl lg:flex">
      <div className="px-3 py-2">
        <p className="text-lg font-semibold tracking-[-0.03em] text-ink">Radar Mercado Público</p>
        <p className="mt-1 text-xs font-medium text-slate-500">ChileCompra intelligence</p>
      </div>

      <nav className="mt-8 space-y-1" aria-label="Navegación principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.label}
              href={item.href as Route}
              className={clsx(
                "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition",
                active
                  ? "bg-ink font-semibold text-white shadow-sm"
                  : "font-medium text-slate-600 hover:bg-slate-50 hover:text-ink"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <Card className="border-slate-200 bg-slate-50/90 shadow-none">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Performance</p>
            <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-ink">No bloqueante</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Cache, paginación y enriquecimiento progresivo.</p>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
