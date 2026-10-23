import { cn } from "@repo/ui/utils"

export type ListFiltersToolbarLayout = {
  denseDesktop: boolean
  labelClass: string
  fieldWrap: string
  rowWrap: string
}

/** Row/label wrap classes for list filters toolbar (desktop dense vs mobile stack). */
export function resolveListFiltersToolbarLayout(
  compactVertical: boolean,
  listFiltersToolbarDense: boolean,
): ListFiltersToolbarLayout {
  const denseDesktop = listFiltersToolbarDense === true && !compactVertical
  const labelClass = cn(
    "font-normal text-muted-foreground",
    compactVertical || denseDesktop ? "text-xs" : "text-sm",
  )
  const fieldWrap = compactVertical
    ? "flex w-full min-w-0 flex-col gap-1"
    : denseDesktop
      ? "flex min-w-[min(100%,14rem)] max-w-md flex-1 flex-col gap-1"
      : "flex min-w-[min(100%,16rem)] max-w-md flex-1 flex-col gap-1.5"
  const rowWrap = compactVertical
    ? "flex w-full flex-col gap-3"
    : denseDesktop
      ? "flex flex-wrap items-end gap-2"
      : "flex flex-wrap items-end gap-4"
  return { denseDesktop, labelClass, fieldWrap, rowWrap }
}
