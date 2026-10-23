"use client"

import { adminEntityListFilterSegmentButtonClassName } from "./admin-entity-list-filter-segment-button-classname"
import type { AdminEntityListAppendWhereHintFilter } from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import { Button } from "@repo/ui/button"
import { ButtonGroup } from "@repo/ui/button-group"
import { cn } from "@repo/ui/utils"

type AdminEntityHintFilterSegmentButtonProps = {
  spec: AdminEntityListAppendWhereHintFilter
  slug: AdminEntitySlug
  currentValue: string
  denseDesktop: boolean
  labelClass: string
  compactVertical: boolean
  onSegmentChange?: (queryParam: string, value: string) => void
}

export function AdminEntityHintFilterSegmentButton({
  spec,
  slug,
  currentValue,
  denseDesktop,
  labelClass,
  compactVertical,
  onSegmentChange,
}: AdminEntityHintFilterSegmentButtonProps) {
  const labelId = `admin-entity-hint-filter-segment-label--${spec.queryParam}`
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-start",
        denseDesktop ? "gap-1" : "gap-1.5",
        compactVertical ? "w-full" : "w-auto max-w-full",
      )}
    >
      <span className={labelClass} id={labelId}>
        {spec.groupLabel}
      </span>
      <ButtonGroup
        segmentStyle="panel"
        role="radiogroup"
        aria-labelledby={labelId}
        className="w-full sm:w-auto"
      >
        <Button
          type="button"
          role="radio"
          size="sm"
          variant={currentValue === "" ? "secondary" : "ghost"}
          aria-checked={currentValue === ""}
          className={adminEntityListFilterSegmentButtonClassName(
            compactVertical,
            currentValue === "",
            { compactGrow: compactVertical, denseDesktop },
          )}
          data-testid={`admin-entity-list-append-where-hint--${slug}--${spec.queryParam}--all`}
          onClick={() => onSegmentChange?.(spec.queryParam, "")}
        >
          {spec.allLabel}
        </Button>
        {spec.options.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            role="radio"
            size="sm"
            variant={currentValue === opt.value ? "secondary" : "ghost"}
            aria-checked={currentValue === opt.value}
            className={adminEntityListFilterSegmentButtonClassName(
              compactVertical,
              currentValue === opt.value,
              { compactGrow: compactVertical, denseDesktop },
            )}
            data-testid={`admin-entity-list-append-where-hint--${slug}--${spec.queryParam}--${opt.value}`}
            onClick={() => onSegmentChange?.(spec.queryParam, opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </ButtonGroup>
    </div>
  )
}
