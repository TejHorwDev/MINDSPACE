import { Skeleton } from "@/components/ui/skeleton";

export default function DeveloperDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:px-6 sm:py-16">
      <Skeleton className="h-8 w-28 -ml-2 mb-6" />

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-start">
        <Skeleton className="size-28 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-60" />
          <Skeleton className="h-5 w-36" />
        </div>
      </div>

      <div className="mt-7 flex gap-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card p-6 space-y-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
