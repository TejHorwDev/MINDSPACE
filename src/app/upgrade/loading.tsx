import { Skeleton } from "@/components/ui/skeleton";

export default function UpgradeLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-14 border-b border-border/80 px-4 sm:px-8 flex items-center justify-between">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-10 sm:py-16 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Skeleton className="h-6 w-32 rounded-full mx-auto" />
          <Skeleton className="h-10 w-80 rounded-xl mx-auto" />
          <Skeleton className="h-4 w-96 rounded mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-3xl border border-border/80 p-8 space-y-6">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-8 w-48 rounded" />
              <Skeleton className="h-10 w-32 rounded-xl" />
              <div className="space-y-3 pt-4 border-t border-border/60">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-4 w-full rounded" />
                ))}
              </div>
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
