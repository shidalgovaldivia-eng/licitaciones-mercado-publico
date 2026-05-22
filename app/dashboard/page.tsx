import type React from "react";
import { AlertTriangle, BarChart3, CalendarClock, Database, FileText, TrendingUp } from "lucide-react";
import { MainNav } from "@/components/main-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
            <p className="mt-6 text-sm font-bold uppercase tracking-wide text-ocean">Analisis operativo</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-bold leading-tight text-ink sm:text-5xl">
              Dashboard de licitaciones activas
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Indicadores construidos desde cache Supabase y actualizados con Mercado Publico cuando no hay datos disponibles.
            </p>
          </div>

          <Card className="min-w-[220px]">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Fuente</p>
              <p className="mt-1 text-sm font-bold text-ink">
                {summary.source === "supabase_cache" ? "Cache Supabase" : "Mercado Publico"}
              </p>
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(summary.generatedAt)}</p>
            </CardContent>
          </Card>
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
            icon={<TrendingUp className="h-5 w-5" />}
            label="Organismos"
            value={summary.topBuyers.length}
            helper="Compradores frecuentes"
          />
          <MetricCard
            icon={<Database className="h-5 w-5" />}
            label="Datos"
            value={summary.source === "supabase_cache" ? "Cache" : "API"}
            helper="Origen usado para el resumen"
          />
        </section>

        {summary.totalActiveTenders === 0 ? (
          <Card className="mt-5 border-amber-200 bg-amber-50 text-amber-800">
            <CardContent className="flex items-start gap-3 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">No hay licitaciones activas disponibles para analizar.</p>
                <p className="mt-1">Abre el listado o consulta /api/tenders para poblar la cache inicial.</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <SummaryTable title="Organismos compradores mas frecuentes" rows={summary.topBuyers} />
          <SummaryTable title="Estados mas frecuentes" rows={summary.topStatuses} />
          <SummaryTable title="Palabras mas repetidas" rows={summary.topWords} />
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
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <span className="rounded-md bg-paper p-2 text-ocean">{icon}</span>
        </div>
        <p className="mt-4 text-3xl font-bold text-ink">{value}</p>
        <p className="mt-1 text-sm text-slate-600">{helper}</p>
      </CardContent>
    </Card>
  );
}

function SummaryTable({ title, rows }: { title: string; rows: SummaryBucket[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-ocean" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rows.length > 0 ? (
            rows.map((row) => (
              <div key={row.label} className="grid gap-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="min-w-0 truncate font-semibold text-ink">{row.label}</span>
                  <span className="shrink-0 rounded-full bg-paper px-2 py-1 text-xs font-bold text-slate-600">
                    {row.value}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-paper">
                  <div className="h-full rounded-full bg-ocean" style={{ width: `${Math.max(6, (row.value / max) * 100)}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-line bg-paper p-4 text-sm text-slate-600">
              Sin datos suficientes.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
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
