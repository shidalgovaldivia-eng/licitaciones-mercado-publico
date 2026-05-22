import { AlertTriangle, BarChart3, CalendarClock, Database, FileText } from "lucide-react";
import { MainNav } from "@/components/main-nav";
import { getDashboardSummary, type SummaryBucket } from "@/services/dashboardSummary";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="grid gap-5 py-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <MainNav />
            <p className="mt-6 text-sm font-bold uppercase tracking-wide text-ocean">Análisis operativo</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-bold leading-tight text-ink sm:text-5xl">
              Dashboard de licitaciones activas
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Resumen construido desde la cache Supabase y actualizado con Mercado Público cuando no hay datos disponibles.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Fuente</p>
            <p className="mt-1 text-sm font-bold text-ink">
              {summary.source === "supabase_cache" ? "Cache Supabase" : "Mercado Público"}
            </p>
            <p className="mt-1 text-xs text-slate-500">{formatDateTime(summary.generatedAt)}</p>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<FileText className="h-5 w-5" />}
            label="Activas"
            value={summary.totalActiveTenders}
            helper="Procesos publicados o activos"
          />
          <MetricCard
            icon={<CalendarClock className="h-5 w-5" />}
            label="Cierran en 48h"
            value={summary.closingNext48Hours}
            helper="Oportunidades con cierre cercano"
          />
          <MetricCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Organismos"
            value={summary.topBuyers.length}
            helper="Compradores más frecuentes"
          />
          <MetricCard
            icon={<Database className="h-5 w-5" />}
            label="Estado datos"
            value={summary.source === "supabase_cache" ? "Cache" : "API"}
            helper="Origen usado para este resumen"
          />
        </section>

        {summary.totalActiveTenders === 0 ? (
          <section className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">No hay licitaciones activas disponibles para analizar.</p>
                <p className="mt-1">
                  Abre el listado de licitaciones o consulta `/api/tenders` para poblar la cache inicial.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <SummaryTable title="Organismos compradores más frecuentes" rows={summary.topBuyers} />
          <SummaryTable title="Estados más frecuentes" rows={summary.topStatuses} />
          <SummaryTable title="Palabras más repetidas" rows={summary.topWords} />
          <SummaryTable title="Licitaciones por fecha de cierre" rows={summary.closingByDate} />
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  helper: string;
}) {
  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-ocean">
        {icon}
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{helper}</p>
    </article>
  );
}

function SummaryTable({ title, rows }: { title: string; rows: SummaryBucket[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div key={row.label} className="grid gap-2">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="min-w-0 truncate font-semibold text-ink">{row.label}</span>
                <span className="shrink-0 text-slate-600">{row.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-paper">
                <div className="h-full rounded-full bg-ocean" style={{ width: `${Math.max(6, (row.value / max) * 100)}%` }} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-600">Sin datos suficientes.</p>
        )}
      </div>
    </section>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
