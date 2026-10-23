import "server-only"

import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { entities, propertyEntities } from "@/db/schema"

export type PropertyEntitiesDbTx = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

const lineSchema = z.object({
  propertyEntityId: z.number().int().positive().optional(),
  entityId: z.coerce.number().int().positive(),
  propertyEntityNote: z.string().nullable().optional(),
  isOriginalOwner: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .transform((v) => v === true || v === "true")
    .optional(),
  buyerPipelineStatusId: z
    .union([z.null(), z.undefined(), z.coerce.number().int()])
    .transform((v) => (v == null || v === 0 ? null : v))
    .optional(),
  contactCategoryId: z
    .union([z.null(), z.undefined(), z.coerce.number().int()])
    .transform((v) => (v == null || v === 0 ? null : v))
    .optional(),
  association: z
    .union([z.null(), z.undefined(), z.string()])
    .transform((v) => {
      if (v == null || v === "") return null
      if (v === "Buyer" || v === "Seller") return v
      return null
    })
    .optional(),
})

const payloadSchema = z.array(lineSchema)

export type PropertyEntityLine = z.infer<typeof lineSchema>

/** Validate raw extras payload; drop rows with no entityId. */
export function parsePropertyEntitiesPayload(raw: unknown): PropertyEntityLine[] {
  const parsed = payloadSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error("Invalid property entities payload")
  }
  return parsed.data.filter((l) => l.entityId > 0)
}

/**
 * Replace child rows for a property: delete omitted ids, update/insert the rest.
 * Scoped to `propertyListId` so seller/buyer/contact/tenant syncs don't clobber each other
 * — only ids present in `existingIds` are candidates for deletion.
 */
export async function syncPropertyEntitiesSubsetInTx(
  tx: PropertyEntitiesDbTx,
  propertyListId: number,
  lines: PropertyEntityLine[],
  existingIds: number[],
): Promise<void> {
  const keepIds = new Set(
    lines
      .map((l) => l.propertyEntityId)
      .filter((x): x is number => typeof x === "number"),
  )

  // Delete rows that were in this category subset but removed by the user
  const toDelete = existingIds.filter((id) => !keepIds.has(id))
  if (toDelete.length > 0) {
    await tx
      .delete(propertyEntities)
      .where(inArray(propertyEntities.propertyEntityId, toDelete))
  }

  for (const line of lines) {
    if (line.propertyEntityId != null) {
      await tx
        .update(propertyEntities)
        .set({
          entityId: line.entityId,
          propertyEntityNote: line.propertyEntityNote ?? null,
          isOriginalOwner: line.isOriginalOwner ?? false,
          ...(Object.hasOwn(line, "buyerPipelineStatusId")
            ? { buyerPipelineStatusId: line.buyerPipelineStatusId ?? null }
            : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(propertyEntities.propertyEntityId, line.propertyEntityId),
            eq(propertyEntities.propertyListId, propertyListId),
          ),
        )
    } else {
      await tx.insert(propertyEntities).values({
        propertyListId,
        entityId: line.entityId,
        propertyEntityNote: line.propertyEntityNote ?? null,
        isOriginalOwner: line.isOriginalOwner ?? false,
        ...(Object.hasOwn(line, "buyerPipelineStatusId")
          ? { buyerPipelineStatusId: line.buyerPipelineStatusId ?? null }
          : {}),
      })
    }

    // Patch the entities record for contact-specific fields (contactCategoryId / association).
    // Guarded by Object.hasOwn so buyer/tenant syncs never touch entities.
    const hasContactCategoryId = Object.hasOwn(line, "contactCategoryId")
    const hasAssociation = Object.hasOwn(line, "association")
    if ((hasContactCategoryId || hasAssociation) && line.entityId > 0) {
      await tx
        .update(entities)
        .set({
          ...(hasContactCategoryId
            ? { contactCategoryId: line.contactCategoryId ?? null }
            : {}),
          ...(hasAssociation ? { association: line.association ?? null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(entities.entityId, line.entityId))
    }
  }
}
