"use client"

import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityListResponse } from "../../admin-entity-list-api"
import { paginationWindow } from "../../admin-entity-admin-list-fetch"
import { Button } from "@repo/ui/button"

export type AdminEntityAdminListCardPaginationProps = {
  slug: AdminEntitySlug
  isCompactList: boolean
  listPayload: AdminEntityListResponse | undefined
  displayPage: number
  totalPages: number
  rowCount: number
  totalCount: number
  goPrevPage: () => void
  goNextPage: () => void
  goToPage: (page: number) => void
}

export function AdminEntityAdminListCardPagination({
  slug,
  isCompactList,
  listPayload,
  displayPage,
  totalPages,
  rowCount,
  totalCount,
  goPrevPage,
  goNextPage,
  goToPage,
}: AdminEntityAdminListCardPaginationProps) {
  if (isCompactList) {
    return (
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-1.5"
        data-testid={`admin-entity-pagination--${slug}`}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!listPayload?.hasPreviousPage}
          data-testid={`admin-entity-pagination-prev--${slug}`}
          className="h-8 shrink-0 px-2.5 text-xs"
          onClick={goPrevPage}
        >
          Prev
        </Button>
        <p
          className="min-w-0 flex-1 px-1 text-center text-xs leading-tight tabular-nums text-muted-foreground"
          data-testid={`admin-entity-pagination-summary--${slug}`}
        >
          Page {displayPage} / {totalPages}
          <span className="sr-only">
            {`, ${rowCount} rows on this page, ${totalCount} total`}
          </span>
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!listPayload?.hasNextPage}
          data-testid={`admin-entity-pagination-next--${slug}`}
          className="h-8 shrink-0 px-2.5 text-xs"
          onClick={goNextPage}
        >
          Next
        </Button>
      </div>
    )
  }

  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3"
      data-testid={`admin-entity-pagination--${slug}`}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!listPayload?.hasPreviousPage}
        data-testid={`admin-entity-pagination-prev--${slug}`}
        onClick={goPrevPage}
      >
        Previous
      </Button>
      <div
        className="flex flex-wrap items-center justify-center gap-1"
        data-testid={`admin-entity-pagination-pages--${slug}`}
      >
        {paginationWindow(displayPage, totalPages).map((entry, i) =>
          entry === "gap" ? (
            <span
              key={`gap-${i}`}
              className="px-1 text-muted-foreground"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              key={entry}
              type="button"
              variant={entry === displayPage ? "default" : "outline"}
              size="sm"
              className="min-w-9"
              data-testid={`admin-entity-pagination-page--${slug}--${entry}`}
              onClick={() => goToPage(entry)}
            >
              {entry}
            </Button>
          ),
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!listPayload?.hasNextPage}
        data-testid={`admin-entity-pagination-next--${slug}`}
        onClick={goNextPage}
      >
        Next
      </Button>
    </div>
  )
}
