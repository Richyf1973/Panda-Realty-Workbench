"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"

import { PortalConditionTimeline } from "@/app/portal/[token]/_components/condition-timeline"
import { PortalDocuments } from "@/app/portal/[token]/_components/documents"
import type { PortalDocumentItem } from "@/app/portal/[token]/_components/documents"
import { PortalMessages } from "@/app/portal/[token]/_components/messages"

import { SellerOffers } from "./seller-offers"
import type { SellerOffer } from "./seller-offers"
import { SellerSummaryTab } from "./seller-summary-tab"
import { SellerUploadsTab } from "./seller-uploads-tab"
import type { SellerUploadedFile } from "./seller-uploads-tab"

const VALID_TABS = ["summary", "conditions", "documents", "offers", "messages", "uploads"] as const
type Tab = (typeof VALID_TABS)[number]

const TAB_LABELS: Record<Tab, string> = {
  summary: "Summary",
  conditions: "Conditions",
  documents: "Documents",
  offers: "Offers",
  messages: "Messages",
  uploads: "Uploads",
}

export type ConditionOffer = {
  noConditions: boolean
  isCashOffer: boolean
  coolingOffDays: number | null
  financeDays: number | null
  buildingPestDays: number | null
  dueDiligenceDays: number | null
  subjectToSaleDays: number | null
  saleOfPropertyDays: number | null
  unconditionalContractDays: number | null
  customConditions: Array<{ label: string; days: number }> | null
  settlementDate: string | null
}

type Props = {
  token: string
  contractDate: Date | null
  settlementDate: Date | null
  conditionOffer: ConditionOffer | null
  offers: SellerOffer[]
  documents: PortalDocumentItem[]
  sellerUploads: SellerUploadedFile[]
}

export function SellerTabsClient({
  token,
  contractDate,
  settlementDate,
  conditionOffer,
  offers,
  documents,
  sellerUploads,
}: Props) {
  const searchParams = useSearchParams()
  const raw = searchParams.get("tab")
  const initial: Tab = VALID_TABS.includes(raw as Tab) ? (raw as Tab) : "summary"
  const [activeTab, setActiveTab] = useState<Tab>(initial)

  function handleTabClick(tab: Tab) {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", tab)
    window.history.replaceState({}, "", url.pathname + url.search)
  }

  return (
    <>
      <div className="rounded-xl bg-white shadow-sm">
        <nav data-testid="portal-seller-tab-nav" className="flex border-b border-gray-200">
          {VALID_TABS.map((tab) => (
            <button
              key={tab}
              data-testid={`portal-seller-tab--${tab}`}
              type="button"
              onClick={() => handleTabClick(tab)}
              className={`px-4 py-3 text-sm font-medium first:rounded-tl-xl last:rounded-tr-xl ${
                activeTab === tab
                  ? "border-b-2 border-green-600 text-green-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "summary" && (
        <SellerSummaryTab contractDate={contractDate} settlementDate={settlementDate} />
      )}
      {activeTab === "conditions" && (
        <PortalConditionTimeline offer={conditionOffer} contractDate={contractDate} />
      )}
      {activeTab === "documents" && (
        <PortalDocuments
          token={token}
          documents={documents}
          proxyBase={`/api/portal/seller/${token}/files`}
        />
      )}
      {activeTab === "offers" && <SellerOffers offers={offers} />}
      {activeTab === "messages" && <PortalMessages token={token} />}
      {activeTab === "uploads" && <SellerUploadsTab token={token} initialFiles={sellerUploads} />}
    </>
  )
}
