import type { Dispatch, SetStateAction } from "react"

export async function withLoadingId(
  id: number,
  setIds: Dispatch<SetStateAction<Set<number>>>,
  action: () => Promise<void>,
) {
  setIds((prev) => new Set(prev).add(id))
  try {
    await action()
  } finally {
    setIds((prev) => { const next = new Set(prev); next.delete(id); return next })
  }
}
