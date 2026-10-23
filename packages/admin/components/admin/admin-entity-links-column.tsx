"use client"

import type { ColumnDef, Row } from "@tanstack/react-table"
import type { ReactNode } from "react"

import type { AdminEntityTableRow } from "../../admin-entity-admin-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/tooltip"
import { Button } from "@repo/ui/button"

type LinksColumnParams = {
  slug: AdminEntitySlug
  showAggregateFooter: boolean
  renderListRowLinks: (args: {
    readonly slug: string
    readonly row: AdminEntityTableRow
  }) => readonly {
    readonly href: string | null
    readonly icon: ReactNode
    readonly tooltip: string
  }[] | null | undefined
}

export function buildLinksColumn({
  slug,
  showAggregateFooter,
  renderListRowLinks,
}: LinksColumnParams): ColumnDef<AdminEntityTableRow> {
  return {
    id: "row-links",
    header: () => <span className="sr-only">Links</span>,
    footer: showAggregateFooter ? () => null : undefined,
    enableSorting: false,
    cell: ({ row }: { row: Row<AdminEntityTableRow> }) => {
      const links = renderListRowLinks({ slug, row: row.original })
      if (!links || links.length === 0) return null
      return (
        <div className="flex items-center gap-1">
          {links.map((link, i) =>
            link.href ? (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={-1}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    >
                      {link.icon}
                      <span className="sr-only">{link.tooltip}</span>
                    </Button>
                  </a>
                </TooltipTrigger>
                <TooltipContent>{link.tooltip}</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled
                    className="h-7 w-7"
                  >
                    {link.icon}
                    <span className="sr-only">{link.tooltip}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{link.tooltip}</TooltipContent>
              </Tooltip>
            ),
          )}
        </div>
      )
    },
  }
}
