import { notFound } from "next/navigation"
import { and, desc, eq } from "drizzle-orm"

import { db } from "@/db"
import {
  buyerOffers,
  entities,
  pandaProperties,
  portalTokens,
  propertyEntities,
  propertyEntityFiles,
  propertyListFiles,
} from "@/db/schema"
import type { PortalDocumentItem } from "@/app/portal/[token]/_components/documents"

import { AddToHomeButton } from "@/app/portal/_components/add-to-home-button"

import { SellerTabsClient } from "./_components/seller-tabs-client"
import type { ConditionOffer } from "./_components/seller-tabs-client"
import type { SellerOffer } from "./_components/seller-offers"

type Props = { params: Promise<{ token: string }> }

function formatSalePrice(value: string | null): string | null {
  if (!value) return null
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export default async function SellerPortalPage({ params }: Props) {
  const { token } = await params

  const [row] = await db
    .select({
      portalTokenId: portalTokens.portalTokenId,
      revokedAt: portalTokens.revokedAt,
      propertyListId: portalTokens.propertyListId,
      role: portalTokens.role,
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
      state: pandaProperties.state,
      postcode: pandaProperties.postcode,
      contractDate: pandaProperties.contractDate,
      settlementDate: pandaProperties.settlementDate,
    })
    .from(portalTokens)
    .leftJoin(pandaProperties, eq(pandaProperties.propertyListId, portalTokens.propertyListId))
    .where(eq(portalTokens.token, token))
    .limit(1)

  if (!row || row.role !== "seller") notFound()

  await db
    .update(portalTokens)
    .set({ lastAccessedAt: new Date() })
    .where(eq(portalTokens.portalTokenId, row.portalTokenId))

  if (row.revokedAt) {
    return (
      <main className="min-h-screen bg-[#F4F6F4] py-8 sm:py-14">
        <div className="mx-auto max-w-2xl px-4">
          <div data-testid="portal-seller-revoked" className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-base text-gray-500">This link is no longer active.</p>
          </div>
        </div>
      </main>
    )
  }

  const propertyListId = row.propertyListId!

  const [offersRaw, listFilesRaw, entityFilesRaw, sellerUploadsRaw] = await Promise.all([
    db
      .select({
        buyerOfferId: buyerOffers.buyerOfferId,
        offer: buyerOffers.offer,
        isAccepted: buyerOffers.isAccepted,
        dateOffered: buyerOffers.dateOffered,
        isCashOffer: buyerOffers.isCashOffer,
        noConditions: buyerOffers.noConditions,
        coolingOffDays: buyerOffers.coolingOffDays,
        financeDays: buyerOffers.financeDays,
        buildingPestDays: buyerOffers.buildingPestDays,
        dueDiligenceDays: buyerOffers.dueDiligenceDays,
        subjectToSaleDays: buyerOffers.subjectToSaleDays,
        saleOfPropertyDays: buyerOffers.saleOfPropertyDays,
        unconditionalContractDays: buyerOffers.unconditionalContractDays,
        customConditions: buyerOffers.customConditions,
        settlementDate: buyerOffers.settlementDate,
        entityName: entities.entityName,
      })
      .from(buyerOffers)
      .innerJoin(propertyEntities, eq(buyerOffers.propertyEntityId, propertyEntities.propertyEntityId))
      .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
      .where(eq(propertyEntities.propertyListId, propertyListId))
      .orderBy(desc(buyerOffers.isAccepted), desc(buyerOffers.dateOffered)),

    db
      .select({
        fileId: propertyListFiles.propertyListFileId,
        fileName: propertyListFiles.fileName,
        fileType: propertyListFiles.fileType,
        fileSize: propertyListFiles.fileSize,
        createdAt: propertyListFiles.createdAt,
      })
      .from(propertyListFiles)
      .where(
        and(
          eq(propertyListFiles.propertyListId, propertyListId),
          eq(propertyListFiles.sharedWithSeller, true),
        ),
      ),

    db
      .select({
        fileId: propertyEntityFiles.propertyEntityFileId,
        fileName: propertyEntityFiles.fileName,
        fileType: propertyEntityFiles.fileType,
        fileSize: propertyEntityFiles.fileSize,
        createdAt: propertyEntityFiles.createdAt,
      })
      .from(propertyEntityFiles)
      .innerJoin(
        propertyEntities,
        eq(propertyEntityFiles.propertyEntityId, propertyEntities.propertyEntityId),
      )
      .where(
        and(
          eq(propertyEntities.propertyListId, propertyListId),
          eq(propertyEntityFiles.sharedWithSeller, true),
        ),
      ),

    db
      .select({
        propertyListFileId: propertyListFiles.propertyListFileId,
        fileName: propertyListFiles.fileName,
        fileType: propertyListFiles.fileType,
        fileSize: propertyListFiles.fileSize,
        createdAt: propertyListFiles.createdAt,
      })
      .from(propertyListFiles)
      .where(
        and(
          eq(propertyListFiles.propertyListId, propertyListId),
          eq(propertyListFiles.source, "seller_upload"),
        ),
      ),
  ])

  const conditionOffer: ConditionOffer | null = offersRaw[0]
    ? {
        noConditions: offersRaw[0].noConditions,
        isCashOffer: offersRaw[0].isCashOffer,
        coolingOffDays: offersRaw[0].coolingOffDays,
        financeDays: offersRaw[0].financeDays,
        buildingPestDays: offersRaw[0].buildingPestDays,
        dueDiligenceDays: offersRaw[0].dueDiligenceDays,
        subjectToSaleDays: offersRaw[0].subjectToSaleDays,
        saleOfPropertyDays: offersRaw[0].saleOfPropertyDays,
        unconditionalContractDays: offersRaw[0].unconditionalContractDays,
        customConditions: offersRaw[0].customConditions ?? null,
        settlementDate: offersRaw[0].settlementDate ?? null,
      }
    : null

  const sellerOffers: SellerOffer[] = offersRaw.map((o) => ({
    buyerOfferId: o.buyerOfferId,
    offer: o.offer,
    isAccepted: o.isAccepted,
    dateOffered: o.dateOffered,
    isCashOffer: o.isCashOffer,
    noConditions: o.noConditions,
    entityName: o.entityName,
  }))

  const documents: PortalDocumentItem[] = [
    ...listFilesRaw.map((f) => ({
      fileId: f.fileId,
      kind: "property" as const,
      fileName: f.fileName,
      fileType: f.fileType,
      fileSize: f.fileSize,
      createdAt: f.createdAt,
      googleDriveFileId: null,
      signatureStatus: null,
      signedAt: null,
    })),
    ...entityFilesRaw.map((f) => ({
      fileId: f.fileId,
      kind: "entity" as const,
      fileName: f.fileName,
      fileType: f.fileType,
      fileSize: f.fileSize,
      createdAt: f.createdAt,
      googleDriveFileId: null,
      signatureStatus: null,
      signedAt: null,
    })),
  ].sort((a, b) => {
    if (!a.createdAt) return 1
    if (!b.createdAt) return -1
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  const address = [row.streetAddress, row.suburb, row.state, row.postcode]
    .filter(Boolean)
    .join(", ")

  const formattedSalePrice = formatSalePrice(offersRaw.find((o) => o.isAccepted)?.offer ?? null)

  return (
    <main data-testid="portal-seller-shell" className="min-h-screen bg-[#F4F6F4] py-8 sm:py-14">
      <div className="mx-auto max-w-2xl space-y-4 px-4">
        <div data-testid="portal-seller-property-header" className="flex items-start justify-between gap-4 rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{address || "Property"}</h1>
            {formattedSalePrice && (
              <p data-testid="portal-seller-sale-price" className="mt-2 text-base font-semibold text-gray-800">
                Sale Price: {formattedSalePrice}
              </p>
            )}
          </div>
          <AddToHomeButton />
        </div>

        <SellerTabsClient
          token={token}
          contractDate={row.contractDate ?? null}
          settlementDate={row.settlementDate ?? null}
          conditionOffer={conditionOffer}
          offers={sellerOffers}
          documents={documents}
          sellerUploads={sellerUploadsRaw.map((f) => ({
            propertyListFileId: f.propertyListFileId,
            fileName: f.fileName,
            fileType: f.fileType,
            fileSize: f.fileSize,
            createdAt: f.createdAt?.toISOString() ?? null,
          }))}
        />
      </div>
    </main>
  )
}
