"use client"

import { useSyncExternalStore } from "react"

/**
 * Standalone version counter for “related inline drafts merged into `adminEntityCrudExtrasForSaveRef`”.
 * Previously held in CRUD dialog React state (`relatedDraftGeneration`), which re-rendered the whole
 * form + Radix Dialog on every keystroke and stole focus. Subscribers use
 * {@link useAdminRelatedInlineDraftSyncVersion} so only those components re-render.
 */
let relatedInlineDraftSyncVersion = 0

const listeners = new Set<() => void>()

export function subscribeAdminRelatedInlineDraftSync(
  onStoreChange: () => void,
): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

export function getAdminRelatedInlineDraftSyncVersion(): number {
  return relatedInlineDraftSyncVersion
}

function getServerSnapshotRelatedInlineDraftSync(): number {
  return 0
}

export function notifyAdminRelatedInlineDraftSync(): void {
  relatedInlineDraftSyncVersion += 1
  for (const l of listeners) l()
}

export function useAdminRelatedInlineDraftSyncVersion(): number {
  return useSyncExternalStore(
    subscribeAdminRelatedInlineDraftSync,
    getAdminRelatedInlineDraftSyncVersion,
    getServerSnapshotRelatedInlineDraftSync,
  )
}

// ── Panda properties: Latest Buyer Offers (separate from per-keystroke draft sync) ─────────────

let propertyBuyerOffersRefetchVersion = 0
const propertyBuyerOffersRefetchListeners = new Set<() => void>()

export function subscribeAdminPropertyBuyerOffersRefetch(
  onStoreChange: () => void,
): () => void {
  propertyBuyerOffersRefetchListeners.add(onStoreChange)
  return () => {
    propertyBuyerOffersRefetchListeners.delete(onStoreChange)
  }
}

export function getAdminPropertyBuyerOffersRefetchVersion(): number {
  return propertyBuyerOffersRefetchVersion
}

function getServerSnapshotPropertyBuyerOffersRefetch(): number {
  return 0
}

/** Bumped after nested admin PATCH handling for an open **properties** edit (save / parent refresh). */
export function notifyAdminPropertyBuyerOffersRefetch(): void {
  propertyBuyerOffersRefetchVersion += 1
  for (const l of propertyBuyerOffersRefetchListeners) l()
}

export function useAdminPropertyBuyerOffersRefetchGeneration(): number {
  return useSyncExternalStore(
    subscribeAdminPropertyBuyerOffersRefetch,
    getAdminPropertyBuyerOffersRefetchVersion,
    getServerSnapshotPropertyBuyerOffersRefetch,
  )
}

// ── Forced embed refresh: re-hydrate inline embed columns after CREATE-mode nested PATCH ─────────

let forcedEmbedRefreshVersion = 0
const forcedEmbedRefreshListeners = new Set<() => void>()

export function subscribeAdminRelatedInlineForcedEmbedRefresh(
  onStoreChange: () => void,
): () => void {
  forcedEmbedRefreshListeners.add(onStoreChange)
  return () => {
    forcedEmbedRefreshListeners.delete(onStoreChange)
  }
}

export function getAdminRelatedInlineForcedEmbedRefreshVersion(): number {
  return forcedEmbedRefreshVersion
}

function getServerSnapshotForcedEmbedRefresh(): number {
  return 0
}

/** Bumped after a CREATE-mode nested PATCH so inline embed columns re-fetch their related rows. */
export function notifyAdminRelatedInlineForcedEmbedRefresh(): void {
  forcedEmbedRefreshVersion += 1
  for (const l of forcedEmbedRefreshListeners) l()
}

export function useAdminRelatedInlineForcedEmbedRefreshVersion(): number {
  return useSyncExternalStore(
    subscribeAdminRelatedInlineForcedEmbedRefresh,
    getAdminRelatedInlineForcedEmbedRefreshVersion,
    getServerSnapshotForcedEmbedRefresh,
  )
}
