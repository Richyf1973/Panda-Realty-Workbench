"use client"

import type { ReactNode } from "react"

import type { AdminRenderAdminEntityListGridItem } from "@repo/admin/admin-client-registry-context"
import { cn } from "@repo/ui/utils"
import { Mail, Phone, UserRound } from "lucide-react"

function embedText(
  row: Record<string, unknown>,
  embedKey: string,
  fieldKey: string,
): string {
  const emb = row[embedKey]
  if (emb && typeof emb === "object" && !Array.isArray(emb)) {
    const v = (emb as Record<string, unknown>)[fieldKey]
    if (v != null && String(v).trim() !== "") return String(v).trim()
  }
  return ""
}

function line(
  icon: React.ReactNode,
  label: string,
  value: string,
): ReactNode {
  if (value === "") return null
  return (
    <div className="flex min-w-0 gap-2 text-sm">
      <span className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <span className="sr-only">{label}: </span>
        <span className="wrap-break-word wrap-anywhere">{value}</span>
      </div>
    </div>
  )
}

/** Custom grid card for Panda Realty **entities** admin list (`listGrid.registryGridItemKey`). */
export const pandaEntitiesAdminGridItem: AdminRenderAdminEntityListGridItem = ({
  row,
}) => {
  const r = row as Record<string, unknown>
  const name = String(r.entityName ?? "").trim() || "Untitled entity"
  const entityCat = embedText(r, "entityCategory", "entityCategoryName")
  const contactCat = embedText(r, "contactCategory", "contactCategoryName")
  const buyerStatus = embedText(r, "buyerStatusRow", "buyerStatus")
  const leadSource = embedText(r, "leadSourceRow", "leadSource")
  const email = String(r.emailAddress ?? "").trim()
  const phone =
    String(r.contact ?? "").trim() ||
    String(r.mobile ?? "").trim()

  const seller = r.isSeller === true

  return (
    <div className="min-w-0 space-y-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <UserRound
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <h3 className="min-w-0 text-base font-semibold leading-tight wrap-anywhere">
            {name}
          </h3>
          {seller ? (
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-md border border-transparent bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground",
              )}
            >
              Seller
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {[entityCat, contactCat, buyerStatus, leadSource]
            .filter((t) => t !== "")
            .map((t, i) => (
              <span
                key={`${t}-${i}`}
                title={t}
                className={cn(
                  "inline-flex max-w-full items-center truncate rounded-md border border-border bg-background px-2 py-0.5 text-xs font-normal text-foreground",
                )}
              >
                {t}
              </span>
            ))}
        </div>
      </div>
      <div className="space-y-1.5 text-muted-foreground">
        {line(
          <Mail className="size-3.5" />,
          "Email",
          email,
        )}
        {line(
          <Phone className="size-3.5" />,
          "Phone",
          phone,
        )}
      </div>
    </div>
  )
}
