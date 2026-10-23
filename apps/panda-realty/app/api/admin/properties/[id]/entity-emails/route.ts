import "server-only"

import { NextResponse } from "next/server"
import { and, asc, eq, sql } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { entities, entityMembers, pandaProperties, propertyEntities } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ id: string }> }

const BUYER_ENTITY_CATEGORY_ID = 1
const CONTACT_ENTITY_CATEGORY_ID = 4
const TENANT_ENTITY_CATEGORY_ID = 3

export type EntityEmailItem = {
  type: "owner" | "buyer" | "contact" | "tenant" | "member"
  entityName: string
  emailAddress: string
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const propertyListId = parseInt(id, 10)
  if (isNaN(propertyListId)) return adminJsonError("Invalid id", 400)

  try {
    const [property, buyers, contacts, tenants, members] = await Promise.all([
      db
        .select({
          owner1name: pandaProperties.owner1name,
          owner1email: pandaProperties.owner1email,
          owner2name: pandaProperties.owner2name,
          owner2email: pandaProperties.owner2email,
          owner3name: pandaProperties.owner3name,
          owner3email: pandaProperties.owner3email,
        })
        .from(pandaProperties)
        .where(eq(pandaProperties.propertyListId, propertyListId))
        .limit(1),

      db
        .select({
          entityName: entities.entityName,
          emailAddress: sql<string | null>`COALESCE(${entities.emailAddress}, (
            SELECT em.member_email_address FROM panda_realty.entity_members em
            WHERE em.entity_id = ${entities.entityId}
              AND em.member_email_address IS NOT NULL AND em.member_email_address <> ''
            ORDER BY em.entity_member_id ASC LIMIT 1
          ))`,
        })
        .from(propertyEntities)
        .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
        .where(
          and(
            eq(propertyEntities.propertyListId, propertyListId),
            eq(entities.entityCategoryId, BUYER_ENTITY_CATEGORY_ID),
          ),
        )
        .orderBy(asc(entities.entityName)),

      db
        .select({
          entityName: entities.entityName,
          emailAddress: sql<string | null>`COALESCE(${entities.emailAddress}, (
            SELECT em.member_email_address FROM panda_realty.entity_members em
            WHERE em.entity_id = ${entities.entityId}
              AND em.member_email_address IS NOT NULL AND em.member_email_address <> ''
            ORDER BY em.entity_member_id ASC LIMIT 1
          ))`,
        })
        .from(propertyEntities)
        .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
        .where(
          and(
            eq(propertyEntities.propertyListId, propertyListId),
            eq(entities.entityCategoryId, CONTACT_ENTITY_CATEGORY_ID),
          ),
        )
        .orderBy(asc(entities.entityName)),

      db
        .select({
          entityName: entities.entityName,
          emailAddress: sql<string | null>`COALESCE(${entities.emailAddress}, (
            SELECT em.member_email_address FROM panda_realty.entity_members em
            WHERE em.entity_id = ${entities.entityId}
              AND em.member_email_address IS NOT NULL AND em.member_email_address <> ''
            ORDER BY em.entity_member_id ASC LIMIT 1
          ))`,
        })
        .from(propertyEntities)
        .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
        .where(
          and(
            eq(propertyEntities.propertyListId, propertyListId),
            eq(entities.entityCategoryId, TENANT_ENTITY_CATEGORY_ID),
          ),
        )
        .orderBy(asc(entities.entityName)),

      db
        .select({
          entityName: entityMembers.memberName,
          emailAddress: entityMembers.memberEmailAddress,
        })
        .from(propertyEntities)
        .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
        .innerJoin(entityMembers, eq(entityMembers.entityId, entities.entityId))
        .where(eq(propertyEntities.propertyListId, propertyListId))
        .orderBy(asc(entityMembers.memberName)),
    ])

    const items: EntityEmailItem[] = []

    const prop = property[0]
    if (prop) {
      for (const [name, email] of [
        [prop.owner1name, prop.owner1email],
        [prop.owner2name, prop.owner2email],
        [prop.owner3name, prop.owner3email],
      ] as [string | null, string | null][]) {
        if (name && email && email.trim() !== "") {
          items.push({ type: "owner", entityName: name, emailAddress: email })
        }
      }
    }

    for (const row of buyers) {
      if (row.entityName && row.emailAddress && row.emailAddress.trim() !== "") {
        items.push({ type: "buyer", entityName: row.entityName, emailAddress: row.emailAddress })
      }
    }

    for (const row of contacts) {
      if (row.entityName && row.emailAddress && row.emailAddress.trim() !== "") {
        items.push({ type: "contact", entityName: row.entityName, emailAddress: row.emailAddress })
      }
    }

    for (const row of tenants) {
      if (row.entityName && row.emailAddress && row.emailAddress.trim() !== "") {
        items.push({ type: "tenant", entityName: row.entityName, emailAddress: row.emailAddress })
      }
    }

    for (const row of members) {
      if (row.entityName && row.emailAddress && row.emailAddress.trim() !== "") {
        items.push({ type: "member", entityName: row.entityName, emailAddress: row.emailAddress })
      }
    }

    return NextResponse.json({ items })
  } catch (cause) {
    console.error(`[GET /api/admin/properties/${propertyListId}/entity-emails]`, cause)
    return adminJsonError("Failed to load entity emails", 500)
  }
}
