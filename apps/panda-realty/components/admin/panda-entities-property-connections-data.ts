/**
 * Property connection list/detail fetch helpers for Edit Buyer → Property Connections.
 */

import { readApiErrorMessage } from "@repo/admin/read-api-error"

export type FavoriteProperty = {
  propertyListId: number
  streetAddress?: string
  state?: string
  postcode?: string
}

function formatPropertyAddress(
  parts: { streetAddress?: string; state?: string; postcode?: string },
  fallback: string,
): string {
  if (parts.streetAddress) {
    return [parts.streetAddress, parts.state, parts.postcode].filter(Boolean).join(", ")
  }
  return fallback
}

export function favoriteLabel(p: FavoriteProperty): string {
  return formatPropertyAddress(p, `Property #${p.propertyListId}`)
}

export type FetchFavoritePropertiesResult =
  | { ok: true; items: FavoriteProperty[] }
  | { ok: false; errorMessage: string }

export async function fetchFavoriteProperties(): Promise<FetchFavoritePropertiesResult> {
  const res = await fetch(
    "/api/admin/properties?isFavorite=true&limit=200",
    { cache: "no-store" },
  )
  if (!res.ok) return { ok: false, errorMessage: await readApiErrorMessage(res) }
  const data = (await res.json()) as { items?: unknown[] }
  const items = (data.items ?? [])
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      propertyListId: Number(item["propertyListId"]),
      streetAddress: typeof item["streetAddress"] === "string" ? item["streetAddress"] : undefined,
      state: typeof item["state"] === "string" ? item["state"] : undefined,
      postcode: typeof item["postcode"] === "string" ? item["postcode"] : undefined,
    }))
    .filter((p) => p.propertyListId > 0)
  return { ok: true, items }
}

export type ConnectionSummary = {
  propertyEntityId: number
  entityId: number
  propertyListId?: number | null
  propertyEntityNote: string | null
  buyerPipelineStatusId: number | null
  isOriginalOwner: boolean
  buyerPipelineStatus?: { propertyStatus: string } | null
  propertyRef?: { streetAddress?: string; state?: string; postcode?: string } | null
}

type PropertyRow = { streetAddress?: string; state?: string; postcode?: string }

export function connectionLabel(c: ConnectionSummary): string {
  return formatPropertyAddress(c.propertyRef ?? {}, `Connection #${c.propertyEntityId}`)
}

async function fetchPropertyAddress(propertyListId: number): Promise<PropertyRow | null> {
  const res = await fetch(`/api/admin/properties/${propertyListId}?fields=streetAddress,state,postcode`, {
    cache: "no-store",
  })
  if (!res.ok) return null
  return res.json() as Promise<PropertyRow>
}

export async function fetchConnectionDetail(
  id: number,
): Promise<ConnectionSummary | null> {
  const res = await fetch(`/api/admin/property-entities/${id}`, { cache: "no-store" })
  if (!res.ok) return null
  const row = (await res.json()) as ConnectionSummary & { propertyListId?: number | null }
  if (row.propertyListId) {
    const prop = await fetchPropertyAddress(row.propertyListId)
    if (prop) {
      return {
        ...row,
        propertyRef: {
          streetAddress: prop.streetAddress,
          state: prop.state,
          postcode: prop.postcode,
        },
      }
    }
  }
  return row
}

export type FetchConnectionsResult =
  | { ok: true; items: ConnectionSummary[] }
  | { ok: false; errorMessage: string }

export function pickPrimary(items: ConnectionSummary[]): ConnectionSummary | null {
  if (items.length === 0) return null
  return items.reduce((best, c) => (c.propertyEntityId > best.propertyEntityId ? c : best))
}

export async function fetchConnections(
  entityRowId: string,
): Promise<FetchConnectionsResult> {
  const res = await fetch(
    `/api/admin/property-entities?limit=200&entityId=${encodeURIComponent(entityRowId)}`,
    { cache: "no-store" },
  )
  if (!res.ok) {
    return { ok: false, errorMessage: await readApiErrorMessage(res) }
  }
  const data = (await res.json()) as { items?: unknown[] }
  const summaries = (data.items ?? []).filter(
    (item): item is ConnectionSummary => typeof item === "object" && item !== null,
  )
  const addresses = await Promise.all(
    summaries.map((s) =>
      s.propertyListId ? fetchPropertyAddress(s.propertyListId) : Promise.resolve(null),
    ),
  )
  const items = summaries.map((s, i) => {
    const addr = addresses[i]
    if (!addr) return s
    return { ...s, propertyRef: { streetAddress: addr.streetAddress, state: addr.state, postcode: addr.postcode } }
  })
  return { ok: true, items }
}
