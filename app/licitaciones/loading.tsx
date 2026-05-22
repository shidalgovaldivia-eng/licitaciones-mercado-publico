import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function LicitacionesLoading() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <Skeleton className="h-14 w-72" />
        <Skeleton className="h-72" />
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-5 h-8 w-4/5" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
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
