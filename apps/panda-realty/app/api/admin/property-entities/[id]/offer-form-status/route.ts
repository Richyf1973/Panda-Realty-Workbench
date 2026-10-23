import "server-only"

import { and, desc, eq, isNotNull } from "drizzle-orm"
import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { offerFormSubmissions, propertyEntities, pandaProperties, entities } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { resolveCoolingOffDays } from "@/lib/cooling-off-days"
import { getOrCreateOfferFormToken } from "@/lib/offer-form-token.server"
import { resolveEffectiveOrigin } from "@/lib/portal-notifications"
import { fetchSellerSolicitorContact } from "@/lib/admin/seller-solicitor.server"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const propertyEntityId = parseInt(id, 10)
  if (isNaN(propertyEntityId)) return adminJsonError("Invalid id", 400)

  try {
    const [pe] = await db
      .select({
        propertyListId: propertyEntities.propertyListId,
        entityId: propertyEntities.entityId,
      })
      .from(propertyEntities)
      .where(eq(propertyEntities.propertyEntityId, propertyEntityId))
      .limit(1)

    if (!pe) return adminJsonError("Property entity not found", 404)
    if (!pe.propertyListId) return adminJsonError("Property entity has no associated property", 400)

    const [property] = await db
      .select({
        streetAddress: pandaProperties.streetAddress,
        suburb: pandaProperties.suburb,
        state: pandaProperties.state,
        postcode: pandaProperties.postcode,
        propertyType: pandaProperties.propertyType,
        contractDate: pandaProperties.contractDate,
        disclosureDate: pandaProperties.disclosureDate,
      })
      .from(pandaProperties)
      .where(eq(pandaProperties.propertyListId, pe.propertyListId))
      .limit(1)

    const token = await getOrCreateOfferFormToken(propertyEntityId, pe.propertyListId)

    const origin = resolveEffectiveOrigin(new URL(request.url).origin)
    const formUrl = `${origin}/offer-form/${token.token}`

    const [submission, [entityRow], sellerSolicitor] = await Promise.all([
      db
        .select()
        .from(offerFormSubmissions)
        .where(and(
          eq(offerFormSubmissions.offerFormTokenId, token.offerFormTokenId),
          isNotNull(offerFormSubmissions.submittedAt),
        ))
        .orderBy(desc(offerFormSubmissions.submittedAt))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      db
        .select({
          entityName: entities.entityName,
          emailAddress: entities.emailAddress,
          address: entities.address,
        })
        .from(entities)
        .where(eq(entities.entityId, pe.entityId))
        .limit(1),
      fetchSellerSolicitorContact(pe.propertyListId),
    ])

    return NextResponse.json({
      token: token.token,
      formUrl,
      propertyAddress: property
        ? [property.streetAddress, property.suburb, property.state, property.postcode]
            .filter(Boolean)
            .join(", ")
        : null,
      entityEmail: entityRow?.emailAddress ?? null,
      submission: submission
        ? {
            submittedAt: submission.submittedAt,
            contractDate: property?.contractDate ?? null,
            disclosureDate: property?.disclosureDate ?? null,
            buyer1Name: submission.buyer1Name,
            buyer2Name: submission.buyer2Name,
            buyerPhone: submission.buyerPhone,
            buyerEmail: submission.buyerEmail,
            buyerAddress: submission.buyerAddress,
            offerAmount: submission.offerAmount,
            isCashBuyer: submission.isCashBuyer,
            buildingPestInspection: submission.buildingPestInspection,
            suggestBuildingCompanies: submission.suggestBuildingCompanies,
            waiveCoolingOff: submission.waiveCoolingOff,
            coolingOffDays: resolveCoolingOffDays(property?.propertyType, submission.waiveCoolingOff),
            totalDeposit: submission.totalDeposit,
            initialPayment: submission.initialPayment,
            secondPayment: submission.secondPayment,
            settlementPeriod: submission.settlementPeriod,
            isSubjectToSale: submission.isSubjectToSale,
            salePropertyAddress: submission.salePropertyAddress,
            salePropertyStatus: submission.salePropertyStatus,
            saleTimeframeDays: submission.saleTimeframeDays,
            saleSettlementDate: submission.saleSettlementDate,
            saleIsUnconditional: submission.saleIsUnconditional,
            saleUnconditionalDate: submission.saleUnconditionalDate,
            saleBuyerSettlementDate: submission.saleBuyerSettlementDate,
            saleActiveConditions: submission.saleActiveConditions,
            saleConditionsElaboration: submission.saleConditionsElaboration,
            saleFreeAppraisal: submission.saleFreeAppraisal,
            isSubjectToFinance: submission.isSubjectToFinance,
            financePreApproved: submission.financePreApproved,
            financeDaysToApprove: submission.financeDaysToApprove,
            financeBank: submission.financeBank,
            financeBankPhone: submission.financeBankPhone,
            financeBankContactName: submission.financeBankContactName,
            financeBankContactEmail: submission.financeBankContactEmail,
            solicitorName: submission.solicitorName,
            solicitorPhone: submission.solicitorPhone,
            solicitorAddress: submission.solicitorAddress,
            solicitorEmail: submission.solicitorEmail,
            sellerSolicitorName: sellerSolicitor?.entityName ?? null,
            sellerSolicitorPhone: sellerSolicitor?.contact?.trim() || null,
            sellerSolicitorAddress: sellerSolicitor?.address ?? null,
            sellerSolicitorEmail: sellerSolicitor?.emailAddress ?? null,
            extraComments: submission.extraComments,
            buyersJson: submission.buyersJson,
            saleDaysBeforeListingLive: submission.saleDaysBeforeListingLive,
            saleDaysToGetSaleContract: submission.saleDaysToGetSaleContract,
            saleDaysToGetUnconditionalContract: submission.saleDaysToGetUnconditionalContract,
            saleDaysToSettleExistingProperty: submission.saleDaysToSettleExistingProperty,
          }
        : null,
    })
  } catch (cause) {
    console.error(`[GET /api/admin/property-entities/${propertyEntityId}/offer-form-status]`, cause)
    return adminJsonError("Failed to load offer form status", 500)
  }
}
