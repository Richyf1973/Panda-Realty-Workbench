import "server-only"

import { NextResponse } from "next/server"
import { and, asc, eq, sql } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import {
  entities,
  offerFormSubmissions,
  offerFormTokens,
  pandaProperties,
  propertyEntities,
  propertyStatus,
} from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ id: string }> }

const BUYER_ENTITY_CATEGORY_ID = 1

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const propertyListId = parseInt(id, 10)
  if (isNaN(propertyListId)) return adminJsonError("Invalid id", 400)

  try {
    const [propertyPrimary, rows] = await Promise.all([
      db
        .select({
          primaryPhoneBuyerPropertyEntityId: pandaProperties.primaryPhoneBuyerPropertyEntityId,
          primaryEmailBuyerPropertyEntityId: pandaProperties.primaryEmailBuyerPropertyEntityId,
        })
        .from(pandaProperties)
        .where(eq(pandaProperties.propertyListId, propertyListId))
        .limit(1)
        .then((r) => r[0] ?? null),

      db
        .select({
          propertyEntityId: propertyEntities.propertyEntityId,
          entityId: entities.entityId,
          entityName: entities.entityName,
          phoneNumber: sql<string | null>`COALESCE(
            NULLIF(trim(${entities.contact}::text), ''),
            (
              SELECT em.member_phone_number FROM panda_realty.entity_members em
              WHERE em.entity_id = ${entities.entityId}
                AND em.member_phone_number IS NOT NULL AND em.member_phone_number <> ''
              ORDER BY em.entity_member_id ASC LIMIT 1
            )
          )`,
          emailAddress: sql<string | null>`COALESCE(NULLIF(trim(${entities.emailAddress}::text), ''), (
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
          buyerPipelineStatusId: propertyEntities.buyerPipelineStatusId,
          pipelineStatusLabel: propertyStatus.propertyStatus,
          hasOfferFormSubmission: sql<boolean>`EXISTS(
            SELECT 1 FROM ${offerFormTokens}
            INNER JOIN ${offerFormSubmissions} ON ${offerFormSubmissions.offerFormTokenId} = ${offerFormTokens.offerFormTokenId}
            WHERE ${offerFormTokens.propertyEntityId} = ${propertyEntities.propertyEntityId}
          )`,
        })
        .from(propertyEntities)
        .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
        .leftJoin(
          propertyStatus,
          eq(propertyEntities.buyerPipelineStatusId, propertyStatus.propertyStatusId),
        )
        .where(
          and(
            eq(propertyEntities.propertyListId, propertyListId),
            eq(entities.entityCategoryId, BUYER_ENTITY_CATEGORY_ID),
            sql`NOT EXISTS(SELECT 1 FROM panda_realty.buyer_offers bo WHERE bo.property_entity_id = ${propertyEntities.propertyEntityId} AND bo.is_accepted = true)`,
          ),
        )
        .orderBy(
          sql`CASE
            WHEN EXISTS(SELECT 1 FROM panda_realty.buyer_offers bo WHERE bo.property_entity_id = ${propertyEntities.propertyEntityId} AND bo.is_accepted = true) THEN 0
            WHEN EXISTS(SELECT 1 FROM panda_realty.buyer_offers bo WHERE bo.property_entity_id = ${propertyEntities.propertyEntityId}) THEN 1
            ELSE 2
          END`,
          asc(entities.entityName),
        ),
    ])

    const firstId = rows[0]?.propertyEntityId ?? null
    const primaryPhoneId = propertyPrimary?.primaryPhoneBuyerPropertyEntityId ?? firstId
    const primaryEmailId = propertyPrimary?.primaryEmailBuyerPropertyEntityId ?? firstId

    const items = rows.map((row) => ({
      ...row,
      isPrimaryPhone: row.propertyEntityId === primaryPhoneId,
      isPrimaryEmail: row.propertyEntityId === primaryEmailId,
    }))

    return NextResponse.json({ items })
  } catch (cause) {
    console.error(`[GET /api/admin/properties/${propertyListId}/buyers]`, cause)
    return adminJsonError("Failed to load buyers", 500)
  }
}
