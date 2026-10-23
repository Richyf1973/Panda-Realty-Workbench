import { vi } from "vitest"

import type { SubmitData } from "./offer-form-upsert"

export function makeSelectChain(rows: unknown[]) {
  const p = Promise.resolve(rows)
  const chain: Record<string, unknown> = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => p,
    then: p.then.bind(p),
    catch: p.catch.bind(p),
  }
  return chain
}

export function makeUpdateChain() {
  return { set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })) }
}

export type MockTx = {
  select: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
}

export function makeTx(selectResults: unknown[][]): MockTx {
  let idx = 0
  return {
    select: vi.fn(() => makeSelectChain(selectResults[idx++] ?? [])),
    update: vi.fn(() => makeUpdateChain()),
    insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })),
  }
}

export const baseData: SubmitData = {
  buyers: [{ name: "Alice Smith" }],
  buyer1Name: "Alice Smith",
  offerAmount: "500000",
}
