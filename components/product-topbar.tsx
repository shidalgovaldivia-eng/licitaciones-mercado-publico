import type React from "react";
import { CheckCircle2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ProductTopbar({
  placeholder = "Buscar por código, comprador, proveedor o categoría...",
  right
}: {
  placeholder?: string;
  right?: React.ReactNode;
}) {
  return (
    <Card className="border-white/80 bg-white/85 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">{placeholder}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {right ?? (
            <>
              <StatusChip label="Cache activo" />
              <StatusChip label="No bloqueante" />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
