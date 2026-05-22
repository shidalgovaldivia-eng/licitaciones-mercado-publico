import { statusLabel } from "@/lib/mercado-publico/status";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status?: string }) {
  const variant = getVariant(status);
  return <Badge variant={variant}>{statusLabel(status)}</Badge>;
}

function getVariant(status?: string): "default" | "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "5":
    case "activas":
      return "success";
    case "7":
    case "19":
      return "warning";
    case "18":
      return "danger";
    case "6":
      return "muted";
    default:
      return "default";
  }
}
