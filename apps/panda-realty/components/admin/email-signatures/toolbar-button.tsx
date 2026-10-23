"use client"

import type React from "react"

import { Button } from "@repo/ui/button"

export function ToolbarButton({
  children,
  onClick,
  disabled,
  testId,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  testId: string
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled}
      data-testid={testId}
      onMouseDown={(event) => {
        event.preventDefault()
        onClick()
      }}
      onClick={(event) => {
        event.preventDefault()
      }}
    >
      {children}
    </Button>
  )
}
