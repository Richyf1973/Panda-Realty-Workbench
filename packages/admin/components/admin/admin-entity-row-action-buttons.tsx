"use client"

import type { ComponentProps, ReactNode } from "react"

import { Button } from "@repo/ui/button"
import { DropdownMenuItem } from "@repo/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"
import { cn } from "@repo/ui/utils"

import type { AdminEntityRowActionDescriptor } from "./admin-entity-row-action-descriptor"

type IconActionButtonProps = Omit<
  ComponentProps<typeof Button>,
  "children" | "type"
> & {
  tooltip: string
  children: ReactNode
}

/** Icon button with a bottom tooltip — the shared shape for every inline row-action control. */
export function IconActionButton({
  tooltip,
  className,
  children,
  ...props
}: IconActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" className={cn(className)} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  )
}

/** A collapsible action rendered as an inline icon button (expanded state). */
export function DescriptorIconButton({ d }: { d: AdminEntityRowActionDescriptor }) {
  const Icon = d.icon
  const tooltip = d.disabled && d.disabledReason ? d.disabledReason : d.label

  if (d.href && !d.disabled) {
    return (
      <IconActionButton
        tooltip={tooltip}
        variant="outline"
        size="icon-sm"
        aria-label={d.label}
        data-testid={d.testId}
        asChild
      >
        <a href={d.href}>
          <Icon data-icon="inline-start" />
        </a>
      </IconActionButton>
    )
  }

  // Disabled buttons drop pointer events, so wrap in a focusable span to keep the tooltip reachable.
  const button = (
    <IconActionButton
      tooltip={tooltip}
      variant={d.destructive ? "destructive" : "outline"}
      size="icon-sm"
      aria-label={tooltip}
      data-testid={d.testId}
      disabled={d.disabled}
      onClick={d.disabled ? undefined : d.onSelect}
    >
      <Icon data-icon="inline-start" />
    </IconActionButton>
  )

  if (d.disabled) {
    return (
      <span className="inline-flex" tabIndex={0}>
        {button}
      </span>
    )
  }
  return button
}

/** A collapsible action rendered as a dropdown menu item (collapsed state). */
export function DescriptorMenuItem({ d }: { d: AdminEntityRowActionDescriptor }) {
  const Icon = d.icon
  if (d.href && !d.disabled) {
    return (
      <DropdownMenuItem asChild data-testid={d.testId}>
        <a href={d.href}>
          <Icon data-icon="inline-start" />
          {d.label}
        </a>
      </DropdownMenuItem>
    )
  }
  return (
    <DropdownMenuItem
      variant={d.destructive ? "destructive" : "default"}
      disabled={d.disabled}
      title={d.disabled ? d.disabledReason : undefined}
      data-testid={d.testId}
      onSelect={() => d.onSelect?.()}
    >
      <Icon data-icon="inline-start" />
      {d.label}
    </DropdownMenuItem>
  )
}
