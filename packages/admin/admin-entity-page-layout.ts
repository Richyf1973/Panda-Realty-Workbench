import {
  adminEntityPageWidthPresets,
  type AdminEntityPageWidthPreset,
} from "./admin-entity-page-width-presets"
import type { AdminEntityDefinition } from "./admin-entity-types"

export type AdminEntityPageWidthResolveInput = {
  entity: AdminEntityDefinition
  /** From app `frontendConfig.admin.entityPageWidth` when `entity.entityPageWidth` is omitted. */
  defaultEntityPageWidth: AdminEntityPageWidthPreset
}

/** Tailwind `max-w-*` class for the admin entity page shell — call from the app with registry + config (no `@admin-context`). */
export function adminEntityPageWidthClass(
  input: AdminEntityPageWidthResolveInput,
): string {
  const preset =
    input.entity.entityPageWidth ?? input.defaultEntityPageWidth
  return adminEntityPageWidthPresets[preset]
}
