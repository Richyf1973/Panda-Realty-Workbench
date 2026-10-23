"use client"

import { useEffect, useState } from "react"

import { PortalMessageThread, type ThreadInfo } from "./portal-message-thread"

type TabId = "buyer" | "seller"
type TokenBody = { portalTokenId: number; revokedAt: string | null }
type MsgPayload = { messages: Array<{ senderRole: string; readAt: string | null }> }

export function PropertyEntityPortalMessagePanel({
  propertyEntityId,
}: {
  propertyEntityId: number
}) {
  const [activeTab, setActiveTab] = useState<TabId>("buyer")
  const [buyerThread, setBuyerThread] = useState<ThreadInfo>("loading")
  const [sellerThread, setSellerThread] = useState<ThreadInfo>("loading")
  const [buyerUnread, setBuyerUnread] = useState(false)
  const [sellerUnread, setSellerUnread] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [buyerRes, sellerRes] = await Promise.allSettled([
        fetch(`/api/admin/portal-tokens?propertyEntityId=${propertyEntityId}`),
        fetch(`/api/admin/portal-tokens/seller?propertyEntityId=${propertyEntityId}`),
      ])

      if (cancelled) return

      // Parse both token bodies before any state update so a cancelled unmount is caught cleanly
      let buyerTokenBody: TokenBody | null = null
      let sellerTokenBody: TokenBody | null = null
      if (buyerRes.status === "fulfilled" && buyerRes.value.ok) {
        buyerTokenBody = await buyerRes.value.json() as TokenBody | null
      }
      if (sellerRes.status === "fulfilled" && sellerRes.value.ok) {
        sellerTokenBody = await sellerRes.value.json() as TokenBody | null
      }

      if (cancelled) return

      setBuyerThread(buyerTokenBody ?? null)
      setSellerThread(sellerTokenBody ?? null)

      const buyerTokenId = buyerTokenBody && !buyerTokenBody.revokedAt ? buyerTokenBody.portalTokenId : null
      const sellerTokenId = sellerTokenBody && !sellerTokenBody.revokedAt ? sellerTokenBody.portalTokenId : null

      // Pre-fetch unread state so tab dots appear before user switches to that tab
      const [buyerMsgRes, sellerMsgRes] = await Promise.allSettled([
        buyerTokenId ? fetch(`/api/admin/portal-messages/${buyerTokenId}`) : Promise.resolve(null),
        sellerTokenId ? fetch(`/api/admin/portal-messages/${sellerTokenId}`) : Promise.resolve(null),
      ])

      if (cancelled) return

      const buyerMsgBody = buyerMsgRes.status === "fulfilled" && buyerMsgRes.value?.ok
        ? await buyerMsgRes.value.json() as MsgPayload
        : null
      const sellerMsgBody = sellerMsgRes.status === "fulfilled" && sellerMsgRes.value?.ok
        ? await sellerMsgRes.value.json() as MsgPayload
        : null

      if (cancelled) return

      if (buyerMsgBody) setBuyerUnread(buyerMsgBody.messages.some((m) => m.senderRole === "client" && !m.readAt))
      if (sellerMsgBody) setSellerUnread(sellerMsgBody.messages.some((m) => m.senderRole === "client" && !m.readAt))
    }

    void load()
    return () => { cancelled = true }
  }, [propertyEntityId])

  return (
    <div data-testid="portal-message-panel" className="flex flex-col gap-4 p-1">
      <div className="flex gap-1 border-b">
        <TabButton
          id="buyer"
          label="Buyer"
          active={activeTab === "buyer"}
          hasUnread={buyerUnread}
          onClick={() => setActiveTab("buyer")}
        />
        <TabButton
          id="seller"
          label="Seller"
          active={activeTab === "seller"}
          hasUnread={sellerUnread}
          onClick={() => setActiveTab("seller")}
        />
      </div>

      {activeTab === "buyer" && (
        <PortalMessageThread
          threadInfo={buyerThread}
          onUnreadChange={setBuyerUnread}
        />
      )}
      {activeTab === "seller" && (
        <PortalMessageThread
          threadInfo={sellerThread}
          onUnreadChange={setSellerUnread}
          noTokenMessage="No seller portal link yet — generate one from the property's Seller tab."
        />
      )}
    </div>
  )
}

function TabButton({
  id,
  label,
  active,
  hasUnread,
  onClick,
}: {
  id: TabId
  label: string
  active: boolean
  hasUnread: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-testid={`portal-message-tab-${id}`}
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-b-2 border-primary text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {hasUnread && (
        <span
          data-testid={`portal-message-tab-${id}-dot`}
          className="h-2 w-2 rounded-full bg-blue-500"
          aria-label="Unread messages"
        />
      )}
    </button>
  )
}
