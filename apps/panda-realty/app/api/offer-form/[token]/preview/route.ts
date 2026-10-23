import "server-only"

import { desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/db"
import { buyerOffers, offerFormSubmissions, offerFormTokens } from "@/db/schema"
import { generateAndUploadOfferFormPdf } from "@/lib/offer-form-pdf-on-submit"
import type { SubmitData } from "@/app/api/offer-form/[token]/offer-form-upsert"

type RouteContext = { params: Promise<{ token: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params

  try {
    const [tokenRow] = await db
      .select()
      .from(offerFormTokens)
      .where(eq(offerFormTokens.token, token))
      .limit(1)

    if (!tokenRow) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    const [latestSubmission, latestOffer] = await Promise.all([
      db.select().from(offerFormSubmissions)
        .where(eq(offerFormSubmissions.offerFormTokenId, tokenRow.offerFormTokenId))
        .orderBy(desc(offerFormSubmissions.createdAt))
        .limit(1)
        .then((r) => r[0]),
      db.select().from(buyerOffers)
        .where(eq(buyerOffers.propertyEntityId, tokenRow.propertyEntityId))
        .orderBy(desc(buyerOffers.createdAt))
        .limit(1)
        .then((r) => r[0]),
    ])

    const buyers = (latestSubmission?.buyersJson as SubmitData["buyers"] | undefined) ?? [{ name: "", phone: "", email: "", address: "" }]

    const data: SubmitData = {
      buyers,
      buyer1Name: buyers[0]?.name ?? "",
      buyer2Name: buyers[1]?.name || undefined,
      offerAmount: latestSubmission?.offerAmount ?? latestOffer?.offer ?? "0",
      totalDeposit: latestSubmission?.totalDeposit ?? undefined,
      initialPayment: latestSubmission?.initialPayment ?? (latestOffer?.depositInitial ?? undefined),
      secondPayment: latestSubmission?.secondPayment ?? (latestOffer?.depositBalance ?? undefined),
      cashBuyer: latestSubmission?.isCashBuyer === true ? "Yes" : "No",
      settlementPeriod: latestOffer?.settlementPeriod ?? latestSubmission?.settlementPeriod ?? undefined,
      settlementDate: latestOffer?.settlementDate ?? undefined,
      subjectToFinance: latestOffer?.isSubjectToFinance ?? latestSubmission?.isSubjectToFinance ?? undefined,
      financeApprovalDays: latestOffer?.financeDays != null ? String(latestOffer.financeDays) : undefined,
      financeBank: latestOffer?.financeBank ?? latestSubmission?.financeBank ?? undefined,
      subjectToSale: latestOffer?.isSubjectToSale ?? latestSubmission?.isSubjectToSale ?? undefined,
      salePropertyAddress: latestOffer?.subjectToSaleAddress ?? undefined,
      solicitorName: latestSubmission?.solicitorName ?? undefined,
      solicitorPhone: latestSubmission?.solicitorPhone ?? undefined,
      solicitorAddress: latestSubmission?.solicitorAddress ?? undefined,
      solicitorEmail: latestSubmission?.solicitorEmail ?? undefined,
      extraComments: latestOffer?.conditionNotes ?? undefined,
      signatures: (latestSubmission?.signaturesJson as SubmitData["signatures"]) ?? undefined,
    }

    const pdfLink = await generateAndUploadOfferFormPdf(tokenRow.propertyListId, data)

    if (!pdfLink) {
      return NextResponse.json({ error: "Could not generate PDF" }, { status: 500 })
    }

    return NextResponse.redirect(pdfLink, { status: 302 })
  } catch (cause) {
    console.error(`[GET /api/offer-form/${token}/preview]`, cause)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
