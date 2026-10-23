import type { ReactNode } from "react"

/**
 * Narrow TanStack Form API used by app-supplied computed CRUD fields (`renderCrudFormComputedField`).
 */
export type AdminEntityCrudFormSubscribeApi = {
  Subscribe: (props: {
    selector: (state: { values: Record<string, string> }) => string
    children: (value: string) => ReactNode
  }) => ReactNode
  setFieldValue: (name: string, value: string) => void
  getFieldValue: (name: string) => unknown
}
