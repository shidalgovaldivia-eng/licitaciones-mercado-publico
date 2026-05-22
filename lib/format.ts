export function formatCurrency(value?: number) {
  if (value === undefined) {
    return "Monto no especificado";
  }

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCLP(value?: number, currency = "CLP") {
  if (value === undefined) {
    return "No especificado";
  }

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currency || "CLP",
    maximumFractionDigits: currency === "CLP" ? 0 : 2
  }).format(value);
}

export function formatDate(value?: string) {
  return formatShortDate(value);
}

export function formatTenderAmount(amount?: number, amountText?: string) {
  if (amountText) {
    return amountText;
  }

  return formatCurrency(amount);
}

export function formatDateTime(value?: string) {
  if (!value) {
    return "No informada";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function formatShortDate(value?: string) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function normalizeHtmlEntities(value?: string) {
  if (!value) {
    return undefined;
  }

  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
