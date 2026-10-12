import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectBuildLoading() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Top Header Placeholder */}
      <div className="flex h-14 w-full items-center justify-between border-b border-border/70 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-20 hidden sm:block" />
          <Skeleton className="h-4 w-20 hidden sm:block" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>

      {/* Editor Sub-Bar Placeholder */}
      <div className="flex h-10 w-full items-center justify-between border-b border-border/50 px-4">
        <Skeleton className="h-4 w-52" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      {/* Tabs Placeholder */}
      <div className="flex h-10 w-full items-center gap-1 border-b border-border bg-muted/30 px-3">
        <Skeleton className="h-7 w-28 rounded-t-md" />
        <Skeleton className="h-7 w-28 rounded-t-md" />
      </div>

      {/* Main Workspace Placeholder */}
      <div className="flex flex-1 overflow-hidden">
        {/* Explorer Sidebar Placeholder */}
        <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar/50 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="size-6 rounded-md" />
          </div>
          <div className="space-y-1.5 pt-2">
            <Skeleton className="h-7 w-full rounded-md" />
            <Skeleton className="h-7 w-full rounded-md" />
            <Skeleton className="h-7 w-full rounded-md" />
            <Skeleton className="h-7 w-full rounded-md" />
          </div>
        </div>

        {/* Monaco Editor Placeholder */}
        <div className="flex flex-1 items-center justify-center bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Skeleton className="size-4 rounded-full" />
            <span>Loading editor…</span>
          </div>
        </div>
      </div>
    </div>
  );
}
