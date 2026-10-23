"use client"

import { Button } from "@repo/ui/button"
import { Skeleton } from "@repo/ui/skeleton"

type HintFilterChipsProps = {
  options: readonly { value: string; label: string }[]
  currentValue: string
  allLabel: string
  queryParam: string
  multiSelect: boolean
  isPending: boolean
  groupLabelId: string
  onHintFilterChange?: (queryParam: string, value: string) => void
}

export function HintFilterChips({
  options,
  currentValue,
  allLabel,
  queryParam,
  multiSelect,
  isPending,
  groupLabelId,
  onHintFilterChange,
}: HintFilterChipsProps) {
  if (multiSelect) {
    const selected = new Set(
      currentValue === "" ? [] : currentValue.split(",").filter(Boolean),
    )
    return (
      <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={groupLabelId}>
        {isPending ? (
          <Skeleton className="h-7 w-12 rounded-md" aria-hidden />
        ) : (
          <>
            <Button
              type="button"
              role="checkbox"
              size="sm"
              variant={selected.size === 0 ? "default" : "outline"}
              aria-checked={selected.size === 0}
              className="h-7 px-2.5 text-xs"
              onClick={() => onHintFilterChange?.(queryParam, "")}
            >
              {allLabel}
            </Button>
            {options.map((opt) => {
              const checked = selected.has(opt.value)
              return (
                <Button
                  key={opt.value}
                  type="button"
                  role="checkbox"
                  size="sm"
                  variant={checked ? "default" : "outline"}
                  aria-checked={checked}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => {
                    const next = new Set(selected)
                    if (checked) next.delete(opt.value)
                    else next.add(opt.value)
                    onHintFilterChange?.(queryParam, [...next].join(","))
                  }}
                >
                  {opt.label}
                </Button>
              )
            })}
          </>
        )}
      </div>
    )
  }

  const selectedValue = currentValue === "" ? "__all__" : currentValue
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby={groupLabelId}>
      {isPending ? (
        <Skeleton className="h-7 w-12 rounded-md" aria-hidden />
      ) : (
        <>
          <Button
            type="button"
            role="radio"
            size="sm"
            variant={selectedValue === "__all__" ? "default" : "outline"}
            aria-checked={selectedValue === "__all__"}
            className="h-7 px-2.5 text-xs"
            onClick={() => onHintFilterChange?.(queryParam, "")}
          >
            {allLabel}
          </Button>
          {options.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              role="radio"
              size="sm"
              variant={selectedValue === opt.value ? "default" : "outline"}
              aria-checked={selectedValue === opt.value}
              className="h-7 px-2.5 text-xs"
              onClick={() => onHintFilterChange?.(queryParam, opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </>
      )}
    </div>
  )
}
