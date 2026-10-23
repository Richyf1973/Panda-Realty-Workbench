import { notFound } from "next/navigation"
import { and, desc, eq, inArray } from "drizzle-orm"

import { db } from "@/db"
import {
  buyerOffers,
  pandaProperties,
  portalFileSignRequests,
  portalTokens,
  propertyEntities,
  propertyEntityFiles,
  propertyListFiles,
} from "@/db/schema"

import { PortalConditionTimeline } from "./_components/condition-timeline"
import { PortalDocuments } from "./_components/documents"
import type { PortalDocumentItem } from "./_components/documents"
import { PortalMessages } from "./_components/messages"
import { PortalClientUploads } from "./_components/portal-client-uploads"
import { PortalPropertySummary } from "./_components/property-summary"

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

export default async function PortalPage({ params }: Props) {
  const { token } = await params

  const [row] = await db
    .select({
      portalTokenId: portalTokens.portalTokenId,
      revokedAt: portalTokens.revokedAt,
      propertyEntityId: portalTokens.propertyEntityId,
      propertyListId: portalTokens.propertyListId,
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

  if (!row || !row.propertyListId) notFound()

  if (row.revokedAt) {
    return (
      <main className="min-h-screen bg-[#F4F6F4] py-8 sm:py-14">
        <div className="mx-auto max-w-2xl px-4">
          <div data-testid="portal-revoked" className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-base text-gray-500">This link is no longer active.</p>
          </div>
        </div>
      </main>
    )
  }

  const [offer, listFilesRaw, entityFilesRaw, buyerUploadsRaw] = await Promise.all([
    row.propertyEntityId != null
      ? db
          .select({
            offer: buyerOffers.offer,
            noConditions: buyerOffers.noConditions,
            isCashOffer: buyerOffers.isCashOffer,
            coolingOffDays: buyerOffers.coolingOffDays,
            financeDays: buyerOffers.financeDays,
            buildingPestDays: buyerOffers.buildingPestDays,
            dueDiligenceDays: buyerOffers.dueDiligenceDays,
            subjectToSaleDays: buyerOffers.subjectToSaleDays,
            saleOfPropertyDays: buyerOffers.saleOfPropertyDays,
            unconditionalContractDays: buyerOffers.unconditionalContractDays,
            customConditions: buyerOffers.customConditions,
            settlementDate: buyerOffers.settlementDate,
          })
          .from(buyerOffers)
          .where(and(eq(buyerOffers.propertyEntityId, row.propertyEntityId), eq(buyerOffers.isAccepted, true)))
          .orderBy(desc(buyerOffers.createdAt))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),

    db
      .select({
        fileId: propertyListFiles.propertyListFileId,
        fileName: propertyListFiles.fileName,
        fileType: propertyListFiles.fileType,
        fileSize: propertyListFiles.fileSize,
        createdAt: propertyListFiles.createdAt,
        googleDriveFileId: propertyListFiles.googleDriveFileId,
      })
      .from(propertyListFiles)
      .where(
        and(
          eq(propertyListFiles.propertyListId, row.propertyListId),
          eq(propertyListFiles.sharedWithPortal, true),
        ),
      ),

    db
      .select({
        fileId: propertyEntityFiles.propertyEntityFileId,
        fileName: propertyEntityFiles.fileName,
        fileType: propertyEntityFiles.fileType,
        fileSize: propertyEntityFiles.fileSize,
        createdAt: propertyEntityFiles.createdAt,
        googleDriveFileId: propertyEntityFiles.googleDriveFileId,
      })
      .from(propertyEntityFiles)
      .innerJoin(
        propertyEntities,
        eq(propertyEntityFiles.propertyEntityId, propertyEntities.propertyEntityId),
      )
      .where(
        and(
          eq(propertyEntities.propertyListId, row.propertyListId),
          eq(propertyEntityFiles.sharedWithPortal, true),
        ),
      ),

    row.propertyEntityId != null
      ? db
          .select({
            propertyEntityFileId: propertyEntityFiles.propertyEntityFileId,
            fileName: propertyEntityFiles.fileName,
            fileType: propertyEntityFiles.fileType,
            fileSize: propertyEntityFiles.fileSize,
            createdAt: propertyEntityFiles.createdAt,
          })
          .from(propertyEntityFiles)
          .where(
            and(
              eq(propertyEntityFiles.propertyEntityId, row.propertyEntityId),
              eq(propertyEntityFiles.source, "buyer_upload"),
            ),
          )
      : Promise.resolve([]),
  ])

  const driveFileIds = [
    ...listFilesRaw.map((f) => f.googleDriveFileId),
    ...entityFilesRaw.map((f) => f.googleDriveFileId),
  ].filter((id): id is string => id != null)

  const signRows = driveFileIds.length > 0
    ? await db
        .select({
          fileId: portalFileSignRequests.fileId,
          signatureStatus: portalFileSignRequests.signatureStatus,
          signedAt: portalFileSignRequests.signedAt,
        })
        .from(portalFileSignRequests)
        .where(
          and(
            eq(portalFileSignRequests.portalTokenId, row.portalTokenId),
            inArray(portalFileSignRequests.fileId, driveFileIds),
          ),
        )
        .orderBy(desc(portalFileSignRequests.id))
    : []

  const latestSignByDriveId = new Map<string, { signatureStatus: string; signedAt: Date | null }>()
  for (const sr of signRows) {
    if (!latestSignByDriveId.has(sr.fileId)) {
      latestSignByDriveId.set(sr.fileId, { signatureStatus: sr.signatureStatus, signedAt: sr.signedAt })
    }
  }

  const documents: PortalDocumentItem[] = [
    ...listFilesRaw.map((f) => {
      const sign = f.googleDriveFileId ? latestSignByDriveId.get(f.googleDriveFileId) : undefined
      return {
        fileId: f.fileId,
        kind: "property" as const,
        fileName: f.fileName,
        fileType: f.fileType,
        fileSize: f.fileSize,
        createdAt: f.createdAt,
        googleDriveFileId: f.googleDriveFileId ?? null,
        signatureStatus: sign?.signatureStatus ?? null,
        signedAt: sign?.signedAt?.toISOString() ?? null,
      }
    }),
    ...entityFilesRaw.map((f) => {
      const sign = f.googleDriveFileId ? latestSignByDriveId.get(f.googleDriveFileId) : undefined
      return {
        fileId: f.fileId,
        kind: "entity" as const,
        fileName: f.fileName,
        fileType: f.fileType,
        fileSize: f.fileSize,
        createdAt: f.createdAt,
        googleDriveFileId: f.googleDriveFileId ?? null,
        signatureStatus: sign?.signatureStatus ?? null,
        signedAt: sign?.signedAt?.toISOString() ?? null,
      }
    }),
  ].sort((a, b) => {
    if (!a.createdAt) return 1
    if (!b.createdAt) return -1
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  return (
    <main data-testid="portal-shell" className="min-h-screen bg-[#F4F6F4] py-8 sm:py-14">
      <div className="mx-auto max-w-2xl space-y-4 px-4">
        <PortalPropertySummary
          streetAddress={row.streetAddress ?? ""}
          suburb={row.suburb ?? ""}
          state={row.state ?? ""}
          postcode={row.postcode ?? ""}
          salePrice={formatSalePrice(offer?.offer ?? null)}
          contractDate={row.contractDate ?? null}
          settlementDate={row.settlementDate ?? null}
        />
        <PortalConditionTimeline
          offer={offer ?? null}
          contractDate={row.contractDate ?? null}
        />
        <PortalDocuments token={token} documents={documents} />
        <PortalClientUploads
          token={token}
          initialFiles={buyerUploadsRaw.map((f) => ({
            propertyEntityFileId: f.propertyEntityFileId,
            fileName: f.fileName,
            fileType: f.fileType,
            fileSize: f.fileSize,
            createdAt: f.createdAt?.toISOString() ?? null,
          }))}
        />
        <PortalMessages token={token} />
      </div>
    </main>
  )
}
