const TENDER_TYPE_LABELS: Record<string, string> = {
  L1: "Licitacion publica menor a 100 UTM",
  LE: "Licitacion publica entre 100 y 1000 UTM",
  LP: "Licitacion publica entre 1000 y 2000 UTM",
  LQ: "Licitacion publica entre 2000 y 5000 UTM",
  LR: "Licitacion publica igual o superior a 5000 UTM",
  E2: "Licitacion privada menor a 100 UTM",
  CO: "Licitacion privada entre 100 y 1000 UTM",
  B2: "Licitacion privada entre 1000 y 2000 UTM",
  H2: "Licitacion privada entre 2000 y 5000 UTM",
  I2: "Licitacion privada igual o superior a 5000 UTM",
  LS: "Servicios personales especializados",
  B1: "Compra agil",
  CA: "Compra agil",
  CM: "Convenio marco",
  C1: "Compra coordinada"
};

export function formatTenderType(value?: string) {
  if (!value) {
    return undefined;
  }

  const clean = value.trim();
  const upper = clean.toUpperCase();
  return TENDER_TYPE_LABELS[upper] ?? clean;
}
