"use client"

import { formatAdminEntityNumericListCell } from "@repo/admin/admin-entity-list-numeric-format"
import { Skeleton } from "@repo/ui/skeleton"

export function formatAUD(value: string | null | undefined): string | null {
  if (!value) return null
  return formatAdminEntityNumericListCell(value, { currencySymbol: "$" })
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return "—"
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatDateStr(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const [year, month, day] = dateStr.split("-").map(Number)
  const d = new Date(year!, month! - 1, day!)
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">{message}</p>
  )
}

export function DataPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-xs">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  )
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}
