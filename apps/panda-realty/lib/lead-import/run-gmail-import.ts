import "server-only"

import { and, eq, ilike } from "drizzle-orm"

import { db } from "@/db"
import {
  entities,
  leadImports,
  leadSources,
  pandaProperties,
  propertyEntities,
  propertyEntityNotes,
} from "@/db/schema"
import { parseLeadEmail } from "@/lib/lead-import-parser"
import { getGmailAccessToken, listGmailMessages, getGmailMessageBody } from "@/lib/gmail-client"
import { syncEntityToGoogleContacts } from "@/lib/google-contacts-sync.server"

const DATE_RANGE_VALUES = ["today", "yesterday", "this-week", "last-30", "last-60"] as const
export type DateRange = (typeof DATE_RANGE_VALUES)[number]

export function buildGmailQuery(dateRange: DateRange): string {
  const now = new Date()

  function fmt(d: Date): string {
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
  }

  let after: Date
  let before: Date | null = null

  switch (dateRange) {
    case "today": {
      after = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    }
    case "yesterday": {
      after = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      before = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    }
    case "this-week": {
      const day = now.getDay() // 0=Sun
      const diff = day === 0 ? 6 : day - 1 // Monday as start
      after = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
      break
    }
    case "last-30": {
      after = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
      break
    }
    case "last-60": {
      after = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60)
      break
    }
  }

  let query = `from:realestate.com.au@realestate.com.au after:${fmt(after)}`
  if (before) query += ` before:${fmt(before)}`
  return query
}

export type GmailImportResult = {
  status: "ok"
  imported: number
  duplicates: number
  skipped: number
  errors: string[]
}

export type GmailImportError = {
  status: "error"
  message: string
  code: number
}

export async function runGmailImport(
  dateRange: DateRange,
): Promise<GmailImportResult | GmailImportError> {
  let accessToken: string
  try {
    accessToken = await getGmailAccessToken()
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Gmail not connected",
      code: 422,
    }
  }

  const [leadSource] = await db
    .select({ leadSourceId: leadSources.leadSourceId })
    .from(leadSources)
    .where(ilike(leadSources.leadSource, "realestate.com.au"))
    .limit(1)

  if (!leadSource) {
    return {
      status: "error",
      message: "Lead source 'REALESTATE.COM.AU' not found. Please create it in Admin → Lead Sources first.",
      code: 422,
    }
  }

  const query = buildGmailQuery(dateRange)
  let messages: { id: string }[]
  try {
    messages = await listGmailMessages(accessToken, query)
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to fetch Gmail messages",
      code: 502,
    }
  }

  if (messages.length === 0) {
    return { status: "ok", imported: 0, duplicates: 0, skipped: 0, errors: [] }
  }

  let imported = 0
  let duplicates = 0
  let skipped = 0
  const errors: string[] = []

  for (const message of messages) {
    try {
      const emailText = await getGmailMessageBody(accessToken, message.id)
      if (!emailText.trim()) continue

      let lead: ReturnType<typeof parseLeadEmail>
      try {
        lead = parseLeadEmail(emailText)
      } catch {
        skipped++
        continue
      }

      const [duplicate] = await db
        .select({ leadImportId: leadImports.leadImportId, entityId: leadImports.entityId })
        .from(leadImports)
        .where(
          and(
            eq(leadImports.sourceEmail, lead.emailAddress),
            eq(leadImports.advertisementId, lead.advertisementId),
          ),
        )
        .limit(1)

      if (duplicate) {
        // Property may have been deleted/recreated — ensure the property-entity link still exists
        const [property] = await db
          .select({ propertyListId: pandaProperties.propertyListId, streetAddress: pandaProperties.streetAddress })
          .from(pandaProperties)
          .where(eq(pandaProperties.advertisementId, lead.advertisementId))
          .limit(1)

        const existingEntityId = duplicate.entityId
        let linkRestored = false
        if (property && existingEntityId) {
          const [existingLink] = await db
            .select({ propertyEntityId: propertyEntities.propertyEntityId })
            .from(propertyEntities)
            .where(
              and(
                eq(propertyEntities.entityId, existingEntityId),
                eq(propertyEntities.propertyListId, property.propertyListId),
              ),
            )
            .limit(1)

          if (!existingLink) {
            await db.transaction(async (tx) => {
              const [newPropertyEntity] = await tx
                .insert(propertyEntities)
                .values({ entityId: existingEntityId, propertyListId: property.propertyListId })
                .returning({ propertyEntityId: propertyEntities.propertyEntityId })

              if (lead.notes.trim().length > 0) {
                await tx.insert(propertyEntityNotes).values({
                  propertyEntityId: newPropertyEntity.propertyEntityId,
                  note: lead.notes,
                  createdBy: "Lead Import",
                })
              }
            })
            linkRestored = true
            imported++
          } else {
            duplicates++
          }
        } else {
          duplicates++
        }
        if (linkRestored) {
          const eid = Number(duplicate.entityId)
          if (Number.isFinite(eid) && eid > 0) {
            for (const w of await syncEntityToGoogleContacts(eid)) {
              errors.push(w)
            }
          }
        }
        continue
      }

      const [property] = await db
        .select({ propertyListId: pandaProperties.propertyListId, streetAddress: pandaProperties.streetAddress })
        .from(pandaProperties)
        .where(eq(pandaProperties.advertisementId, lead.advertisementId))
        .limit(1)

      if (!property) {
        skipped++
        errors.push(`No property found for Advertisement ID "${lead.advertisementId}" (${lead.entityName})`)
        continue
      }

      let createdEntityId: number | null = null
      await db.transaction(async (tx) => {
        const [newEntity] = await tx
          .insert(entities)
          .values({
            entityName: lead.entityName,
            emailAddress: lead.emailAddress,
            contact: lead.phoneNumber,
            leadSourceId: leadSource.leadSourceId,
            entityCategoryId: 1,
          })
          .returning({ entityId: entities.entityId })

        const entityId = newEntity.entityId
        createdEntityId = entityId

        const [newPropertyEntity] = await tx
          .insert(propertyEntities)
          .values({ entityId, propertyListId: property.propertyListId })
          .returning({ propertyEntityId: propertyEntities.propertyEntityId })

        const propertyEntityId = newPropertyEntity.propertyEntityId

        if (lead.notes.trim().length > 0) {
          await tx.insert(propertyEntityNotes).values({
            propertyEntityId,
            note: lead.notes,
            createdBy: "Lead Import",
          })
        }

        await tx.insert(leadImports).values({
          sourceEmail: lead.emailAddress,
          advertisementId: lead.advertisementId,
          entityId,
          propertyEntityId,
          rawEmailText: emailText,
        })
      })

      if (createdEntityId != null) {
        for (const w of await syncEntityToGoogleContacts(createdEntityId)) {
          errors.push(w)
        }
      }

      imported++
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Failed to import message ${message.id}`)
    }
  }

  return { status: "ok", imported, duplicates, skipped, errors }
}
