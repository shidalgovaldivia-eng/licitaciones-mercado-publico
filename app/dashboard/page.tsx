import type React from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  FileText,
  Gauge,
  HandCoins,
  LayoutDashboard,
  Link2,
  Search,
  Server,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getCatalogQualityReport, type CatalogItem, type CatalogQualityReport } from "@/services/catalogQuality";
import { getDashboardSummary, type SummaryBucket } from "@/services/dashboardSummary";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/licitaciones", label: "Licitaciones", icon: Search },
  { href: "/ordenes-compra", label: "Órdenes de compra", icon: ShoppingCart },
  { href: "/licitaciones", label: "Favoritos", icon: Star },
  { href: "/dashboard", label: "Alertas", icon: Bell }
] as const;

export default async function DashboardPage() {
  const [summary, catalogQuality] = await Promise.all([getDashboardSummary(), getCatalogQualityReport()]);
  const enrichedTotal = summary.normalization.tenders.total;
  const enrichedDone = summary.normalization.tenders.enriched;
  const enrichedPercent = summary.normalization.tenders.enrichedPercent;

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-3 py-3 text-ink sm:px-4 lg:px-6">
      <div className="mx-auto grid max-w-[1540px] gap-4 lg:grid-cols-[260px_1fr]">
        <DashboardSidebar enrichedDone={enrichedDone} enrichedTotal={enrichedTotal} enrichedPercent={enrichedPercent} />

        <section className="min-w-0 space-y-4">
          <TopCommandBar generatedAt={summary.generatedAt} />

          <header className="grid gap-4 rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-premium ring-1 ring-slate-950/[0.03] backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_360px] lg:p-7">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                <Sparkles className="h-3.5 w-3.5" />
                Inteligencia operativa Mercado Público
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-ink sm:text-5xl">
                Dashboard de licitaciones activas
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Vista ejecutiva para priorizar oportunidades, medir cierres críticos y monitorear la calidad de datos enriquecidos sin bloquear la experiencia.
              </p>
            </div>

            <Card className="border-slate-200/80 bg-slate-950 text-white shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Estado del sistema</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Performance OK</p>
                  </div>
                  <span className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-300">
                    <Gauge className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <OperationalMini label="Fuente" value="Supabase" />
                  <OperationalMini label="Modo" value="No bloqueante" />
                  <OperationalMini label="Cache" value="Activo" />
                  <OperationalMini label="Último cálculo" value={formatTime(summary.generatedAt)} />
                </div>
              </CardContent>
            </Card>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<FileText className="h-5 w-5" />}
              tone="blue"
              label="Licitaciones activas"
              value={formatNumber(summary.totalActiveTenders)}
              helper="Procesos publicados o activos"
            />
            <MetricCard
              icon={<CalendarClock className="h-5 w-5" />}
              tone="amber"
              label="Cierran en 48h"
              value={formatNumber(summary.closingNext48Hours)}
              helper="Prioridad alta para revisión"
            />
            <MetricCard
              icon={<Database className="h-5 w-5" />}
              tone="violet"
              label="Datos enriquecidos"
              value={`${enrichedPercent}%`}
              helper={`${formatNumber(enrichedDone)} de ${formatNumber(enrichedTotal)} normalizadas`}
            />
            <MetricCard
              icon={<Activity className="h-5 w-5" />}
              tone="emerald"
              label="Compradores frecuentes"
              value={formatNumber(summary.topBuyers.length)}
              helper="Organismos con demanda recurrente"
            />
          </section>

          <FilterSurface />

          <PurchaseOrderActivity summary={summary} />

          <PublicPurchaseIntelligence quality={catalogQuality} />

          {summary.totalActiveTenders === 0 ? (
            <Card className="border-amber-200 bg-amber-50 text-amber-900 shadow-none">
              <CardContent className="flex items-start gap-3 p-4 text-sm">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Datos en procesamiento</p>
                  <p className="mt-1">Ejecuta el enrichment administrado para poblar métricas normalizadas sin bloquear usuarios.</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <MassiveTable buyers={summary.topBuyers} statuses={summary.topStatuses} />
            <InsightRail summary={summary} />
          </section>
        </section>
      </div>
    </main>
  );
}

function PurchaseOrderActivity({ summary }: { summary: Awaited<ReturnType<typeof getDashboardSummary>> }) {
  const activity = summary.purchaseOrderActivity;
  const hasOrders = activity.recentTotal > 0;

  return (
    <Card className="border-white/80 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <ShoppingCart className="h-4 w-4 text-ocean" />
            Actividad de compra pública
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">Órdenes de compra normalizadas</h2>
          <p className="mt-1 text-sm text-slate-500">
            Compras reales emitidas por el Estado, calculadas desde datos normalizados en Supabase.
          </p>
        </div>
        <StatusChip icon={<Database className="h-3.5 w-3.5" />} label={`${activity.enrichedPercent}% enriquecidas`} tone="slate" />
      </div>

      {hasOrders ? (
        <CardContent className="space-y-5 p-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniMetric icon={<ShoppingCart className="h-4 w-4" />} label="Órdenes recientes" value={formatNumber(activity.recentTotal)} />
            <MiniMetric icon={<HandCoins className="h-4 w-4" />} label="Monto comprado" value={formatCurrency(activity.grossTotal)} />
            <MiniMetric icon={<Link2 className="h-4 w-4" />} label="Vinculadas a licitación" value={formatNumber(activity.linkedToTenders)} />
            <MiniMetric icon={<Database className="h-4 w-4" />} label="Normalización OC" value={`${summary.normalization.purchaseOrders.enrichedPercent}%`} />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <BucketPanel title="Top organismos compradores" rows={activity.topBuyers} empty="Sin compradores normalizados." />
            <BucketPanel title="Top proveedores" rows={activity.topSuppliers} empty="Sin proveedores normalizados." />
            <BucketPanel title="Órdenes por estado" rows={activity.byStatus} empty="Sin estados normalizados." />
          </section>
        </CardContent>
      ) : (
        <CardContent className="p-8">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <p className="font-semibold text-ink">Datos de órdenes en preparación</p>
            <p className="mt-1">
              Ejecuta el enriquecimiento de órdenes o espera el cron diario para poblar métricas de compradores, proveedores y montos.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function PublicPurchaseIntelligence({ quality }: { quality: CatalogQualityReport }) {
  const catalogTotal = quality.buyers.total + quality.suppliers.total + quality.categories.total;
  const hasCatalogs = catalogTotal > 0;
  const purchaseOrderTotal =
    quality.source.enrichedPurchaseOrders + quality.source.pendingPurchaseOrders + quality.source.failedPurchaseOrders;

  return (
    <Card className="border-white/80 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <BarChart3 className="h-4 w-4 text-ocean" />
            Inteligencia de compra publica
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">Catalogos normalizados</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ranking y calidad calculados desde organismos, proveedores, categorias, licitaciones y ordenes normalizadas.
          </p>
        </div>
        <StatusChip icon={<ShieldCheck className="h-3.5 w-3.5" />} label={`${quality.source.dataQualityPercent}% calidad`} tone="slate" />
      </div>

      {hasCatalogs ? (
        <CardContent className="space-y-5 p-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <MiniMetric icon={<Database className="h-4 w-4" />} label="Organismos" value={formatNumber(quality.buyers.total)} />
            <MiniMetric icon={<ShoppingCart className="h-4 w-4" />} label="Proveedores" value={formatNumber(quality.suppliers.total)} />
            <MiniMetric icon={<BarChart3 className="h-4 w-4" />} label="Categorias" value={formatNumber(quality.categories.total)} />
            <MiniMetric icon={<HandCoins className="h-4 w-4" />} label="Monto comprado" value={formatCurrency(quality.source.totalPurchaseAmount)} />
            <MiniMetric
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Ordenes enriquecidas"
              value={`${formatNumber(quality.source.enrichedPurchaseOrders)} / ${formatNumber(purchaseOrderTotal)}`}
            />
            <MiniMetric icon={<ShieldCheck className="h-4 w-4" />} label="Calidad datos" value={`${quality.source.dataQualityPercent}%`} />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <AmountRankingPanel title="Top organismos por monto" rows={quality.buyers.topByAmount} empty="Sin montos por organismo." />
            <AmountRankingPanel title="Top proveedores por monto" rows={quality.suppliers.topByAmount} empty="Sin montos por proveedor." />
            <AmountRankingPanel title="Top categorias por monto" rows={quality.categories.topByAmount} empty="Sin montos por categoria." />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">Calidad de datos</h3>
                <StatusChip icon={<Database className="h-3.5 w-3.5" />} label="Sin API externa" tone="slate" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <QualityStat label="Buyers sin codigo" value={quality.buyers.withoutCode} total={quality.buyers.total} />
                <QualityStat label="Suppliers sin codigo" value={quality.suppliers.withoutCode} total={quality.suppliers.total} />
                <QualityStat label="Categorias sin codigo" value={quality.categories.withoutCode} total={quality.categories.total} />
                <QualityStat
                  label="OC fallidas"
                  value={quality.source.failedPurchaseOrders}
                  total={Math.max(purchaseOrderTotal, quality.source.failedPurchaseOrders)}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniMetric icon={<CheckCircle2 className="h-4 w-4" />} label="OC enriquecidas" value={formatNumber(quality.source.enrichedPurchaseOrders)} />
                <MiniMetric icon={<Clock3 className="h-4 w-4" />} label="OC pendientes" value={formatNumber(quality.source.pendingPurchaseOrders)} />
                <MiniMetric icon={<AlertTriangle className="h-4 w-4" />} label="OC fallidas" value={formatNumber(quality.source.failedPurchaseOrders)} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <h3 className="text-sm font-semibold text-ink">Alertas de calidad</h3>
              <div className="mt-4 space-y-3">
                {quality.alerts.length > 0 ? (
                  quality.alerts.slice(0, 5).map((alert) => (
                    <div key={alert} className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                      {alert}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
                    Sin alertas criticas en catalogos normalizados.
                  </div>
                )}
              </div>
            </div>
          </section>
        </CardContent>
      ) : (
        <CardContent className="p-8">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <p className="font-semibold text-ink">Catalogos en preparacion</p>
            <p className="mt-1">
              Ejecuta el rebuild de catalogos para poblar organismos, proveedores y categorias desde datos ya normalizados.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function AmountRankingPanel({ title, rows, empty }: { title: string; rows: CatalogItem[]; empty: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.slice(0, 5).map((row) => (
            <div key={row.id ?? row.code ?? row.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate text-slate-700">{row.label}</span>
                {row.code ? <span className="mt-0.5 block text-xs text-slate-400">{row.code}</span> : null}
              </span>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {formatCurrency(row.value)}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">{empty}</p>
        )}
      </div>
    </div>
  );
}

function QualityStat({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">{formatNumber(value)}</p>
      <p className="mt-1 text-xs text-slate-500">{percent}% del total</p>
      <ProgressBar value={percent} className="mt-3" barClassName={percent > 50 ? "bg-amber-500" : "bg-emerald-500"} compact />
    </div>
  );
}

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        <span className="text-ocean">{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-ink">{value}</p>
    </div>
  );
}

function BucketPanel({ title, rows, empty }: { title: string; rows: SummaryBucket[]; empty: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.slice(0, 5).map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-slate-600">{row.label}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {formatNumber(row.value)}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">{empty}</p>
        )}
      </div>
    </div>
  );
}

function DashboardSidebar({
  enrichedDone,
  enrichedTotal,
  enrichedPercent
}: {
  enrichedDone: number;
  enrichedTotal: number;
  enrichedPercent: number;
}) {
  return (
    <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] min-h-[760px] flex-col rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-premium ring-1 ring-slate-950/[0.03] backdrop-blur-xl lg:flex">
      <div className="px-3 py-2">
        <p className="text-lg font-semibold tracking-[-0.03em] text-ink">Radar Mercado Público</p>
        <p className="mt-1 text-xs font-medium text-slate-500">ChileCompra intelligence</p>
      </div>

      <nav className="mt-8 space-y-1" aria-label="Navegación dashboard">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/dashboard" && item.label === "Dashboard";
          return (
            <Link
              key={item.label}
              href={item.href as Route}
              className={
                active
                  ? "flex items-center gap-3 rounded-2xl bg-ink px-3.5 py-3 text-sm font-semibold text-white shadow-sm"
                  : "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-ink"
              }
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
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Uso API hoy</p>
              <Server className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">Controlado</p>
            <p className="mt-1 text-sm text-emerald-700">Cache y rate limit activos</p>
            <ProgressBar value={91} className="mt-4" />
          </CardContent>
        </Card>

        <Card className="border-indigo-100 bg-indigo-50/90 shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Normalización</p>
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-ink">
              {formatNumber(enrichedDone)} de {formatNumber(enrichedTotal)}
            </p>
            <p className="mt-1 text-sm text-slate-600">Datos listos para analytics</p>
            <ProgressBar value={enrichedPercent} className="mt-4" barClassName="bg-indigo-600" />
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}

function TopCommandBar({ generatedAt }: { generatedAt: string }) {
  return (
    <Card className="border-white/80 bg-white/85 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">Buscar licitación, organismo, proveedor o categoría...</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusChip icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Cache actualizado" tone="emerald" />
          <StatusChip icon={<Clock3 className="h-3.5 w-3.5" />} label={formatDateTime(generatedAt)} tone="slate" />
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSurface() {
  const filters = ["Estado: Activas", "Región: Todas", "Monto: rango UTM", "Cierre: próximos 30 días", "Organismo"];

  return (
    <Card className="border-white/80 bg-white/85 shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <SlidersHorizontal className="h-4 w-4 text-ocean" />
              Filtros inteligentes
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-ocean/30 hover:bg-white hover:text-ocean"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-ocean"
          >
            Aplicar filtros
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function MassiveTable({ buyers, statuses }: { buyers: SummaryBucket[]; statuses: SummaryBucket[] }) {
  const rows = buyers.length > 0 ? buyers.slice(0, 8) : statuses.slice(0, 8);
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <Card className="overflow-hidden border-white/80 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">Tabla masiva optimizada</h2>
          <p className="mt-1 text-sm text-slate-500">Diseñada para 50 filas visibles, scroll estable y enrichment no bloqueante.</p>
        </div>
        <StatusChip icon={<Database className="h-3.5 w-3.5" />} label="Vista compacta" tone="slate" />
      </div>

      <div className="hidden grid-cols-[minmax(220px,1.5fr)_120px_130px_130px_120px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 md:grid">
        <span>Organismo / señal</span>
        <span>Registros</span>
        <span>Cobertura</span>
        <span>Prioridad</span>
        <span>Estado</span>
      </div>

      <div className="divide-y divide-slate-100">
        {rows.length > 0 ? (
          rows.map((row, index) => {
            const coverage = Math.round((row.value / max) * 100);
            const priority = index < 2 ? "Alta" : index < 5 ? "Media" : "Baja";
            return (
              <div
                key={row.label}
                className="grid gap-3 px-5 py-4 text-sm transition hover:bg-slate-50 md:grid-cols-[minmax(220px,1.5fr)_120px_130px_130px_120px] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{row.label}</p>
                  <p className="mt-1 text-xs text-slate-500">Fuente normalizada Supabase</p>
                </div>
                <p className="font-semibold text-ink">{formatNumber(row.value)}</p>
                <div className="min-w-0">
                  <ProgressBar value={coverage} compact />
                </div>
                <p className={priority === "Alta" ? "font-semibold text-amber-700" : "font-medium text-slate-600"}>{priority}</p>
                <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Disponible
                </span>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-sm text-slate-500">Sin datos suficientes para construir tabla.</div>
        )}
      </div>
    </Card>
  );
}

function InsightRail({ summary }: { summary: Awaited<ReturnType<typeof getDashboardSummary>> }) {
  return (
    <div className="space-y-4">
      <Card className="border-white/80 bg-white shadow-sm">
        <CardContent className="p-5">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">Señales rápidas</h2>
          <div className="mt-4 space-y-3">
            <InsightCard
              tone="blue"
              title="Demanda concentrada"
              body={`${summary.topBuyers[0]?.label ?? "Sin organismo dominante"} lidera la actividad normalizada.`}
            />
            <InsightCard
              tone="amber"
              title="Riesgo de cierre"
              body={`${formatNumber(summary.closingNext48Hours)} procesos cierran dentro de 48 horas.`}
            />
            <InsightCard
              tone="violet"
              title="Calidad de datos"
              body={`${summary.normalization.tenders.enrichedPercent}% de licitaciones normalizadas para analytics confiable.`}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/80 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">Estados</h2>
            <BarChart3 className="h-5 w-5 text-ocean" />
          </div>
          <div className="mt-4 space-y-3">
            {summary.topStatuses.slice(0, 5).map((status) => (
              <div key={status.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-600">{status.label}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {formatNumber(status.value)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon,
  tone,
  label,
  value,
  helper
}: {
  icon: React.ReactNode;
  tone: "blue" | "amber" | "violet" | "emerald";
  label: string;
  value: string;
  helper: string;
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700"
  };

  return (
    <Card className="group border-white/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-premium">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={`rounded-2xl p-3 ${tones[tone]}`}>{icon}</div>
          <TrendingUp className="h-4 w-4 text-slate-300 transition group-hover:text-ocean" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-ink">{value}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p>
      </CardContent>
    </Card>
  );
}

function InsightCard({ tone, title, body }: { tone: "blue" | "amber" | "violet"; title: string; body: string }) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    violet: "border-indigo-100 bg-indigo-50 text-indigo-700"
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>
    </div>
  );
}

function OperationalMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusChip({
  icon,
  label,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  tone: "emerald" | "slate";
}) {
  const className =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${className}`}>
      {icon}
      {label}
    </span>
  );
}

function ProgressBar({ value, className, barClassName, compact }: { value: number; className?: string; barClassName?: string; compact?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-full bg-slate-200 ${compact ? "h-2" : "h-2.5"} ${className ?? ""}`}>
      <div
        className={`h-full rounded-full ${barClassName ?? "bg-emerald-500"}`}
        style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-CL").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/D";
  return new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
