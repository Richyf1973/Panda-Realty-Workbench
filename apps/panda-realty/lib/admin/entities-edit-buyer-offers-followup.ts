/**
 * Bridge for {@link PandaEntitiesPropertyConnections}: the Offers grid uses an isolated
 * `adminEntityCrudExtrasForSaveRef` so `buyerOffers` are not merged into `PATCH /api/admin/entities`.
 * After a successful entities PATCH, the admin registry invokes the registered callback so we can
 * persist offers via `PATCH /api/admin/property-entities/:id`.
 */

let registered: null | (() => Promise<void>) = null

export function registerEntitiesEditBuyerOffersFollowup(
  fn: null | (() => Promise<void>),
): void {
  registered = fn
}

export async function runEntitiesEditBuyerOffersFollowup(): Promise<void> {
  if (registered != null) await registered()
}
