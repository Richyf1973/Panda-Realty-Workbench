import "server-only"

import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"

import { buyerOffersWorkspaceLinesHavePositiveOffer } from "@/lib/admin/property-entity-buyer-offers-pipeline.shared"
import { buyerOffers, propertyEntities, propertyStatus } from "@/db/schema"
import type { PropertyEntityWorkspaceDbTx } from "./entity-members-workspace-sync.server"

const boolish = z
  .union([z.boolean(), z.literal("true"), z.literal("false")])
  .transform((v) => v === true || v === "true")

const buyerOfferLineSchema = z.object({
  buyerOfferId: z.number().int().positive().optional(),
  offer: z.string(),
  isAccepted: boolish.optional(),
  dateOffered: z.string().optional(),
})

export function parseBuyerOffersWorkspacePayload(raw: unknown) {
  const parsed = z.array(buyerOfferLineSchema).safeParse(raw)
  if (!parsed.success) {
    throw new Error("Invalid buyerOffers payload")
  }
  return parsed.data
}

export async function syncBuyerOffersForPropertyEntityInTx(
  tx: PropertyEntityWorkspaceDbTx,
  propertyEntityId: number,
  lines: ReturnType<typeof parseBuyerOffersWorkspacePayload>,
): Promise<void> {
  const existing = await tx
    .select()
    .from(buyerOffers)
    .where(eq(buyerOffers.propertyEntityId, propertyEntityId))

  const keepIds = new Set(
    lines
      .map((l) => l.buyerOfferId)
      .filter((x): x is number => typeof x === "number"),
  )

  for (const row of existing) {
    if (!keepIds.has(row.buyerOfferId)) {
      await tx
        .delete(buyerOffers)
        .where(eq(buyerOffers.buyerOfferId, row.buyerOfferId))
    }
  }

  for (const line of lines) {
    const offerStr = line.offer.trim() || "0"
    const accepted = line.isAccepted ?? false
    const dateOfferedTrim = line.dateOffered?.trim() ?? ""
    if (line.buyerOfferId != null) {
      const [updated] = await tx
        .update(buyerOffers)
        .set({
          offer: offerStr,
          isAccepted: accepted,
          ...(dateOfferedTrim !== "" ? { dateOffered: dateOfferedTrim } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(buyerOffers.buyerOfferId, line.buyerOfferId),
            eq(buyerOffers.propertyEntityId, propertyEntityId),
          ),
        )
        .returning()
      if (!updated) {
        throw new Error(
          `Buyer offer ${line.buyerOfferId} not found for this property entity`,
        )
      }
    } else {
      await tx.insert(buyerOffers).values({
        propertyEntityId,
        offer: offerStr,
        isAccepted: accepted,
        ...(dateOfferedTrim !== "" ? { dateOffered: dateOfferedTrim } : {}),
      })
    }
  }
}

export async function maybeAdvanceBuyerPipelineOnOfferInTx(
  tx: PropertyEntityWorkspaceDbTx,
  propertyEntityId: number,
  incomingLines: ReturnType<typeof parseBuyerOffersWorkspacePayload>,
): Promise<void> {
  if (incomingLines.length === 0) return
  if (!buyerOffersWorkspaceLinesHavePositiveOffer(incomingLines)) return

  const stageRows = await tx
    .select({
      propertyStatusId: propertyStatus.propertyStatusId,
      propertyStatusCode: propertyStatus.propertyStatusCode,
    })
    .from(propertyStatus)
    .where(
      and(
        inArray(propertyStatus.propertyStatusCode, ["Enquiry", "Offer Made"]),
        eq(propertyStatus.pipeline, "buyers"),
      ),
    )

  const enquiryStatusId =
    stageRows.find((r) => r.propertyStatusCode === "Enquiry")?.propertyStatusId ?? null
  const offerMadeStatusId =
    stageRows.find((r) => r.propertyStatusCode === "Offer Made")?.propertyStatusId ?? null

  if (enquiryStatusId == null || offerMadeStatusId == null) return

  const [peRow] = await tx
    .select({ buyerPipelineStatusId: propertyEntities.buyerPipelineStatusId })
    .from(propertyEntities)
    .where(eq(propertyEntities.propertyEntityId, propertyEntityId))

  if (!peRow) return

  const currentStatusId = peRow.buyerPipelineStatusId

  if (currentStatusId === null || currentStatusId === enquiryStatusId) {
    await tx
      .update(propertyEntities)
      .set({ buyerPipelineStatusId: offerMadeStatusId, updatedAt: new Date() })
      .where(eq(propertyEntities.propertyEntityId, propertyEntityId))
  }
}
