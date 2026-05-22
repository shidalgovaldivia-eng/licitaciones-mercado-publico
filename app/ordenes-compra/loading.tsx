import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PurchaseOrdersLoading() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <Skeleton className="h-72" />
        <Skeleton className="h-24" />
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-5 h-8 w-4/5" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
