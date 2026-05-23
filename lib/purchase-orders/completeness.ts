import type { PurchaseOrderListItem } from "@/types/purchaseOrder";

export function isPurchaseOrderIncomplete(order: PurchaseOrderListItem) {
  return !order.buyerName || !order.supplierName || order.total === undefined || !order.sentAt;
}
