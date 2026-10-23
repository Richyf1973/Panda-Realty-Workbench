import { Skeleton } from "@repo/ui/skeleton"

/** Loading placeholder while the admin CRUD client chunk loads. */
export function AdminEntityAdminSkeleton() {
  return (
    <div
      className="scrollbar-galaxy flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
      aria-busy
      data-testid="admin-entity-admin-loading"
    >
      <Skeleton className="min-h-[min(48vh,360px)] w-full flex-1 rounded-xl ring-1 ring-border/80" />
    </div>
  )
}
