"use client"

import { useState } from "react"
import { ImageOff } from "lucide-react"

import { cn } from "@repo/ui/utils"

export type AdminEntityListImageCellProps = {
  readonly src: string
  readonly alt: string
  readonly testId?: string
}

/**
 * List-cell thumbnail for an image-URL column (opt-in via {@link AdminEntityColumn.listCellImage}).
 * Renders a small square preview; on load error (or empty src) it falls back to a muted placeholder
 * so a broken URL never reverts to a long raw-text string that blows out the column width.
 */
export function AdminEntityListImageCell({
  src,
  alt,
  testId,
}: AdminEntityListImageCellProps) {
  const [errored, setErrored] = useState(false)
  const trimmed = src.trim()

  if (trimmed === "" || errored) {
    return (
      <span
        className="inline-flex size-8 items-center justify-center rounded border border-border bg-muted text-muted-foreground"
        data-testid={testId}
        aria-label={alt !== "" ? `${alt} (no image)` : "No image"}
        title={trimmed === "" ? undefined : trimmed}
      >
        <ImageOff className="size-4" aria-hidden />
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external CDN URLs; no static optimization wanted in a dense admin list
    <img
      src={trimmed}
      alt={alt}
      title={alt !== "" ? alt : undefined}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={cn("size-8 rounded border border-border object-cover")}
      data-testid={testId}
    />
  )
}
