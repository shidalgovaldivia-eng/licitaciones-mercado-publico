export type PurchaseOrderListItem = {
  code: string;
  name: string;
  statusCode?: string;
  statusLabel: string;
  type?: string;
  buyerName?: string;
  supplierName?: string;
  total?: number;
  currency?: string;
  sentAt?: string;
  tenderCode?: string;
};

export type PurchaseOrderDetail = PurchaseOrderListItem & {
  description?: string;
  supplierStatus?: string;
  tenderCode?: string;
  netTotal?: number;
  taxAmount?: number;
  grossTotal?: number;
  taxPercent?: number;
  financing?: string;
  buyer: {
    code?: string;
    name?: string;
    unit?: string;
    commune?: string;
    region?: string;
    activity?: string;
    contactName?: string;
  };
  supplier: {
    code?: string;
    name?: string;
    rut?: string;
    branchName?: string;
    commune?: string;
    region?: string;
    activity?: string;
  };
  dates: {
    createdAt?: string;
    sentAt?: string;
    acceptedAt?: string;
    cancelledAt?: string;
    updatedAt?: string;
  };
  items: PurchaseOrderItem[];
};

export type PurchaseOrderItem = {
  categoryCode?: string;
  category?: string;
  productCode?: string;
  product?: string;
  buyerSpecification?: string;
  supplierSpecification?: string;
  quantity?: number;
  unit?: string;
  currency?: string;
  netPrice?: number;
  total?: number;
};
