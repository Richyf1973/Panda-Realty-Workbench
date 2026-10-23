import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "./utils"

/**
 * - **merged** — Shared cell borders (outline segments); use with `Button` outline/default.
 * - **panel** — One outer border + dividers; flatter inactive segments (e.g. ghost + default).
 */
const buttonGroupVariants = cva(
  "flex w-fit items-stretch [&>*]:focus-visible:relative [&>*]:focus-visible:z-10",
  {
    variants: {
      orientation: {
        horizontal: "",
        vertical: "flex-col",
      },
      segmentStyle: {
        merged: "",
        panel: "",
      },
    },
    compoundVariants: [
      {
        orientation: "horizontal",
        segmentStyle: "merged",
        class:
          "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
      },
      {
        orientation: "vertical",
        segmentStyle: "merged",
        class:
          "[&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none",
      },
      {
        orientation: "horizontal",
        segmentStyle: "panel",
        class:
          "divide-x divide-border overflow-hidden rounded-lg border border-border bg-background shadow-xs [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none",
      },
      {
        orientation: "vertical",
        segmentStyle: "panel",
        class:
          "divide-y divide-border overflow-hidden rounded-lg border border-border bg-background shadow-xs [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none",
      },
    ],
    defaultVariants: {
      orientation: "horizontal",
      segmentStyle: "merged",
    },
  },
)

function ButtonGroup({
  className,
  orientation,
  segmentStyle,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      data-slot="button-group"
      className={cn(
        buttonGroupVariants({ orientation, segmentStyle }),
        className,
      )}
      {...props}
    />
  )
}

export { ButtonGroup, buttonGroupVariants }
