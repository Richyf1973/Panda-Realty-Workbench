import type { AdminEntitySlug } from "./admin-entity-slug-client"
import {
  focusFirstAdminEntityCrudPayloadIssueField,
  scheduleAfterDoubleRaf,
} from "./admin-entity-crud-payload-focus"

/** When body/patch builders return `null` but no per-field issues were listed (unexpected). */
export const ADMIN_ENTITY_CRUD_FALLBACK_PAYLOAD_BUILD_ERROR_MESSAGE =
  "Required fields are missing or invalid. Check the form for errors."

type NotifyPayloadFieldIssues = (args: {
  readonly slug: AdminEntitySlug
  readonly fieldKeys: readonly string[]
}) => void

/**
 * After state updates paint, notify app hooks (e.g. open collapsed sections) then focus the first
 * invalid control once layout has settled.
 */
export function notifyAndScheduleFocusFirstPayloadIssueField(args: {
  readonly slug: AdminEntitySlug
  readonly fieldKeys: readonly string[]
  readonly variant: "create" | "edit"
  readonly notifyAdminEntityCrudPayloadFieldIssues?: NotifyPayloadFieldIssues
}): void {
  const { slug, fieldKeys, variant, notifyAdminEntityCrudPayloadFieldIssues } = args
  queueMicrotask(() => {
    notifyAdminEntityCrudPayloadFieldIssues?.({ slug, fieldKeys })
    scheduleAfterDoubleRaf(() => {
      focusFirstAdminEntityCrudPayloadIssueField({ slug, fieldKeys, variant })
    })
  })
}
