import type { AdminEntityColumn } from "@repo/admin/admin-entity-types"

import { entitiesEntityColumnsPrimary } from "./entities-columns-primary"
import { entitiesEntityColumnsExtended } from "./entities-columns-extended"

export const entitiesEntityColumns = [
  ...entitiesEntityColumnsPrimary,
  ...entitiesEntityColumnsExtended,
] as const satisfies readonly AdminEntityColumn[]
