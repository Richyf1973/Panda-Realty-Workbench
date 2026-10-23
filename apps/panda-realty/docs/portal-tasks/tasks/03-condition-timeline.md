# 03 — Condition Timeline Section

Context: Display a chronological timeline of condition deadlines (cooling off, finance, building & pest, due diligence, settlement) computed from the accepted buyer offer's day-count fields and the property's contractDate. The calculation logic already exists in `compute-condition-events.ts`.

Parent: [task-list.md](../task-list.md)

---

## Decisions

- **Data source:** `buyerOffers` (condition day counts) joined with `pandaProperties.contractDate`. No new column needed — contractDate already exists on the property.
- **Which offer to show:** `isAccepted = true` first; fall back to most recent by `createdAt` if none is accepted yet.
- **Condition status:** V1 shows deadlines only (past = ✅, upcoming = ⏳ with days remaining). No met/waived/failed status — this data doesn't exist in the app yet.
- **No offer found:** show a "Conditions will appear once an offer is recorded" empty state.
- **Null contractDate:** show "Condition dates will be confirmed once a contract date is set."

---

## Tasks

- [x] Extend portal token GET handler to query `buyerOffers` for the property-entity pair, selecting `isAccepted`, `createdAt`, `coolingOffDays`, `financeDays`, `buildingPestDays`, `dueDiligenceDays`, `subjectToSaleDays`, `customConditions`, `noConditions`, `settlementDate`
- [x] Apply offer selection logic: `isAccepted = true` first, fall back to `ORDER BY createdAt DESC LIMIT 1`
- [x] Pass `pandaProperties.contractDate` (already joined for property summary) + offer day counts into `compute-condition-events.ts`
- [x] Build `PortalConditionTimeline` component in `apps/panda-realty/app/portal/[token]/_components/condition-timeline.tsx`
- [x] Render past conditions with ✅ and upcoming with ⏳ + days remaining label
- [x] Handle empty states: no offer found, contractDate null
- [x] Run `npm run typecheck -w panda-realty` — exits 0
