export const TENDER_STATUS_LABELS: Record<string, string> = {
  "5": "Publicada",
  "6": "Cerrada",
  "7": "Desierta",
  "8": "Adjudicada",
  "18": "Revocada",
  "19": "Suspendida",
  activas: "Activas"
};

export const TENDER_STATUS_OPTIONS = [
  { value: "activas", label: "Activas" },
  { value: "5", label: "Publicadas" },
  { value: "6", label: "Cerradas" },
  { value: "8", label: "Adjudicadas" },
  { value: "7", label: "Desiertas" },
  { value: "18", label: "Revocadas" },
  { value: "19", label: "Suspendidas" }
];

export function statusLabel(status?: string | number | null) {
  if (status === undefined || status === null || status === "") {
    return "Sin estado";
  }

  const key = String(status);
  return TENDER_STATUS_LABELS[key] ?? key;
}
