import "server-only"

import { NextResponse } from "next/server"
import { and, asc, eq, sql } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { contactCategories, entities, propertyEntities } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ id: string }> }

const CONTACT_ENTITY_CATEGORY_ID = 4

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const propertyListId = parseInt(id, 10)
  if (isNaN(propertyListId)) return adminJsonError("Invalid id", 400)

  try {
    const rows = await db
      .select({
        propertyEntityId: propertyEntities.propertyEntityId,
        entityId: entities.entityId,
        entityName: entities.entityName,
        phoneNumber: sql<string | null>`COALESCE(${entities.contact}, (
          SELECT em.member_phone_number FROM panda_realty.entity_members em
          WHERE em.entity_id = ${entities.entityId}
            AND em.member_phone_number IS NOT NULL AND em.member_phone_number <> ''
          ORDER BY em.entity_member_id ASC LIMIT 1
        ))`,
        emailAddress: sql<string | null>`COALESCE(${entities.emailAddress}, (
          SELECT em.member_email_address FROM panda_realty.entity_members em
          WHERE em.entity_id = ${entities.entityId}
            AND em.member_email_address IS NOT NULL AND em.member_email_address <> ''
          ORDER BY em.entity_member_id ASC LIMIT 1
        ))`,
        address: entities.address,
        esuburb: entities.esuburb,
        estate: entities.estate,
        epostcode: entities.epostcode,
        notes: entities.notes,
        contactCategoryId: entities.contactCategoryId,
        contactCategoryName: contactCategories.contactCategoryName,
        association: entities.association,
      })
      .from(propertyEntities)
      .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
      .leftJoin(
        contactCategories,
        eq(entities.contactCategoryId, contactCategories.contactCategoryId),
      )
      .where(
        and(
          eq(propertyEntities.propertyListId, propertyListId),
          eq(entities.entityCategoryId, CONTACT_ENTITY_CATEGORY_ID),
        ),
      )
      .orderBy(asc(entities.entityName))

    return NextResponse.json({ items: rows })
  } catch (cause) {
    console.error(`[GET /api/admin/properties/${propertyListId}/contacts]`, cause)
    return adminJsonError("Failed to load contacts", 500)
  }
}
