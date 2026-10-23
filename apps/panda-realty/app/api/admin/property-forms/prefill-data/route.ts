import "server-only"

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { entities, propertyEntities, entityMembers } from "@/db/schema"
import { CONTACT_CATEGORY_SOLICITOR, ENTITY_CATEGORY_BUYER, ENTITY_CATEGORY_CONTACT } from "@/lib/admin/entity-category-ids"
import { getForm6Prefill } from "./form6-prefill"
import { getContractSalePurchasePrefill } from "./contract-sale-purchase-prefill"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const propertyListId = Number(searchParams.get("propertyListId"))
  const prefillStrategy = searchParams.get("prefillStrategy") ?? undefined

  if (!propertyListId || !Number.isFinite(propertyListId)) {
    return adminJsonError("Missing or invalid propertyListId", 400)
  }

  // Form 6 strategy: return owners from panda_properties (denormalized owner columns)
  if (prefillStrategy === "form-6") {
    return getForm6Prefill(propertyListId)
  }

  // Contract Sale & Purchase strategy: return sellers + buyers + solicitors + property details
  if (prefillStrategy === "contract-sale-purchase-1") {
    return getContractSalePurchasePrefill(propertyListId)
  }

  // Default (pro-forma-2026 or absent): return buyers + solicitor
  const rows = await db
    .select({
      entityId: entities.entityId,
      entityName: entities.entityName,
      address: entities.address,
      contact: entities.contact,
      emailAddress: entities.emailAddress,
      entityCategoryId: entities.entityCategoryId,
      contactCategoryId: entities.contactCategoryId,
    })
    .from(propertyEntities)
    .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
    .where(eq(propertyEntities.propertyListId, propertyListId))

  const buyerRows = rows.filter((r) => r.entityCategoryId === ENTITY_CATEGORY_BUYER)

  // Fetch entity members for the first buyer (up to 2)
  let members: Array<{ memberName: string | null; memberAddress: string | null; memberPhoneNumber: string | null }> = []
  if (buyerRows.length > 0) {
    const firstBuyerMembers = await db
      .select({
        memberName: entityMembers.memberName,
        memberAddress: entityMembers.memberAddress,
        memberPhoneNumber: entityMembers.memberPhoneNumber,
      })
      .from(entityMembers)
      .where(eq(entityMembers.entityId, buyerRows[0].entityId))
      .limit(2)
    members = firstBuyerMembers
  }

  const buyers = buyerRows.map(({ entityId, entityName, address, contact, emailAddress }) => ({
    entityId,
    entityName,
    members: entityId === buyerRows[0]?.entityId ? members : undefined,
    address,
    phoneNumber: contact?.trim() || null,
    emailAddress,
  }))

  const solicitorRow = rows.find(
    (r) =>
      r.entityCategoryId === ENTITY_CATEGORY_CONTACT &&
      r.contactCategoryId === CONTACT_CATEGORY_SOLICITOR,
  )

  const solicitor = solicitorRow
    ? {
        entityId: solicitorRow.entityId,
        entityName: solicitorRow.entityName,
        address: solicitorRow.address,
        phoneNumber: solicitorRow.contact?.trim() || null,
        emailAddress: solicitorRow.emailAddress,
      }
    : null

  return NextResponse.json({ buyers, solicitor })
}
