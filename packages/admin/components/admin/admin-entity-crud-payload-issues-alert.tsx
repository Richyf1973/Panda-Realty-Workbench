"use client"

import { useId, useState } from "react"

import { Button } from "@repo/ui/button"
import { cn } from "@repo/ui/utils"

import type { AdminEntityCrudBodyFieldIssue } from "../../admin-entity-crud-form-values"
import { formatAdminEntityCrudPayloadIssuesSummary } from "../../admin-entity-crud-form-values"

export function AdminEntityCrudPayloadIssuesAlert({
  slug,
  issues,
  className,
}: {
  slug: string
  issues: readonly AdminEntityCrudBodyFieldIssue[]
  className?: string
}) {
  const summaryId = useId()
  const [technicalOpen, setTechnicalOpen] = useState(false)
  const keys = [...new Set(issues.map((i) => i.key))]
  const summary = formatAdminEntityCrudPayloadIssuesSummary(issues)

  return (
    <div
      className={cn("min-w-0 space-y-2", className)}
      role="alert"
      data-testid={`admin-entity-crud-client-payload-issues--${slug}`}
    >
      <p className="text-sm text-destructive" id={summaryId}>
        {summary}
      </p>
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto min-h-0 justify-start px-0 py-0 text-xs font-medium text-muted-foreground hover:text-foreground"
          aria-expanded={technicalOpen}
          aria-controls={`${summaryId}-technical`}
          aria-label={
            technicalOpen
              ? `Hide technical payload field keys (${slug})`
              : `Show technical payload field keys (${slug})`
          }
          data-testid={`admin-entity-crud-client-payload-issues-technical-toggle--${slug}`}
          onClick={() => setTechnicalOpen((o) => !o)}
        >
          {technicalOpen ? "Hide" : "Show"} technical details
        </Button>
        {technicalOpen ? (
          <p
            id={`${summaryId}-technical`}
            className="break-all font-mono text-xs text-muted-foreground"
            data-testid={`admin-entity-crud-client-payload-issues-technical--${slug}`}
          >
            {keys.join(", ")}
          </p>
        ) : null}
      </div>
    </div>
  )
}
