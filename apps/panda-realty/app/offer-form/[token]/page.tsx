import { OfferFormClient } from "@/components/offer-form/offer-form-client"

interface PageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<{ offerId?: string; view?: string }>
}

export default async function OfferFormPage({ params, searchParams }: PageProps) {
  const [{ token }, sp] = await Promise.all([params, searchParams])
  const rawOfferId = sp.offerId ? parseInt(sp.offerId, 10) : undefined
  const offerId = rawOfferId != null && !isNaN(rawOfferId) ? rawOfferId : undefined
  const viewMode = sp.view === "1"
  return (
    <main className="min-h-screen bg-[#F4F6F4] py-8 sm:py-14">
      <OfferFormClient token={token} offerId={offerId} viewMode={viewMode} />
    </main>
  )
}
