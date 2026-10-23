import type { ReactNode } from "react"

import type { AdminRenderCrudDialogFormBodyArgs } from "@repo/admin/admin-client-registry-context"

export type FieldApi = {
  state: {
    value: string
    meta: { errors: readonly string[] }
  }
  handleChange: (v: string) => void
  handleBlur: () => void
}

/** TanStack Form subset used by custom entities dialog fields. */
export type PandaEntitiesFormLike = NonNullable<
  AdminRenderCrudDialogFormBodyArgs["form"]
> & {
  Field: (props: {
    name: string
    validators?: { onSubmit?: (args: { value: string }) => string | undefined }
    children: (field: FieldApi) => ReactNode
  }) => ReactNode
  Subscribe: (props: {
    selector: (state: { values: Record<string, string> }) => string
    children: (value: string) => ReactNode
  }) => ReactNode
}
