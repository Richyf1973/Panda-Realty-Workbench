"use client"

import dynamic from "next/dynamic"

import type { AdminEntityRowActionsProps } from "./admin-entity-row-actions"
import { Skeleton } from "@repo/ui/skeleton"

export const AdminEntityRowActionsLazy =
  dynamic<AdminEntityRowActionsProps>(
    () =>
      import("./admin-entity-row-actions").then(
        (m) => m.AdminEntityRowActions,
      ),
    {
      loading: () => (
        <Skeleton
          className="inline-block h-8 w-8 shrink-0"
          aria-hidden
        />
      ),
    },
  )
