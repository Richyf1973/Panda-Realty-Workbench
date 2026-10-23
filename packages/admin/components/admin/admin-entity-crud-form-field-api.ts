import type { ReactNode } from "react"

/**
 * Narrow TanStack Form surface used by admin CRUD dialogs whose values are string maps.
 * Full `useForm` instances satisfy this; callers cast at the boundary.
 */
export type AdminEntityCrudFormFieldApi = {
  Field: (props: {
    key?: string
    name: string
    validators?: {
      onSubmit?: (opts: { value: string }) => string | undefined
    }
    children: (field: {
      name: string
      state: {
        value: string
        meta: { isValid: boolean; errors: unknown[] | readonly unknown[] }
      }
      handleChange: (v: string) => void
      handleBlur: () => void
    }) => ReactNode
  }) => ReactNode
}
