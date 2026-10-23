"use client"

import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import { Skeleton } from "@repo/ui/skeleton"
import { cn } from "@repo/ui/utils"

const TABLE_SKELETON_COLUMNS = 5
const TABLE_SKELETON_ROW_CAP = 15

export type AdminEntityAdminListCardTableSkeletonProps = {
  slug: AdminEntitySlug
  isCompactList: boolean
  listLimit: number
}

export function AdminEntityAdminListCardTableSkeleton({
  slug,
  isCompactList,
  listLimit,
}: AdminEntityAdminListCardTableSkeletonProps) {
  const skeletonRowCount = Math.min(listLimit, TABLE_SKELETON_ROW_CAP)
  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      data-testid={`admin-entity-list-skeleton--${slug}`}
    >
      <div className="scrollbar-galaxy min-h-0 min-w-0 flex-1 overflow-auto">
        <div className="min-w-0">
          <div
            className="flex border-b border-border bg-muted/50"
            data-testid={`admin-entity-list-skeleton-head--${slug}`}
          >
            {Array.from({ length: TABLE_SKELETON_COLUMNS }, (_, i) => (
              <div
                key={i}
                className="h-11 flex-1 px-4 py-3 first:pl-4 last:pr-4"
              >
                <Skeleton className="h-4 w-[70%] max-w-32" />
              </div>
            ))}
          </div>
          <div data-testid={`admin-entity-list-skeleton-body--${slug}`}>
            {Array.from({ length: skeletonRowCount }, (_, row) => (
              <div
                key={row}
                className="flex border-b border-border last:border-0"
              >
                {Array.from({ length: TABLE_SKELETON_COLUMNS }, (_, col) => (
                  <div
                    key={col}
                    className={cn(
                      "flex-1 p-4 first:pl-4 last:pr-4",
                      col === TABLE_SKELETON_COLUMNS - 1 && "flex justify-end",
                    )}
                  >
                    <Skeleton
                      className={
                        col === TABLE_SKELETON_COLUMNS - 1
                          ? "h-8 w-20"
                          : "h-4 w-[85%] max-w-40"
                      }
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-t border-border",
          isCompactList ? "px-3 py-1.5" : "flex-wrap px-4 py-3",
        )}
        data-testid={`admin-entity-list-skeleton-pagination--${slug}`}
      >
        <Skeleton className={cn(isCompactList ? "h-8 w-14" : "h-7 w-20")} />
        {isCompactList ? (
          <Skeleton className="mx-auto h-4 w-24 max-w-[45%]" />
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-7 w-9" />
            ))}
          </div>
        )}
        <Skeleton className={cn(isCompactList ? "h-8 w-12" : "h-7 w-16")} />
      </div>
    </div>
  )
}
