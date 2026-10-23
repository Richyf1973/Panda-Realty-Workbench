# 02 — Property Summary Section

Context: The top section of the portal shows the client a summary of their property deal — address, key attributes, and critical dates. All data already exists in `pandaProperties` and is reachable via the token → propertyEntityId → propertyListId chain.

Parent: [task-list.md](../task-list.md)

---

## Decisions

- **Show:** street address, suburb, state, postcode, sale contract price, contract date, settlement date
- **Hide:** bed/bath/car property description line (removed 2026-05-28 — not surfaced in any portal)
- **Sale price source:** `buyerOffers.offer` where `isAccepted = true` (NOT `pandaProperties.salePrice`)
- **Buyer portal — no accepted offer:** show "Sale price not yet confirmed" fallback (grey text)
- **Seller portal — no accepted offer:** price element absent from header card
- **Empty state:** if contractDate or settlementDate is null, show "Date to be confirmed" rather than a blank

---

## Tasks

- [x] Extend portal token GET handler to join `pandaProperties` fields: `streetAddress`, `suburb`, `state`, `postcode`, `propertyType`, `bed`, `bath`, `car`, `contractDate`, `settlementDate`
- [x] Build `PortalPropertySummary` component in `apps/panda-realty/app/portal/[token]/_components/property-summary.tsx`
- [x] Handle null `contractDate` and `settlementDate` with "Date to be confirmed" display
- [x] Run `npm run typecheck -w panda-realty` — exits 0
