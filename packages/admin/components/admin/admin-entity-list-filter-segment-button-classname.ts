import { cn } from "@repo/ui/utils"

/** Shared segment-button sizing for boolean / append-where hint filter groups. */
export function adminEntityListFilterSegmentButtonClassName(
  compactVertical: boolean,
  selected: boolean,
  options?: { compactGrow?: boolean; denseDesktop?: boolean },
) {
  const denseDesktop = options?.denseDesktop === true && !compactVertical
  const sizeClass = compactVertical
    ? "h-9 min-h-9 shrink-0 rounded-none border-0 px-2.5 text-xs shadow-none"
    : denseDesktop
      ? "h-8 min-h-8 shrink-0 rounded-none border-0 px-2 text-xs shadow-none"
      : "h-9 min-w-18 shrink-0 rounded-none border-0 px-3.5 text-[0.8125rem] shadow-none"
  return cn(
    sizeClass,
    "ring-0 ring-offset-0",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
    selected
      ? "font-semibold text-foreground"
      : "font-normal text-muted-foreground",
    options?.compactGrow && "min-w-0 flex-1",
  )
}
