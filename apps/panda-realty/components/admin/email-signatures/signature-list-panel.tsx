"use client"

import { useMemo } from "react"
import { ChevronDown, PanelLeftOpen } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui/collapsible"
import { cn } from "@repo/ui/utils"

import type { EmailSignatureItem } from "./types"

function plainTextPreview(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "Empty signature"
}

export function SignatureListPanel({
  items,
  listPanelOpen,
  selectedId,
  onOpenChange,
  onSelectItem,
}: {
  items: EmailSignatureItem[]
  listPanelOpen: boolean
  selectedId: number | null
  onOpenChange: (open: boolean) => void
  onSelectItem: (item: EmailSignatureItem) => void
}) {
  const previews = useMemo(
    () => new Map(items.map((item) => [item.id, plainTextPreview(item.renderedHtml)])),
    [items],
  )

  return (
    <Collapsible
      open={listPanelOpen}
      onOpenChange={onOpenChange}
      className="min-w-0 overflow-hidden rounded-xl border bg-background"
      data-testid="email-signatures-list"
    >
      <section
        className={cn("flex h-full min-w-0 flex-col", listPanelOpen ? "p-4" : "p-2")}
        data-testid="email-signatures-list-panel"
      >
        <CollapsibleTrigger
          className={cn(
            "group flex w-full items-center rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            listPanelOpen ? "justify-between px-1 py-1" : "justify-center px-0 py-2",
          )}
          data-testid="email-signatures-list-toggle"
        >
          {listPanelOpen ? (
            <>
              <div className="min-w-0" data-testid="email-signatures-list-header">
                <h1 className="font-heading text-lg font-semibold">Email signatures</h1>
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="email-signatures-list-description"
                >
                  Shared office signatures for Quick Send.
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  listPanelOpen && "rotate-180",
                )}
              />
            </>
          ) : (
            <PanelLeftOpen className="h-5 w-5 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent id="email-signatures-list-content" forceMount className="data-[state=closed]:hidden">
          <div className="mt-4 space-y-2 overflow-hidden">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "w-full min-w-0 rounded-xl border px-3 py-3 text-left transition-colors",
                  selectedId === item.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-muted/40",
                )}
                onClick={() => onSelectItem(item)}
                data-testid={`email-signatures-list-item--${item.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{item.name}</div>
                    <div className="line-clamp-2 wrap-break-word text-sm text-muted-foreground">
                      {previews.get(item.id)}
                    </div>
                  </div>
                  {item.isDefault ? (
                    <span
                      className="mt-0.5 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                      data-testid={`email-signatures-default-badge--${item.id}`}
                    >
                      Default
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}
