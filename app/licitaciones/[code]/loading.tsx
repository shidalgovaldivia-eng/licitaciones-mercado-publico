import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TenderDetailLoading() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-5">
        <Skeleton className="h-72" />
        <Card className="p-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-5 h-10 w-4/5" />
          <Skeleton className="mt-4 h-20 w-full" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
