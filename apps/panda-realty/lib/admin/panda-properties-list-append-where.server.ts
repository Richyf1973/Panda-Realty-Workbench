import { and, eq, exists, getTableColumns, gte, ilike, lte, or, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

import type { AdminEntityListServerContext } from "@repo/admin/admin-entity-types"
import { entities, entityMembers, pandaProperties, propertyEntities, propertyListNotes } from "@/db/schema"

// Stable lookup value from panda_realty.entity_categories (contact = 4).
const CATEGORY_CONTACT = 4

/** Escape user input for a LIKE pattern, then wrap as a contains match. */
function containsTerm(raw: string): string {
  return `%${raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`
}

export const pandaPropertiesAppendListWhere: NonNullable<
  AdminEntityListServerContext["appendListWhere"]
> = ({ db, slug, table, relationFilterValues, appendListWhereHints }): SQL | undefined => {
  // property-status: filter by pipeline (syntheticTextScope)
  if (slug === "property-status") {
    const cols = getTableColumns(table)
    const pipelineVal = relationFilterValues["pipeline"]
    if (typeof pipelineVal === "string" && pipelineVal.trim() !== "" && cols["pipeline"]) {
      return ilike(cols["pipeline"], pipelineVal.trim())
    }
    return undefined
  }

  // contacts: a Contacts-only list over the entities table. Always scope to the
  // Contact category; the general search also matches representatives (entity_members).
  if (slug === "contacts") {
    const cc = getTableColumns(table)
    const contactParts: SQL[] = []
    if (cc["entityCategoryId"]) {
      contactParts.push(eq(cc["entityCategoryId"], CATEGORY_CONTACT))
    }
    const contactSearch = appendListWhereHints?.["generalSearch"]?.trim()
    if (contactSearch) {
      const term = containsTerm(contactSearch)
      const conds: SQL[] = []
      if (cc["entityName"]) conds.push(ilike(cc["entityName"], term))
      if (cc["emailAddress"]) conds.push(ilike(cc["emailAddress"], term))
      if (cc["contact"]) conds.push(ilike(cc["contact"], term))
      if (cc["address"]) conds.push(ilike(cc["address"], term))

      // EXISTS: any representative of this contact whose name/email/phone matches.
      const memberMatch = db
        .select({ one: sql`1` })
        .from(entityMembers)
        .where(
          and(
            eq(entityMembers.entityId, entities.entityId),
            or(
              ilike(entityMembers.memberName, term),
              ilike(entityMembers.memberEmailAddress, term),
              ilike(entityMembers.memberPhoneNumber, term),
            ),
          ),
        )
      contactParts.push(or(...conds, exists(memberMatch))!)
    }
    if (contactParts.length === 0) return undefined
    return contactParts.length === 1 ? contactParts[0] : and(...contactParts)
  }

  if (slug !== "properties") return undefined

  const cols = getTableColumns(table)
  const parts: SQL[] = []

  // Property type — case-insensitive (matches "House", "HOUSE", "house", etc.)
  const pt = appendListWhereHints?.["propertyType"]?.trim()
  if (pt && cols["propertyType"]) {
    parts.push(ilike(cols["propertyType"], pt))
  }

  // Bedrooms: comma-separated values; exact match or >= 6 for "6+"
  const bedRaw = appendListWhereHints?.["bed"]?.trim()
  if (bedRaw && cols["bed"]) {
    const bedVals = bedRaw.split(",").map((s) => s.trim()).filter(Boolean)
    const bedConds = bedVals.flatMap((v) => {
      if (v === "6+") return [gte(cols["bed"]!, 6)]
      const n = parseInt(v, 10)
      return isNaN(n) ? [] : [eq(cols["bed"]!, n)]
    })
    if (bedConds.length === 1) parts.push(bedConds[0]!)
    else if (bedConds.length > 1) parts.push(or(...bedConds)!)
  }

  // Bathrooms: comma-separated values; exact match or >= 4 for "4+"
  const bathRaw = appendListWhereHints?.["bath"]?.trim()
  if (bathRaw && cols["bath"]) {
    const bathVals = bathRaw.split(",").map((s) => s.trim()).filter(Boolean)
    const bathConds = bathVals.flatMap((v) => {
      if (v === "4+") return [gte(cols["bath"]!, 4)]
      const n = parseInt(v, 10)
      return isNaN(n) ? [] : [eq(cols["bath"]!, n)]
    })
    if (bathConds.length === 1) parts.push(bathConds[0]!)
    else if (bathConds.length > 1) parts.push(or(...bathConds)!)
  }

  // Car spaces: comma-separated values; exact match or >= 4 for "4+"
  const carRaw = appendListWhereHints?.["car"]?.trim()
  if (carRaw && cols["car"]) {
    const carVals = carRaw.split(",").map((s) => s.trim()).filter(Boolean)
    const carConds = carVals.flatMap((v) => {
      if (v === "4+") return [gte(cols["car"]!, 4)]
      const n = parseInt(v, 10)
      return isNaN(n) ? [] : [eq(cols["car"]!, n)]
    })
    if (carConds.length === 1) parts.push(carConds[0]!)
    else if (carConds.length > 1) parts.push(or(...carConds)!)
  }

  // Suburb + State: value encoded as "suburb||state" from the combobox
  const suburb = appendListWhereHints?.["suburb"]?.trim()
  if (suburb && cols["suburb"] && cols["state"]) {
    const [suburbPart, statePart] = suburb.split("||")
    const subConds: SQL[] = []
    if (suburbPart) subConds.push(ilike(cols["suburb"]!, suburbPart))
    if (statePart) subConds.push(ilike(cols["state"]!, statePart))
    if (subConds.length > 0)
      parts.push(subConds.length === 1 ? subConds[0]! : and(...subConds)!)
  }

  // Map-area filter: value encoded as "street~state,street~state,...". Each street is matched
  // by its NORMALIZED name (house/unit number stripped, lower-cased) against the
  // idx_panda_street_key expression index, rather than a per-street regex scan over every row.
  // The previous `street_address ~* '\yNAME\y'` OR-chain was an unindexed Seq Scan that hit
  // 100s+/statement_timeout once a polygon returned ~50+ streets. panda_street_key() strips the
  // leading designator from the stored "<number> STREET NAME"; panda_street_norm() normalizes
  // the incoming Overpass names the same way (both run in SQL — single source of truth).
  // Exact-key matching also drops the old substring false positives (e.g. "Creek Road" no
  // longer matches "Browns Creek Road").
  const streetFilter = appendListWhereHints?.["streetFilter"]?.trim()
  if (streetFilter && cols["streetAddress"] && cols["state"]) {
    // Group streets by their (possibly empty) state so each state scopes its own street set.
    const streetsByState = new Map<string, string[]>()
    for (const entry of streetFilter.split(",")) {
      const [street, state] = entry.split("~").map((s) => s.trim())
      if (!street) continue
      const key = state ?? ""
      const list = streetsByState.get(key) ?? []
      list.push(street)
      streetsByState.set(key, list)
    }

    const streetCol = cols["streetAddress"]!
    const stateEntries: SQL[] = []
    for (const [state, streets] of streetsByState) {
      const normed = sql.join(
        streets.map((s) => sql`panda_realty.panda_street_norm(${s})`),
        sql`, `,
      )
      const keyMatch = sql`panda_realty.panda_street_key(${streetCol}::text) = ANY(ARRAY[${normed}])`
      stateEntries.push(state ? and(keyMatch, ilike(cols["state"]!, state))! : keyMatch)
    }
    if (stateEntries.length === 1) parts.push(stateEntries[0]!)
    else if (stateEntries.length > 1) parts.push(or(...stateEntries)!)
  }

  // Land size range: value encoded as "min|max" (either part may be empty for unbounded)
  const landSize = appendListWhereHints?.["landSize"]?.trim()
  if (landSize && cols["landSize"]) {
    const [minStr, maxStr] = landSize.split("|")
    const min = minStr ? parseFloat(minStr) : NaN
    const max = maxStr ? parseFloat(maxStr) : NaN
    if (!isNaN(min)) parts.push(gte(cols["landSize"]!, String(min)))
    if (!isNaN(max)) parts.push(lte(cols["landSize"]!, String(max)))
  }

  // Zoning — case-insensitive exact match
  const zoning = appendListWhereHints?.["zoning"]?.trim()
  if (zoning && cols["zoning"]) {
    parts.push(ilike(cols["zoning"], zoning))
  }

  // Development zone — case-insensitive exact match
  const developmentZone = appendListWhereHints?.["developmentZone"]?.trim()
  if (developmentZone && cols["developmentZone"]) {
    parts.push(ilike(cols["developmentZone"], developmentZone))
  }

  // Land use — case-insensitive exact match
  const landUse1 = appendListWhereHints?.["landUse1"]?.trim()
  if (landUse1 && cols["landUse1"]) {
    parts.push(ilike(cols["landUse1"], landUse1))
  }

  // Last sales price range: value encoded as "min|max"
  const salePrice = appendListWhereHints?.["salePrice"]?.trim()
  if (salePrice && cols["salePrice"]) {
    const [minStr, maxStr] = salePrice.split("|")
    const min = minStr ? parseFloat(minStr) : NaN
    const max = maxStr ? parseFloat(maxStr) : NaN
    if (!isNaN(min)) parts.push(gte(cols["salePrice"]!, String(min)))
    if (!isNaN(max)) parts.push(lte(cols["salePrice"]!, String(max)))
  }

  // Last sales date range: value encoded as "YYYY-MM-DD|YYYY-MM-DD"
  const saleDate = appendListWhereHints?.["saleDate"]?.trim()
  if (saleDate && cols["saleDate"]) {
    const [fromStr, toStr] = saleDate.split("|")
    if (fromStr) {
      const d = new Date(fromStr)
      if (!isNaN(d.getTime())) parts.push(gte(cols["saleDate"]!, d))
    }
    if (toStr) {
      const d = new Date(toStr)
      if (!isNaN(d.getTime())) parts.push(lte(cols["saleDate"]!, d))
    }
  }

  // General keyword search: searches across linked entity names/emails and property notes.
  // Only shown when isFavorite filter is active; the search bar hides otherwise.
  const generalSearch = appendListWhereHints?.["generalSearch"]?.trim()
  if (generalSearch) {
    const term = containsTerm(generalSearch)

    // Direct owner name and street address columns on the property itself
    const ownerAddressConds: SQL[] = []
    if (cols["owner1name"]) ownerAddressConds.push(ilike(cols["owner1name"], term))
    if (cols["owner2name"]) ownerAddressConds.push(ilike(cols["owner2name"], term))
    if (cols["owner3name"]) ownerAddressConds.push(ilike(cols["owner3name"], term))
    if (cols["streetAddress"]) ownerAddressConds.push(ilike(cols["streetAddress"], term))

    // EXISTS: any linked entity (buyer/contact/tenant) whose name, email, or contact matches
    const entityMatch = db
      .select({ one: sql`1` })
      .from(propertyEntities)
      .innerJoin(entities, eq(entities.entityId, propertyEntities.entityId))
      .where(
        and(
          eq(propertyEntities.propertyListId, pandaProperties.propertyListId),
          or(
            ilike(entities.entityName, term),
            ilike(entities.emailAddress, term),
            ilike(entities.contact, term),
          ),
        ),
      )

    // EXISTS: any property-level note whose text matches
    const noteMatch = db
      .select({ one: sql`1` })
      .from(propertyListNotes)
      .where(
        and(
          eq(propertyListNotes.propertyListId, pandaProperties.propertyListId),
          ilike(propertyListNotes.note, term),
        ),
      )

    // EXISTS: any representative (entity_members) of a linked entity whose
    // name, email, or phone matches — searches reps like "Eugene McAuley".
    const memberMatch = db
      .select({ one: sql`1` })
      .from(propertyEntities)
      .innerJoin(entityMembers, eq(entityMembers.entityId, propertyEntities.entityId))
      .where(
        and(
          eq(propertyEntities.propertyListId, pandaProperties.propertyListId),
          or(
            ilike(entityMembers.memberName, term),
            ilike(entityMembers.memberEmailAddress, term),
            ilike(entityMembers.memberPhoneNumber, term),
          ),
        ),
      )

    parts.push(
      or(
        ...ownerAddressConds,
        exists(entityMatch),
        exists(noteMatch),
        exists(memberMatch),
      )!,
    )
  }

  if (parts.length === 0) return undefined
  return parts.length === 1 ? parts[0] : and(...parts)
}
