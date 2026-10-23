import { describe, expect, it } from "vitest"

import { stripAdminEntityApiRow } from "@repo/admin/admin-entity-list-response-strip"
import { adminEntityListColumnsInOrder } from "@repo/admin/admin-entity-list-column-order"

import { propertyEntities } from "@/db/schema"
import { propertyEntitiesEntity } from "@/lib/admin/entities/propertyEntities"

describe("property-entities API shape", () => {
  it("keeps propertyListId in API rows without rendering it as a table column", () => {
    const shaped = stripAdminEntityApiRow(
      {
        propertyEntityId: 123,
        entityId: 456,
        propertyListId: 789,
        propertyEntityNote: null,
        buyerPipelineStatusId: 5,
        isOriginalOwner: false,
      },
      propertyEntitiesEntity,
      propertyEntities,
    )

    expect(shaped.propertyListId).toBe(789)
    expect(adminEntityListColumnsInOrder(propertyEntitiesEntity).map((c) => c.key)).not.toContain(
      "propertyListId",
    )
  })
})
