"use client"

import type { HeaderContext } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { Button } from "@repo/ui/button"
import { cn } from "@repo/ui/utils"

export function SortableColumnHeader<TData, TValue>({
  column,
  label,
  testId,
  className,
}: {
  column: HeaderContext<TData, TValue>["column"]
  label: string
  /** Stable selector for column sort control (e.g. scoped by entity slug + column key). */
  testId: string
  className?: string
}) {
  const sorted = column.getIsSorted()
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-testid={testId}
      className={cn(
        "-ml-2 h-8 gap-1 px-2 font-medium text-muted-foreground hover:text-foreground data-[state=open]:text-foreground",
        className,
      )}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {label}
      {sorted === "desc" ? (
        <ArrowDown className="size-3.5 opacity-70" aria-hidden />
      ) : sorted === "asc" ? (
        <ArrowUp className="size-3.5 opacity-70" aria-hidden />
      ) : (
        <ChevronsUpDown className="size-3.5 opacity-40" aria-hidden />
      )}
    </Button>
  )
}
