const AMOUNT_RANGE_BY_ESTIMATION_CODE: Record<string, string> = {
  "1": "Menor a 100 UTM",
  "2": "Entre 100 y 1000 UTM",
  "3": "Entre 1000 y 2000 UTM",
  "4": "Entre 2000 y 5000 UTM",
  "5": "Igual o superior a 5000 UTM"
};

const AMOUNT_RANGE_BY_TENDER_TYPE: Record<string, string> = {
  L1: "Menor a 100 UTM",
  E2: "Menor a 100 UTM",
  LE: "Entre 100 y 1000 UTM",
  CO: "Entre 100 y 1000 UTM",
  LP: "Entre 1000 y 2000 UTM",
  B2: "Entre 1000 y 2000 UTM",
  LQ: "Entre 2000 y 5000 UTM",
  H2: "Entre 2000 y 5000 UTM",
  LR: "Igual o superior a 5000 UTM",
  I2: "Igual o superior a 5000 UTM"
};

const INTERNAL_CODE_PATTERN = /^[A-Z0-9]{1,3}$/i;

export function formatTenderAmountRange(value: unknown) {
  const normalized = normalizeCode(value);
  if (!normalized) {
    return undefined;
  }

  return AMOUNT_RANGE_BY_ESTIMATION_CODE[normalized] ?? AMOUNT_RANGE_BY_TENDER_TYPE[normalized.toUpperCase()];
}

export function isProbablyRawInternalCode(value: string) {
  const normalized = value.trim();
  return INTERNAL_CODE_PATTERN.test(normalized);
}

function normalizeCode(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  return undefined;
}
