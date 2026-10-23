import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/db"
import { entities, pandaProperties, portalTokens, propertyEntities } from "@/db/schema"

type RouteContext = { params: Promise<{ token: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params

  try {
    const [tokenRow] = await db
      .select()
      .from(portalTokens)
      .where(eq(portalTokens.token, token))
      .limit(1)

    if (!tokenRow) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 })
    }

    if (tokenRow.revokedAt) {
      return NextResponse.json({ error: "This link is no longer active" }, { status: 410 })
    }

    const updateAccess = db
      .update(portalTokens)
      .set({ lastAccessedAt: new Date() })
      .where(eq(portalTokens.portalTokenId, tokenRow.portalTokenId))
      .execute()

    const [pe] = tokenRow.propertyEntityId != null
      ? await db
          .select({ entityId: propertyEntities.entityId })
          .from(propertyEntities)
          .where(eq(propertyEntities.propertyEntityId, tokenRow.propertyEntityId))
          .limit(1)
      : []

    const [entityRow, property] = await Promise.all([
      pe
        ? db
            .select({ entityName: entities.entityName })
            .from(entities)
            .where(eq(entities.entityId, pe.entityId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),
      db
        .select({
          streetAddress: pandaProperties.streetAddress,
          suburb: pandaProperties.suburb,
          state: pandaProperties.state,
          postcode: pandaProperties.postcode,
          contractDate: pandaProperties.contractDate,
          settlementDate: pandaProperties.settlementDate,
        })
        .from(pandaProperties)
        .where(eq(pandaProperties.propertyListId, tokenRow.propertyListId))
        .limit(1)
        .then((r) => r[0] ?? null),
    ])

    await updateAccess

    const propertyAddress = property
      ? [property.streetAddress, property.suburb, property.state, property.postcode]
          .filter(Boolean)
          .join(", ")
      : null

    return NextResponse.json(
      {
        entityName: entityRow?.entityName ?? null,
        propertyAddress,
        contractDate: property?.contractDate ?? null,
        settlementDate: property?.settlementDate ?? null,
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (err) {
    console.error("[portal GET]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
