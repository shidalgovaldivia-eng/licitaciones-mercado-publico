import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PurchaseOrderDetailLoading() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-5">
        <Skeleton className="h-72" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-5 h-48" />
          </Card>
          <Card className="p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-5 h-48" />
          </Card>
        </div>
      </div>
    </main>
  );
}
