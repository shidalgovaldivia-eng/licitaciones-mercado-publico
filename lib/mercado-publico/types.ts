export type TenderStatusCode = "5" | "6" | "7" | "8" | "18" | "19" | string;

export type TenderListItem = {
  code: string;
  name: string;
  description?: string;
  status: TenderStatusCode;
  statusLabel: string;
  buyerName?: string;
  buyerCode?: string;
  region?: string;
  type?: string;
  amount?: number;
  publishDate?: string;
  closeDate?: string;
};

export type TenderDetail = TenderListItem & {
  questionStartDate?: string;
  questionEndDate?: string;
  awardDate?: string;
  items: TenderLineItem[];
};

export type TenderLineItem = {
  id: string;
  description: string;
  quantity?: number;
  unit?: string;
};

export type TenderSearchParams = {
  status?: string;
  date?: string;
};

export type MercadoPublicoResponse = {
  Cantidad?: number;
  FechaCreacion?: string;
  Version?: string;
  Listado?: unknown[];
};
