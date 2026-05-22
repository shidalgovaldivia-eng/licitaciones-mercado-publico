import type { TenderListItem } from "@/lib/mercado-publico/types";

export function isTenderIncomplete(tender: TenderListItem) {
  return (
    !tender.buyerName ||
    (!tender.amount && !tender.amountText) ||
    (!tender.region && !tender.type)
  );
}
