export async function patchBuyerOfferAccepted(
  buyerOfferId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`/api/admin/buyer-offers/${buyerOfferId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isAccepted: true }),
  })
  if (res.ok) return { ok: true }
  const json = (await res.json().catch(() => ({}))) as { error?: string }
  return { ok: false, error: json.error ?? "Failed to accept offer" }
}
