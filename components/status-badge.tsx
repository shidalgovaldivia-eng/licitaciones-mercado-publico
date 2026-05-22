import { clsx } from "clsx";
import { statusLabel } from "@/lib/mercado-publico/status";

const toneByStatus: Record<string, string> = {
  "5": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  activas: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "6": "bg-slate-100 text-slate-700 ring-slate-200",
  "7": "bg-orange-50 text-orange-700 ring-orange-200",
  "8": "bg-ocean/10 text-ocean ring-ocean/20",
  "18": "bg-red-50 text-red-700 ring-red-200",
  "19": "bg-amber-50 text-amber-700 ring-amber-200"
};

export function StatusBadge({ status }: { status?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ring-1",
        toneByStatus[status ?? ""] ?? "bg-slate-100 text-slate-700 ring-slate-200"
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
